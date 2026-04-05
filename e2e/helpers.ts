/**
 * Route definitions for e2e tests.
 *
 * IMPORTANT: All e2e tests must be READ-ONLY. Navigate and screenshot only.
 * Never modify production season data.
 */

/** Season ID used for dynamic route parameters */
const SEASON_ID = "season_50";

/**
 * Competition IDs for detail-page coverage.
 * Pick competitions that exercise different states:
 * - WATCH_ALONG_COMP: in-progress with watch-along mode and prop bets
 * - COMPLETE_COMP: finished competition with full scoring data
 */
const WATCH_ALONG_COMP =
  "competition_21a81dc5-b0a2-4a54-a10a-b36adaa2b710"; // Amanda and Davis 49
const COMPLETE_COMP =
  "competition_966233a0-66d9-4500-a134-a085d0532b58"; // Ford Family (S46)

/** Routes that don't require authentication */
export const PUBLIC_ROUTES = [
  { path: "/", name: "home" },
  { path: "/seasons", name: "seasons" },
  { path: `/seasons/${SEASON_ID}`, name: "single-season" },
];

/** Routes that require admin authentication */
export const ADMIN_ROUTES = [
  { path: "/admin", name: "admin-dashboard" },
  { path: `/admin/${SEASON_ID}`, name: "season-admin" },
  { path: "/competitions", name: "competitions" },
  {
    path: `/competitions/${WATCH_ALONG_COMP}`,
    name: "competition-watch-along",
  },
  { path: `/competitions/${COMPLETE_COMP}`, name: "competition-complete" },
];

/** All routes combined */
export const ALL_ROUTES = [...PUBLIC_ROUTES, ...ADMIN_ROUTES];

/**
 * Sections to scroll-capture on long pages.
 * Each entry defines a page name and DOM selectors for key sections.
 * The audit spec scrolls to each section and takes a focused screenshot.
 */
export const SCROLL_SECTIONS: Record<string, { label: string; selector: string }[]> = {
  "competition-watch-along": [
    { label: "header", selector: "h2" },
    { label: "teams", selector: "h3:has-text('Teams')" },
    { label: "standings", selector: "h3:has-text('Standings')" },
    { label: "prop-bets", selector: "h3:has-text('Prop Bets')" },
    { label: "player-scores", selector: "h3:has-text('Player Scores')" },
  ],
  "competition-complete": [
    { label: "header", selector: "h2" },
    { label: "teams", selector: "h3:has-text('Teams')" },
    { label: "standings", selector: "h3:has-text('Standings')" },
    { label: "prop-bets", selector: "h3:has-text('Prop Bets')" },
    { label: "player-scores", selector: "h3:has-text('Player Scores')" },
    { label: "scoring-breakdown", selector: "h3:has-text('Scoring Breakdown')" },
  ],
};
