/**
 * Raw data scraped from a source before matching to app player names.
 */
export type ScrapedContestant = {
  /** Name as it appears on the source website */
  scrapedName: string;
  /** URL of the contestant's page on the source */
  sourceUrl: string;
  /** Age at time of the season (not birth year) */
  ageOnSeason?: number;
  hometown?: string;
  profession?: string;
  /** Short bio (1-2 sentences) from the source */
  bio?: string;
  /** Season numbers the contestant previously appeared on */
  previousSeasons?: number[];
};

/**
 * Structured metadata for a player, keyed by app player name.
 * This is what gets written into playerMeta.ts files.
 */
export type PlayerMetaEntry = {
  ageOnSeason?: number;
  hometown?: string;
  profession?: string;
  bio?: string;
  previousSeasons?: number[];
  sourceUrl?: string;
};

/**
 * Source adapter interface. Implement one per scraping source.
 */
export interface ContestantSource {
  /** Human-readable name for logging */
  name: string;
  /** Scrape all contestants for a given season number */
  scrapeseason(seasonNum: number): Promise<ScrapedContestant[]>;
}

export type MatchResult = {
  appName: string;
  scrapedName: string;
  meta: PlayerMetaEntry;
};

export type MatchReport = {
  matched: MatchResult[];
  unmatched: ScrapedContestant[];
  unmatchedAppNames: string[];
};
