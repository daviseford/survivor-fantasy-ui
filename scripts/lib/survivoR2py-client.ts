/**
 * Client for fetching survivoR2py data from GitHub CDN.
 * Source: https://github.com/stiles/survivoR2py
 *
 * Fetches JSON tables, filters by season, and validates schemas.
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

const BASE_URL =
  "https://raw.githubusercontent.com/stiles/survivoR2py/main/data/processed";

/**
 * Fetch a survivoR2py table as JSON.
 * Large tables (challenge_results, vote_history) use CSV with local parsing.
 */
async function fetchTable<T>(table: SurvivorTable): Promise<T[]> {
  // Some tables are too large for JSON (>10MB). Use CSV for those.
  const useCsv = table === "challenge_results" || table === "vote_history";
  const ext = useCsv ? "csv" : "json";
  const url = `${BASE_URL}/${ext}/${table}.${ext}`;

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
      throw new Error(
        `Missing full_name for castaway_id ${c.castaway_id}`,
      );
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
 * Fetch all survivoR2py data needed for a given season.
 * Returns typed, filtered, and validated data.
 */
export async function fetchSeasonData(
  seasonNum: number,
): Promise<SurvivorSeasonData> {
  console.log(`  Fetching survivoR2py data for Season ${seasonNum}...`);

  // Fetch tables in parallel
  const [
    allCastaways,
    allEpisodes,
    allChallengeResults,
    allVoteHistory,
    allAdvantageMovement,
    allTribeMapping,
  ] = await Promise.all([
    fetchTable<SurvivorCastaway>("castaways"),
    fetchTable<SurvivorEpisode>("episodes"),
    fetchTable<SurvivorChallengeResult>("challenge_results"),
    fetchTable<SurvivorVoteHistory>("vote_history"),
    fetchTable<SurvivorAdvantageMovement>("advantage_movement"),
    fetchTable<SurvivorTribeMapping>("tribe_mapping"),
  ]);

  // Filter to the requested season
  const castaways = filterBySeason(allCastaways, seasonNum);
  const episodes = filterBySeason(allEpisodes, seasonNum);
  const challengeResults = filterBySeason(allChallengeResults, seasonNum);
  const voteHistory = filterBySeason(allVoteHistory, seasonNum);
  const advantageMovement = filterBySeason(allAdvantageMovement, seasonNum);
  const tribeMapping = filterBySeason(allTribeMapping, seasonNum);

  if (castaways.length === 0) {
    console.log(
      `  Warning: No castaways found for Season ${seasonNum} — season may not exist in survivoR2py`,
    );
  } else {
    validateCastaways(castaways);
  }

  console.log(`  Fetched: ${castaways.length} castaways, ${episodes.length} episodes, ${challengeResults.length} challenge results`);

  return {
    castaways,
    episodes,
    challengeResults,
    voteHistory,
    advantageMovement,
    tribeMapping,
  };
}
