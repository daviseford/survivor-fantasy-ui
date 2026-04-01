/** Shared types for the scraper and backfill tools */

export interface ScrapedPlayer {
  wikiPageTitle: string;
  localName: string;
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

export interface ScrapedEpisode {
  order: number;
  title: string;
  airDate: string;
  isCombinedChallenge: boolean;
  isFinale: boolean;
  postMerge: boolean;
  mergeOccurs: boolean;
}

export interface ScrapedChallenge {
  episodeNum: number;
  variant: "reward" | "immunity" | "combined";
  winnerNames: string[];
  winnerTribe: string | null;
  order: number;
}

export interface ScrapedElimination {
  episodeNum: number;
  playerName: string;
  voteString: string;
  variant: "tribal" | "medical" | "quitter" | "final_tribal_council" | "other";
  finishText: string;
  order: number;
}

export interface ScrapedGameEvent {
  episodeNum: number;
  playerName: string;
  action: string;
  multiplier: number | null;
}

/** Raw tribe history parsed from votetable tribebox2/tribeicon1 patterns */
export interface PlayerTribeHistory {
  tribebox2: string;
  tribeicons: string[];
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
