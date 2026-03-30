---
title: "refactor: Upgrade to Mantine v8 (React 19)"
type: refactor
status: completed
date: 2026-03-29
deepened: 2026-03-29
---

# Upgrade to Mantine v8 (React 19)

## Overview

Upgrade the UI framework stack from Mantine v7.8 to Mantine v8.x (latest stable — v9 is alpha-only as of 2026-03-29). Also upgrade React 18 → 19, which cascades to replacing `react-query` v3 (not React 19 compatible) and bumping Recharts to satisfy `@mantine/charts` v8 peer dep.

## Problem Frame

The project is on Mantine 7.8.0 (released early 2024), which is two major versions behind. Mantine v9 brings React 19 support, improved hook APIs, new components (@mantine/schedule), better form validation (async + debounce), and ongoing maintenance. Staying on v7 means accumulating upgrade debt and missing security/bug fixes.

## Requirements Trace

- R1. All 6 Mantine packages upgraded to v9.x and working
- R2. React upgraded to 19.2+ with all ecosystem deps compatible
- R3. `react-query` v3 and `@react-query-firebase/firestore` eliminated (not React 19 compatible)
- R4. Recharts upgraded to v3 (required by `@mantine/charts` v9)
- R5. Zero regressions — app builds, lints, and runs correctly after upgrade
- R6. Dead dependency `firebaseui` removed

## Scope Boundaries

- No new features or UI changes beyond what the upgrade requires
- No migration to React Router v7 (v6.22.3 is React 19 compatible as-is)
- No Firebase SDK major upgrade (v10.11.0 is compatible as-is)
- No ESLint flat config migration (v4.6.0 hooks plugin works, optional v5 upgrade deferred)
- No theme expansion or design system changes

## Context & Research

### Relevant Code and Patterns

- **Mantine packages (6):** `@mantine/core`, `@mantine/hooks`, `@mantine/form`, `@mantine/modals`, `@mantine/notifications`, `@mantine/charts` — all at `^7.8.0`
- **PostCSS:** `postcss-preset-mantine` v1.14.4 in `postcss.config.cjs`
- **Theme:** `src/theme.ts` — minimal customization (heading sizes only)
- **CSS imports:** `@mantine/core/styles.css`, `@mantine/charts/styles.css`, `@mantine/notifications/styles.css` in `src/AppRoutes.tsx`
- **CSS Modules:** 4 files use `--mantine-*` CSS variables and `light-dark()` function
- **react-query usage (minimal):** `QueryClientProvider` in `AppRoutes.tsx`, `QueryClient` in `queryClient.ts`, `useFirestoreQueryData` in `useSeasons.ts` and `useMyCompetitions.ts`
- **onSnapshot pattern (established):** 8 hooks already use raw Firebase `onSnapshot` — `useSeason`, `useEliminations`, `useChallenges`, `useCompetitions`, `useTeams`, `useTeamAssignments`, `useCompetition`, `useEvents`
- **Recharts:** Single `LineChart` in `src/components/Charts/SurvivorPerEpisodeScoringChart.tsx`
- **Mantine components used:** ~60 unique components across ~35 files. Heavy usage of Table, SimpleGrid, Button, Text, Badge, Alert, Stack, Group, Box, Center, Title, Avatar, Paper.

### Mantine v7 → v9 Breaking Changes (Affecting This Codebase)

Most v8/v9 breaking changes do NOT affect this codebase:

- ~~Collapse `in` → `expanded`~~ — Collapse was removed in PR #20
- ~~Grid `gutter` → `gap`~~ — Grid not used (SimpleGrid instead)
- ~~Text/Anchor `color` → `c`~~ — Already using `c` prop everywhere
- ~~Switch thumb indicator~~ — Switch not used
- ~~Menu.Item `data-hovered`~~ — Menu not used
- ~~CodeHighlight adapter~~ — Not used
- ~~Carousel Embla changes~~ — Not used

**Changes that DO apply:**

1. **Image:** No longer includes `flex: 0` styles by default (v8) — used in `Seasons.tsx`, `Admin.tsx`
2. **Portal:** `reuseTargetNode` now enabled by default (v8) — could affect modal stacking
3. **Default medium font weight:** Changed from 500 → 600 (v9) — may subtly change text appearance
4. **Recharts 3+ required** for `@mantine/charts` v9
5. **postcss-preset-mantine** version alignment needed

### React 19 Ecosystem Compatibility

| Package               | Current     | React 19 | Action                                    |
| --------------------- | ----------- | -------- | ----------------------------------------- |
| react-query v3        | 3.39.3      | ❌       | Remove — migrate to onSnapshot            |
| @react-query-firebase | 1.0.0-dev.7 | ❌       | Remove — abandoned                        |
| firebaseui            | 6.1.0       | ❌       | Remove — dead dependency (never imported) |
| react-router-dom      | 6.22.3      | ✅       | Keep as-is                                |
| @dnd-kit/core         | 6.3.1       | ✅       | Keep as-is                                |
| @dnd-kit/sortable     | 10.0.0      | ✅       | Keep as-is                                |
| firebase              | 10.11.0     | ✅       | Keep as-is                                |
| @tabler/icons-react   | 3.2.0       | ✅       | Keep as-is                                |
| @vitejs/plugin-react  | 4.2.1       | ✅       | Upgrade to v5 for React 19 optimizations  |

## Key Technical Decisions

- **Eliminate react-query entirely instead of migrating to @tanstack/react-query v5:** The codebase has 8 hooks using raw `onSnapshot` and only 2 using react-query-firebase. Converting those 2 to the established `onSnapshot` pattern removes a dependency entirely rather than upgrading it. The data they fetch (seasons list, user competitions) is Firestore collection data that benefits from realtime updates anyway.
- **Jump directly from Mantine v7 to v9 (skip v8):** The v8-specific breaking changes that affect this codebase are minimal (Image flex, Portal default, font weight). Going through v8 as an intermediate step adds work without reducing risk.
- **Sequence: pre-upgrade cleanup → React 19 → Mantine v9 → Recharts 3:** Each step is independently verifiable. Pre-cleanup on the current stack reduces variables during the framework upgrades.

## Open Questions

### Resolved During Planning

- **Should we migrate react-query to @tanstack/react-query v5?** No — the onSnapshot pattern is already established in 8 hooks. Eliminating react-query entirely is simpler and removes a dependency.
- **Should we upgrade React Router to v7?** No — v6.22.3 is React 19 compatible. Router upgrade is separate scope.
- **Can we skip Mantine v8?** Yes — npm installs the target version directly. We just need to handle both v8 and v9 breaking changes in one pass.

### Deferred to Implementation

- **Portal `reuseTargetNode` behavior:** May need `reuseTargetNode={false}` on modal portals if z-index stacking breaks. Will be apparent during manual testing.
- **Font weight visual changes:** The 500→600 default shift may subtly change text that doesn't set explicit `fw`. Assess visually during testing.
- **postcss-preset-mantine target version:** Determine the exact compatible version during `yarn upgrade`.

## Implementation Units

- [ ] **Unit 1: Remove dead dependencies and eliminate react-query**

**Goal:** Remove `firebaseui` (unused), `react-query`, and `@react-query-firebase/firestore`. Rewrite the 2 hooks that use react-query-firebase to use the established `onSnapshot` pattern.

**Requirements:** R3, R6

**Dependencies:** None — can be done on current React 18 + Mantine 7

**Files:**

- Modify: `package.json` (remove 3 deps)
- Modify: `src/AppRoutes.tsx` (remove `QueryClientProvider` import and wrapper)
- Modify: `src/hooks/useSeasons.ts` (rewrite to `onSnapshot`)
- Modify: `src/hooks/useMyCompetitions.ts` (rewrite to `onSnapshot`)
- Modify: `src/pages/Admin.tsx` (update hook return type usage — remove `isLoading` destructure)
- Modify: `src/pages/SeasonAdmin.tsx` (update hook return type usage — remove `isSeasonsLoading` destructure)
- Modify: `src/pages/Competitions.tsx` (update hook return type usage — adjust `|| []` fallback)
- Delete: `src/queryClient.ts`

**Approach:**

- Rewrite `useSeasons` and `useMyCompetitions` following the existing `onSnapshot` pattern used in `useSeason.ts`, `useCompetitions.ts`, etc. These hooks use `useState` + `useEffect` with `onSnapshot` and return `{ data }` (data initialized as empty array, not `undefined`).
- **Return type change:** react-query-firebase returns `{ data: T[] | undefined, isLoading, isError, ... }` with 20+ fields. The new onSnapshot hooks return `{ data: T[] }` with data defaulting to `[]`. Callers that destructure `isLoading` or use `data || []` fallbacks need minor updates.
- `useSeasons` fetches `collection(db, "seasons")` — straightforward collection listener
- `useMyCompetitions` fetches `collection(db, "competitions")` with a `where("participant_uids", "array-contains", user?.uid)` filter — needs the `useUser` dependency and `enabled` guard (skip subscription when no user)
- Remove `QueryClientProvider` wrapper from `AppRoutes.tsx`
- Remove `queryClient.ts`
- Remove `react-query`, `@react-query-firebase/firestore`, and `firebaseui` from `package.json`
- **No caching concern:** Zero usage of staleTime, cacheTime, or refetch options was found in the codebase. The react-query cache was not relied upon for any behavior.

**Patterns to follow:**

- `src/hooks/useSeason.ts` — canonical `onSnapshot` hook pattern in this codebase
- `src/hooks/useCompetitions.ts` — collection-level `onSnapshot` example

**Test scenarios:**

- Happy path: Seasons list loads and displays on the Seasons page
- Happy path: User's competitions load on the Competitions page when logged in
- Edge case: Competitions hook returns empty when user is not logged in
- Edge case: Seasons page updates in realtime when a season document changes in Firestore
- Error path: Hooks handle Firestore permission errors gracefully

**Verification:**

- App builds and runs with zero react-query references remaining
- `yarn build` succeeds
- Seasons and Competitions pages display data correctly
- No `react-query` in `node_modules` after `yarn install`

---

- [ ] **Unit 2: Upgrade React 18 → 19 and build tooling**

**Goal:** Upgrade React, ReactDOM, type definitions, and the Vite React plugin to React 19 compatible versions.

**Requirements:** R2

**Dependencies:** Unit 1 (react-query must be removed first — it's not React 19 compatible)

**Files:**

- Modify: `package.json` (upgrade react, react-dom, @types/react, @types/react-dom, @vitejs/plugin-react)

**Approach:**

- Upgrade `react` and `react-dom` to `^19.2.0`
- Upgrade `@types/react` and `@types/react-dom` to latest React 19 types
- Upgrade `@vitejs/plugin-react` to v5.x for React 19 support
- Run `yarn install` to resolve peer dependency conflicts
- Run `yarn tsc` to catch any React 19 type incompatibilities (e.g., removed `React.FC` children prop, ref callback cleanup)
- Fix any type errors that surface

**Patterns to follow:**

- React 19 migration guide: check for `React.FC` implicit children, `ref` as prop changes, `useRef` requiring initial argument

**Test scenarios:**

- Happy path: `yarn build` succeeds with zero type errors on React 19
- Happy path: App renders and navigates between all routes
- Edge case: All `useEffect` hooks execute correctly (React 19 strict mode behavior unchanged since 18 already double-fires in dev)
- Error path: Any `forwardRef` usage compiles (React 19 makes `ref` a regular prop — `forwardRef` still works but is optional)

**Verification:**

- `yarn tsc` passes with zero errors
- `yarn build` produces a working bundle
- Dev server starts and renders the app

---

- [ ] **Unit 3: Upgrade Mantine v7 → v9**

**Goal:** Upgrade all 6 Mantine packages and `postcss-preset-mantine` to v9.x compatible versions.

**Requirements:** R1

**Dependencies:** Unit 2 (Mantine v9 requires React 19)

**Files:**

- Modify: `package.json` (upgrade 6 @mantine/\* packages + postcss-preset-mantine)
- Possibly modify: `src/AppRoutes.tsx` (CSS imports if changed)
- Possibly modify: `src/pages/Seasons.tsx`, `src/pages/Admin.tsx` (Image component `flex: 0` change)
- Possibly modify: `src/theme.ts` (if font weight defaults need overriding)
- Possibly modify: CSS module files if `--mantine-*` variable names changed

**Approach:**

- Upgrade all 6 `@mantine/*` packages to latest v9.x
- Upgrade `postcss-preset-mantine` to the version compatible with Mantine v9
- Verify CSS imports — current `@mantine/core/styles.css` should still work (v8 only splits individual imports, full bundle import unchanged)
- Check Image component usage in `Seasons.tsx` and `Admin.tsx` — if layout breaks due to removed `flex: 0`, add explicit `style={{ flex: 0 }}` or wrap in a constraining container
- Check modals — if Portal `reuseTargetNode` causes z-index issues, add `reuseTargetNode={false}` to `MantineProvider` or individual Portals
- Assess font weight visual impact — if 500→600 shift is noticeable, override `--mantine-font-weight-medium` in `theme.ts` back to `'500'`
- Run `yarn tsc` and fix any type errors from Mantine API changes

**Patterns to follow:**

- Mantine v7→v8 migration guide (CSS imports, Image, Portal defaults)
- Mantine v8→v9 migration guide (font weight, hook changes)

**Test scenarios:**

- Happy path: All pages render with correct Mantine component styling
- Happy path: Modals open and close correctly (AuthModal, confirm modals, player detail modals)
- Happy path: Notifications display correctly with icons
- Happy path: Forms validate and submit (Draft prop bets, admin CRUD forms)
- Happy path: `useDisclosure` (AppShell navbar toggle) works
- Happy path: `useMediaQuery` (mobile detection) works
- Edge case: Dark mode works via `light-dark()` CSS functions
- Edge case: Responsive breakpoints in CSS modules still trigger correctly
- Edge case: Table components render with scroll containers
- Edge case: Accordion components in admin CRUD forms expand/collapse

**Verification:**

- `yarn tsc` passes
- `yarn lint` passes
- `yarn build` succeeds
- All pages visually render correctly (manual check)

---

- [ ] **Unit 4: Upgrade Recharts 2 → 3**

**Goal:** Upgrade Recharts to v3 as required by `@mantine/charts` v9.

**Requirements:** R4

**Dependencies:** Unit 3 (Mantine Charts v9 requires Recharts 3)

**Files:**

- Modify: `package.json` (upgrade recharts to v3.x)
- Possibly modify: `src/components/Charts/SurvivorPerEpisodeScoringChart.tsx`

**Approach:**

- Upgrade `recharts` to latest v3.x
- The chart component uses `LineChart` from `@mantine/charts` (not raw Recharts), so Recharts breaking changes may not surface directly. Mantine's `LineChart` wrapper abstracts the Recharts API.
- Verify the scoring chart renders correctly with line colors and data points
- If the chart breaks, check Recharts 3 changes: `accessibilityLayer` default changed to `true`, SVG element ordering by render order

**Patterns to follow:**

- Recharts 3.0 migration guide for any direct Recharts API usage

**Test scenarios:**

- Happy path: Scoring chart renders with correct lines and colors on a competition page
- Edge case: Chart handles empty data (no episodes scored yet) without crashing
- Edge case: Chart handles many players (18 lines) without visual overlap issues

**Verification:**

- `yarn build` succeeds
- Chart renders on a competition page with scoring data

---

- [ ] **Unit 5: Full verification pass**

**Goal:** Run all quality checks and verify the complete upgrade.

**Requirements:** R5

**Dependencies:** Units 1-4

**Files:**

- No file changes expected — this is a verification unit

**Approach:**

- Run `yarn prepush` (format + lint --fix + tsc)
- Run `yarn build`
- Run `yarn test` (vitest)
- Manual smoke test: navigate all routes, test draft flow, test admin CRUD, test competition views
- Verify no Mantine deprecation warnings in browser console

**Test expectation: none** — this unit is the verification pass itself, not feature-bearing code.

**Verification:**

- `yarn prepush` passes
- `yarn build` produces deployable output
- `yarn test` passes
- No console warnings about deprecated Mantine APIs

## System-Wide Impact

- **Interaction graph:** `MantineProvider` wraps the entire app. CSS variable names, component APIs, and theme defaults affect every page. The change is pervasive but uniform — it's the same API surface everywhere.
- **Error propagation:** No changes to error handling patterns. Firebase hooks maintain the same error state shape.
- **State lifecycle risks:** Removing `QueryClientProvider` eliminates react-query's cache layer. The 2 affected hooks switch to `onSnapshot` which provides realtime updates instead of cached stale-while-revalidate. This is a net improvement for data freshness.
- **API surface parity:** No API endpoints, agent tools, or external consumers to update.
- **Unchanged invariants:** Firebase backend, routing structure, authentication flow, scoring engine, and all business logic are untouched.

## Risks & Dependencies

| Risk                                                                               | Mitigation                                                                                              |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Mantine v9 CSS variable names changed                                              | CSS modules use documented `--mantine-*` variables which are stable across versions. Verify with build. |
| Portal `reuseTargetNode` breaks modal stacking                                     | Test modals early. Override with `reuseTargetNode={false}` if needed.                                   |
| Font weight 500→600 shift changes visual appearance                                | Override in `theme.ts` if the change is undesirable.                                                    |
| react-query removal breaks data freshness for seasons/competitions                 | onSnapshot provides superior realtime updates. Verify with manual testing.                              |
| Undocumented peer dependency conflicts                                             | Run `yarn install` and resolve conflicts iteratively. Pin versions if needed.                           |
| @react-query-firebase type mismatch workarounds (ts-expect-error) no longer needed | The ts-expect-error comments go away with the hooks. Verify no orphaned type suppressions.              |

## Sources & References

- Mantine v7→v8 migration: https://mantine.dev/guides/7x-to-8x/
- Mantine v8.0 changelog: https://mantine.dev/changelog/8-0-0/
- Mantine v9.0 changelog: https://alpha.mantine.dev/changelog/9-0-0/
- Recharts 3.0 migration: https://github.com/recharts/recharts/wiki/3.0-migration-guide
- React 19 release: https://react.dev/blog/2024/12/05/react-19
