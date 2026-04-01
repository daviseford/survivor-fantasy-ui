/**
 * Client for fetching survivoR data from GitHub CDN.
 * Source: https://github.com/doehm/survivoR (dev/json/)
 *
 * Fetches JSON tables, filters by season, and validates schemas.
 */

import type {
  SurvivorAdvantageDetail,
  SurvivorAdvantageMovement,
  SurvivorCastaway,
  SurvivorChallengeResult,
  SurvivorEpisode,
  SurvivorJourney,
  SurvivorTable,
  SurvivorTribeMapping,
  SurvivorVoteHistory,
} from "./survivor-types.js";

const BASE_URL =
  "https://raw.githubusercontent.com/doehm/survivoR/master/dev/json";

/** Fetch a survivoR table as JSON. */
export async function fetchTable<T>(table: SurvivorTable): Promise<T[]> {
  const url = `${BASE_URL}/${table}.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch survivoR ${table}: ${res.status} ${res.statusText}`,
    );
  }
  return (await res.json()) as T[];
}

/** Filter records by US version and season number. */
export function filterBySeason<T extends { version?: string; season?: number }>(
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

/** All data needed to build a season from survivoR. */
export interface SurvivorSeasonData {
  castaways: SurvivorCastaway[];
  episodes: SurvivorEpisode[];
  challengeResults: SurvivorChallengeResult[];
  voteHistory: SurvivorVoteHistory[];
  advantageDetails: SurvivorAdvantageDetail[];
  advantageMovement: SurvivorAdvantageMovement[];
  tribeMapping: SurvivorTribeMapping[];
  journeys: SurvivorJourney[];
}

/**
 * Fetch all survivoR data needed for a given season.
 * Returns typed, filtered, and validated data.
 */
export async function fetchSeasonData(
  seasonNum: number,
): Promise<SurvivorSeasonData> {
  console.log(`  Fetching survivoR data for Season ${seasonNum}...`);

  // Fetch all tables in parallel
  const [
    allCastaways,
    allEpisodes,
    allChallengeResults,
    allVoteHistory,
    allAdvantageDetails,
    allAdvantageMovement,
    allTribeMapping,
    allJourneys,
  ] = await Promise.all([
    fetchTable<SurvivorCastaway>("castaways"),
    fetchTable<SurvivorEpisode>("episodes"),
    fetchTable<SurvivorChallengeResult>("challenge_results"),
    fetchTable<SurvivorVoteHistory>("vote_history"),
    fetchTable<SurvivorAdvantageDetail>("advantage_details"),
    fetchTable<SurvivorAdvantageMovement>("advantage_movement"),
    fetchTable<SurvivorTribeMapping>("tribe_mapping"),
    fetchTable<SurvivorJourney>("journeys"),
  ]);

  // Filter to the requested season
  const castaways = filterBySeason(allCastaways, seasonNum);
  const episodes = filterBySeason(allEpisodes, seasonNum);
  const challengeResults = filterBySeason(allChallengeResults, seasonNum);
  const voteHistory = filterBySeason(allVoteHistory, seasonNum);
  const advantageDetails = filterBySeason(allAdvantageDetails, seasonNum);
  const advantageMovement = filterBySeason(allAdvantageMovement, seasonNum);
  const tribeMapping = filterBySeason(allTribeMapping, seasonNum);
  const journeys = filterBySeason(allJourneys, seasonNum);

  if (castaways.length === 0) {
    console.log(
      `  Warning: No castaways found for Season ${seasonNum} — season may not exist in survivoR`,
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
    advantageDetails,
    advantageMovement,
    tribeMapping,
    journeys,
  };
}
