/**
 * TypeScript types matching the survivoR2py dataset schemas.
 * Source: https://github.com/stiles/survivoR2py
 *
 * Fields use the exact names from the JSON/CSV data.
 * Numbers come as floats from JSON (e.g., season: 1.0).
 */

/** castaways.json — one row per castaway per season appearance */
export interface SurvivorCastaway {
  version: string;
  version_season: string;
  season_name: string;
  season: number;
  full_name: string;
  castaway_id: string;
  castaway: string; // short name
  age: number | null;
  city: string | null;
  state: string | null;
  episode: number;
  day: number | null;
  order: number;
  result: string;
  jury_status: string | null;
  original_tribe: string;
  jury: boolean;
  finalist: boolean;
  winner: boolean;
  result_number: number;
}

/** episodes.json — one row per episode */
export interface SurvivorEpisode {
  version: string;
  version_season: string;
  season_name: string;
  season: number;
  episode_number_overall: number;
  episode: number;
  episode_title: string;
  episode_label: string;
  episode_date: number; // epoch ms
  episode_length: number | null;
  viewers: number | null;
  imdb_rating: number | null;
  n_ratings: number | null;
  episode_summary: string | null;
}

/** challenge_results.csv — one row per castaway per challenge */
export interface SurvivorChallengeResult {
  version: string;
  version_season: string;
  season_name: string;
  season: number;
  episode: number;
  n_boots: number;
  castaway_id: string;
  castaway: string;
  tribe: string;
  tribe_status: string;
  challenge_type: string; // "Immunity", "Reward", "Immunity and Reward"
  outcome_type: string; // "Tribal", "Individual", "Team"
  team: string;
  result: string; // "Won", "Lost", etc.
  result_notes: string;
  chosen_for_reward: boolean | string;
  challenge_id: number;
  sit_out: boolean | string;
  order_of_finish: number | null;
  sog_id: number;
}

/** vote_history.csv — one row per vote cast */
export interface SurvivorVoteHistory {
  version: string;
  version_season: string;
  season_name: string;
  season: number;
  episode: number;
  day: number;
  tribe_status: string;
  tribe: string;
  castaway: string;
  immunity: string;
  vote: string;
  vote_event: string;
  vote_event_outcome: string;
  split_vote: string;
  nullified: boolean | string;
  tie: boolean | string;
  voted_out: string;
  order: number;
  vote_order: number;
  castaway_id: string;
  vote_id: string;
  voted_out_id: string;
  sog_id: number;
  challenge_id: number;
}

/** advantage_movement.csv — one row per advantage event */
export interface SurvivorAdvantageMovement {
  version: string;
  version_season: string;
  season_name: string;
  season: number;
  castaway: string;
  castaway_id: string;
  advantage_id: number;
  sequence_id: number;
  day: number | null;
  episode: number;
  event: string; // "Found", "Played", "Received", "Transferred", "Expired"
  played_for: string;
  played_for_id: string;
  success: string;
  votes_nullified: number | null;
}

/** tribe_mapping.csv — one row per castaway per episode (tribe membership) */
export interface SurvivorTribeMapping {
  version: string;
  version_season: string;
  season_name: string;
  season: number;
  episode: number;
  day: number;
  castaway_id: string;
  castaway: string;
  tribe: string;
  tribe_status: string; // "Original", "Swapped", "Merged"
}

/** Table names available from survivoR2py */
export type SurvivorTable =
  | "castaways"
  | "episodes"
  | "challenge_results"
  | "vote_history"
  | "advantage_movement"
  | "tribe_mapping";
