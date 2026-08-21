/**
 * Route definitions for e2e tests.
 *
 * IMPORTANT: All e2e tests must be READ-ONLY. Navigate and screenshot only.
 * Never modify production season data.
 */

/** Season ID used for dynamic route parameters */
const SEASON_ID = "season_50";
export type CompetitionTab = "Overview" | "Scoring" | "Trades" | "Stats";

export interface AuditRoute {
  path: string;
  name: string;
  competitionTab?: CompetitionTab;
}

/**
 * Competition IDs for detail-page coverage.
 * Pick competitions that exercise different states:
 * - WATCH_ALONG_COMP: in-progress with watch-along mode and prop bets
 * - COMPLETE_COMP: finished competition with full scoring data
 */
const WATCH_ALONG_COMP = "competition_21a81dc5-b0a2-4a54-a10a-b36adaa2b710"; // Amanda and Davis 49
const COMPLETE_COMP = "competition_966233a0-66d9-4500-a134-a085d0532b58"; // Ford Family (S46)

/** Routes that don't require authentication */
export const PUBLIC_ROUTES: AuditRoute[] = [
  { path: "/", name: "home" },
  { path: "/seasons", name: "seasons" },
  { path: `/seasons/${SEASON_ID}`, name: "single-season" },
];

/** Routes that require admin authentication */
export const ADMIN_ROUTES: AuditRoute[] = [
  { path: "/admin", name: "admin-dashboard" },
  { path: `/admin/${SEASON_ID}`, name: "season-admin" },
  { path: "/competitions", name: "competitions" },
  {
    path: `/competitions/${WATCH_ALONG_COMP}?tab=overview`,
    name: "competition-watch-along-overview",
    competitionTab: "Overview",
  },
  {
    path: `/competitions/${WATCH_ALONG_COMP}?tab=scoring`,
    name: "competition-watch-along-scoring",
    competitionTab: "Scoring",
  },
  {
    path: `/competitions/${WATCH_ALONG_COMP}?tab=trades`,
    name: "competition-watch-along-trades",
    competitionTab: "Trades",
  },
  {
    path: `/competitions/${WATCH_ALONG_COMP}?tab=stats`,
    name: "competition-watch-along-stats",
    competitionTab: "Stats",
  },
  {
    path: `/competitions/${COMPLETE_COMP}?tab=overview`,
    name: "competition-complete-overview",
    competitionTab: "Overview",
  },
  {
    path: `/competitions/${COMPLETE_COMP}?tab=scoring`,
    name: "competition-complete-scoring",
    competitionTab: "Scoring",
  },
  {
    path: `/competitions/${COMPLETE_COMP}?tab=trades`,
    name: "competition-complete-trades",
    competitionTab: "Trades",
  },
  {
    path: `/competitions/${COMPLETE_COMP}?tab=stats`,
    name: "competition-complete-stats",
    competitionTab: "Stats",
  },
];

/** All routes combined */
export const ALL_ROUTES = [...PUBLIC_ROUTES, ...ADMIN_ROUTES];

/**
 * Sections to scroll-capture on content-rich pages.
 * Each entry defines a page name and DOM selectors for key sections.
 * The audit spec scrolls to each section and takes a focused screenshot.
 */
export const SCROLL_SECTIONS: Record<
  string,
  { label: string; selector: string }[]
> = {
  "competition-watch-along-overview": [
    { label: "header", selector: "h2" },
    { label: "rosters", selector: "h3:has-text('Rosters')" },
    { label: "standings", selector: "h3:has-text('Standings')" },
  ],
  "competition-watch-along-scoring": [
    { label: "header", selector: "h2" },
    { label: "prop-bets", selector: "h3:has-text('Prop Bets')" },
    { label: "player-scores", selector: "h3:has-text('Player Scores')" },
    {
      label: "scoring-reference",
      selector: "h4:has-text('Scoring Reference')",
    },
  ],
  "competition-watch-along-trades": [
    { label: "header", selector: "h2" },
    { label: "trades", selector: "h3:has-text('Trades')" },
  ],
  "competition-watch-along-stats": [
    { label: "header", selector: "h2" },
    { label: "season-stats", selector: "h3:has-text('Season Stats')" },
  ],
  "competition-complete-overview": [
    { label: "header", selector: "h2" },
    { label: "rosters", selector: "h3:has-text('Rosters')" },
    { label: "standings", selector: "h3:has-text('Standings')" },
  ],
  "competition-complete-scoring": [
    { label: "header", selector: "h2" },
    { label: "prop-bets", selector: "h3:has-text('Prop Bets')" },
    { label: "player-scores", selector: "h3:has-text('Player Scores')" },
    {
      label: "scoring-reference",
      selector: "h4:has-text('Scoring Reference')",
    },
  ],
  "competition-complete-trades": [
    { label: "header", selector: "h2" },
    { label: "trades", selector: "h3:has-text('Trades')" },
  ],
  "competition-complete-stats": [
    { label: "header", selector: "h2" },
    { label: "season-stats", selector: "h3:has-text('Season Stats')" },
  ],
};
