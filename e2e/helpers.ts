/**
 * Route definitions for e2e tests.
 *
 * IMPORTANT: All e2e tests must be READ-ONLY. Navigate and screenshot only.
 * Never modify production season data.
 */

/** Season ID used for dynamic route parameters */
const SEASON_ID = "season_50";

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
];

/** All routes combined */
export const ALL_ROUTES = [...PUBLIC_ROUTES, ...ADMIN_ROUTES];
