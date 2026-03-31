/** Shared types for the scraper and backfill tools */

export interface ScrapedPlayer {
  wikiPageTitle: string;
  localName: string;
  matchStatus: "exact" | "fuzzy" | "unmatched";
  age?: number;
  profession?: string;
  hometown?: string;
  previousSeasons?: number[];
  bio?: string;
}

export interface ScrapeResult {
  seasonNum: number;
  scrapedAt: string;
  players: ScrapedPlayer[];
  unmatched: ScrapedPlayer[];
}
