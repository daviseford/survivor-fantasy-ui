/**
 * Client for fetching survivor data from dual sources:
 *   1. survivoR (upstream R package) — primary, has S38-50
 *   2. survivoR2py — fallback, has S1-47
 *
 * For each table, survivoR is tried first. If no data is found for the
 * requested season, falls back to survivoR2py.
 */

import type {
  SurvivorAdvantageMovement,
  SurvivorCastaway,
  SurvivorChallengeResult,
  SurvivorEpisode,
  SurvivorTable,
  SurvivorTribeMapping,
  SurvivorVoteHistory,
} from "./survivoR2py-types.js";

/** survivoR upstream — JSON exports for all tables (S38-50) */
const SURVIVOR_BASE_URL =
  "https://raw.githubusercontent.com/doehm/survivoR/master/dev/json";

/** survivoR2py — processed JSON/CSV data (S1-47) */
const SURVIVOR2PY_BASE_URL =
  "https://raw.githubusercontent.com/stiles/survivoR2py/main/data/processed";

/** Fetch a table from survivoR (upstream) as JSON. Returns [] on failure. */
async function fetchFromSurvivoR<T>(table: SurvivorTable): Promise<T[]> {
  const url = `${SURVIVOR_BASE_URL}/${table}.json`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return (await res.json()) as T[];
}

/**
 * Fetch a table from survivoR2py as JSON or CSV.
 * Large tables (challenge_results, vote_history) use CSV with local parsing.
 */
async function fetchFromSurvivoR2py<T>(table: SurvivorTable): Promise<T[]> {
  const useCsv = table === "challenge_results" || table === "vote_history";
  const ext = useCsv ? "csv" : "json";
  const url = `${SURVIVOR2PY_BASE_URL}/${ext}/${table}.${ext}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch survivoR2py ${table}: ${res.status} ${res.statusText}`,
    );
  }

  if (useCsv) {
    const text = await res.text();
    return parseCsv<T>(text);
  }

  return (await res.json()) as T[];
}

/**
 * Fetch a table for a specific season, trying survivoR first.
 * Falls back to survivoR2py if survivoR returns no data for the season.
 */
async function fetchTableForSeason<
  T extends { version?: string; season?: number },
>(table: SurvivorTable, seasonNum: number): Promise<T[]> {
  // Try survivoR (upstream) first
  try {
    const data = await fetchFromSurvivoR<T>(table);
    const filtered = filterBySeason(data, seasonNum);
    if (filtered.length > 0) {
      console.log(`    ${table}: found in survivoR`);
      return filtered;
    }
  } catch {
    // survivoR fetch failed, fall through to survivoR2py
  }

  // Fall back to survivoR2py
  console.log(`    ${table}: falling back to survivoR2py`);
  const data = await fetchFromSurvivoR2py<T>(table);
  return filterBySeason(data, seasonNum);
}

/** Simple CSV parser — handles quoted fields and common edge cases. */
function parseCsv<T>(text: string): T[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseRow(lines[0]);
  const results: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i]);
    if (values.length !== headers.length) continue;

    const obj: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = coerceValue(values[j]);
    }
    results.push(obj as T);
  }

  return results;
}

/** Parse a single CSV row, handling quoted fields. */
function parseRow(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/** Coerce CSV string values to appropriate JS types. */
function coerceValue(val: string): unknown {
  if (val === "" || val === "NA" || val === "None") return null;
  if (val === "True" || val === "true" || val === "TRUE") return true;
  if (val === "False" || val === "false" || val === "FALSE") return false;
  const num = Number(val);
  if (!isNaN(num) && val !== "") return num;
  return val;
}

/** Filter records by US version and season number. */
function filterBySeason<T extends { version?: string; season?: number }>(
  data: T[],
  seasonNum: number,
): T[] {
  return data.filter(
    (d) => d.version === "US" && Math.round(d.season ?? 0) === seasonNum,
  );
}

const CASTAWAY_ID_PATTERN = /^US\d{4}$/;

/** Validate that castaways have required fields. */
function validateCastaways(data: SurvivorCastaway[]): void {
  for (const c of data) {
    if (!c.castaway_id || !CASTAWAY_ID_PATTERN.test(c.castaway_id)) {
      throw new Error(
        `Invalid castaway_id "${c.castaway_id}" for ${c.full_name}`,
      );
    }
    if (!c.full_name) {
      throw new Error(`Missing full_name for castaway_id ${c.castaway_id}`);
    }
  }
}

/** All data needed to build a season from survivoR2py. */
export interface SurvivorSeasonData {
  castaways: SurvivorCastaway[];
  episodes: SurvivorEpisode[];
  challengeResults: SurvivorChallengeResult[];
  voteHistory: SurvivorVoteHistory[];
  advantageMovement: SurvivorAdvantageMovement[];
  tribeMapping: SurvivorTribeMapping[];
}

/**
 * Fetch all survivor data needed for a given season.
 * Tries survivoR (upstream) first, falls back to survivoR2py per table.
 * Returns typed, filtered, and validated data.
 */
export async function fetchSeasonData(
  seasonNum: number,
): Promise<SurvivorSeasonData> {
  console.log(`  Fetching survivor data for Season ${seasonNum}...`);

  // Fetch each table with dual-source fallback, in parallel
  const [castaways, episodes, challengeResults, voteHistory, advantageMovement, tribeMapping] =
    await Promise.all([
      fetchTableForSeason<SurvivorCastaway>("castaways", seasonNum),
      fetchTableForSeason<SurvivorEpisode>("episodes", seasonNum),
      fetchTableForSeason<SurvivorChallengeResult>("challenge_results", seasonNum),
      fetchTableForSeason<SurvivorVoteHistory>("vote_history", seasonNum),
      fetchTableForSeason<SurvivorAdvantageMovement>("advantage_movement", seasonNum),
      fetchTableForSeason<SurvivorTribeMapping>("tribe_mapping", seasonNum),
    ]);

  if (castaways.length === 0) {
    console.log(
      `  Warning: No castaways found for Season ${seasonNum} — season may not exist in either data source`,
    );
  } else {
    validateCastaways(castaways);
  }

  console.log(
    `  Fetched: ${castaways.length} castaways, ${episodes.length} episodes, ${challengeResults.length} challenge results`,
  );

  return {
    castaways,
    episodes,
    challengeResults,
    voteHistory,
    advantageMovement,
    tribeMapping,
  };
}
