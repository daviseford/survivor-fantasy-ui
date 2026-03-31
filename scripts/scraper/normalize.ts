import { overrides } from "./overrides.js";
import type {
  MatchReport,
  MatchResult,
  PlayerMetaEntry,
  ScrapedContestant,
} from "./types.js";

/**
 * Normalize a name for fuzzy matching:
 * - lowercase
 * - strip quotes and content in quotes (nicknames like "Coach")
 * - strip parenthetical content
 * - collapse whitespace
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/"[^"]*"/g, "") // strip "Coach" etc.
    .replace(/\([^)]*\)/g, "") // strip (nickname) etc.
    .replace(/[^a-z\s-]/g, "") // keep letters, spaces, hyphens
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Match scraped contestants to app player names.
 * Uses: 1) overrides, 2) exact match, 3) normalized match.
 * Unmatched names are reported -- never silently dropped.
 */
export function matchContestants(
  scraped: ScrapedContestant[],
  appNames: string[],
  seasonNum: number,
): MatchReport {
  const matched: MatchResult[] = [];
  const unmatched: ScrapedContestant[] = [];
  const matchedAppNames = new Set<string>();

  // Build lookup maps
  const seasonOverrides = overrides[seasonNum] ?? {};
  const normalizedAppMap = new Map<string, string>();
  for (const name of appNames) {
    normalizedAppMap.set(normalizeName(name), name);
  }

  for (const contestant of scraped) {
    let appName: string | undefined;

    // 1. Check overrides (scraped name -> app name)
    if (seasonOverrides[contestant.scrapedName]) {
      appName = seasonOverrides[contestant.scrapedName];
    }

    // 2. Exact match
    if (!appName && appNames.includes(contestant.scrapedName)) {
      appName = contestant.scrapedName;
    }

    // 3. Normalized match
    if (!appName) {
      const normalized = normalizeName(contestant.scrapedName);
      appName = normalizedAppMap.get(normalized);
    }

    if (appName && !matchedAppNames.has(appName)) {
      matchedAppNames.add(appName);
      const meta: PlayerMetaEntry = {
        sourceUrl: contestant.sourceUrl,
      };
      if (contestant.ageOnSeason !== undefined)
        meta.ageOnSeason = contestant.ageOnSeason;
      if (contestant.hometown) meta.hometown = contestant.hometown;
      if (contestant.profession) meta.profession = contestant.profession;
      if (contestant.bio) meta.bio = contestant.bio;
      if (contestant.previousSeasons?.length)
        meta.previousSeasons = contestant.previousSeasons;

      matched.push({
        appName,
        scrapedName: contestant.scrapedName,
        meta,
      });
    } else if (!appName) {
      unmatched.push(contestant);
    }
  }

  const unmatchedAppNames = appNames.filter((n) => !matchedAppNames.has(n));

  return { matched, unmatched, unmatchedAppNames };
}
