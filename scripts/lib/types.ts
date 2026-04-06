/** Shared types for the scraper and backfill tools */

export interface ScrapedPlayer {
  wikiPageTitle: string;
  localName: string;
  castawayId: string;
  castawayShortName?: string;
  matchStatus: "exact" | "fuzzy" | "unmatched";
  age?: number;
  profession?: string;
  hometown?: string;
  previousSeasons?: number[];
  imageUrl?: string;
  bio?: string;
  nickname?: string;
}

export interface ScrapeResult {
  seasonNum: number;
  scrapedAt: string;
  players: ScrapedPlayer[];
  unmatched: ScrapedPlayer[];
}

// --- Gameplay scrape types ---

export type ScrapedChallengeVariant =
  | "duel"
  | "reward"
  | "team_reward"
  | "immunity"
  | "team_immunity";

export type ScrapedEliminationVariant =
  | "tribal"
  | "medical"
  | "quitter"
  | "ejected"
  | "switched"
  | "final_tribal_council"
  | "other";

export interface ScrapedEpisode {
  order: number;
  title: string;
  airDate: string;
  isFinale: boolean;
  postMerge: boolean;
  mergeOccurs: boolean;
}

export interface ScrapedChallenge {
  episodeNum: number;
  variant: ScrapedChallengeVariant;
  winnerCastawayIds: string[];
  winnerTribe: string | null;
  order: number;
}

export interface ScrapedElimination {
  episodeNum: number;
  castawayId: string;
  voteString: string;
  variant: ScrapedEliminationVariant;
  finishText: string;
  order: number;
}

export interface ScrapedGameEvent {
  episodeNum: number;
  castawayId: string;
  action: string;
  multiplier: number | null;
}

export interface ScrapeResultsOutput {
  seasonNum: number;
  scrapedAt: string;
  episodes: ScrapedEpisode[];
  challenges: ScrapedChallenge[];
  eliminations: ScrapedElimination[];
  events: ScrapedGameEvent[];
  warnings: string[];
}
