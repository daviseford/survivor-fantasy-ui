---
title: "feat: UX improvements — feedback, scoring views, draft flow, onboarding, consistency"
type: feat
status: active
date: 2026-03-29
origin: docs/audit-2026-03-29.md
---

# UX Improvements: Feedback, Scoring Views, Draft Flow, Onboarding, Consistency

## Overview

Address the full set of design critique findings to bring the app from "functional admin panel" to "fun fantasy game for friends." Work spans system feedback, scoring view improvements, draft page flow, onboarding hints, and visual consistency.

## Problem Frame

The app works but doesn't feel alive. Form submissions give no feedback. Scoring views are walls of numbers with no story. The draft page shows everything at once instead of focusing on the current phase. New users get no guidance. Visual hierarchy is inconsistent across views. (See origin: docs/audit-2026-03-29.md)

## Requirements Trace

- R1. All write operations show success/error feedback to the user
- R2. Scoring/competition views answer "am I winning?" in 2 seconds
- R3. Draft page focuses on the current phase, not all phases at once
- R4. Color-coded elements have legends; complex interactions have instructional text
- R5. Heading hierarchy, spacing, and button sizing are consistent across views
- R6. Navbar uses client-side routing (no full page reloads)

## Scope Boundaries

- No backend/Firestore schema changes
- No new pages or routes — improvements are within existing views
- No redesign of the scoring engine or data hooks
- Chart color improvements (colorize) deferred to a future pass
- No mobile-specific layout redesign beyond fixing the existing responsive issues

## Context & Research

### Relevant Code and Patterns

- `@mantine/notifications` is NOT installed — needs to be added for toast feedback
- Admin.tsx already has an Alert-based feedback pattern (`useUploadFeedback` hook) — can be generalized
- Draft.tsx manages phase state via `draft.started` / `draft.finished` / `userHasSubmittedPropBets` booleans — progressive disclosure can key off these
- `useScoringCalculations` returns `pointsByUserPerEpisodeWithPropBets` sorted by total — leaderboard data already exists
- `useUser` provides `slimUser.uid` for personalizing views — "your team" highlighting is straightforward
- Navbar uses `<a href>` tags — should use React Router `<Link>` or Mantine `<Anchor component={Link}>`
- Mantine `AppShell.Main` has `margin-bottom: rem(144px)` on mobile in `AppRoutes.module.css` — excessive

### Institutional Learnings

- Firestore rejects `undefined` values (learned during Season 50 setup) — relevant when adding optional fields
- Eliminated players must be removed from teams (project memory) — scoring views should reflect this

## Key Technical Decisions

- **Use `@mantine/notifications` for toasts:** Mantine's built-in notification system integrates cleanly with the existing MantineProvider. No need for a third-party library. Requires wrapping the app in `<Notifications />`.
- **Progressive disclosure via existing state, not new routing:** Draft.tsx already tracks phase via `started`/`finished`/prop bet booleans. Collapse sections based on these rather than introducing a stepper or multi-page flow. Simpler, less risk.
- **Highlight current user in scoring tables with row styling, not a separate view:** Adding a CSS class to rows matching `slimUser.uid` keeps the shared leaderboard intact while making "your" rows stand out.
- **Add legends inline above tables, not in a separate help page:** Small Badge-based legends above scoring tables are discoverable and contextual.

## Open Questions

### Resolved During Planning

- **How to add notifications?** Install `@mantine/notifications`, add `<Notifications />` to `AppRoutes.tsx`, use `notifications.show()` in submit handlers.
- **How to highlight current user?** Add a `data-current-user` attribute or background color to Table.Tr rows where participant uid matches `slimUser.uid`.

### Deferred to Implementation

- **Exact notification positioning and duration:** Mantine defaults (top-right, 5s) are likely fine but may need tweaking after seeing them in context.
- **Which draft sections to collapse vs hide:** The exact UX of collapsed sections (accordion vs completely hidden) should be decided during implementation when the visual impact is visible.

## Implementation Units

- [ ] **Unit 1: Install @mantine/notifications and wire up provider**

  **Goal:** Enable toast notifications app-wide.

  **Requirements:** R1

  **Dependencies:** None

  **Files:**
  - Modify: `package.json`
  - Modify: `src/AppRoutes.tsx`

  **Approach:**
  - `yarn add @mantine/notifications`
  - Import `Notifications` component and `@mantine/notifications/styles.css` in AppRoutes.tsx
  - Add `<Notifications />` inside `<MantineProvider>`

  **Patterns to follow:**
  - Existing Mantine provider pattern in AppRoutes.tsx (MantineProvider > QueryClientProvider > Router > ModalsProvider)

  **Verification:**
  - `notifications.show({ title: 'Test', message: 'Works' })` displays a toast when called from any component

- [ ] **Unit 2: Add toast feedback to all form submissions**

  **Goal:** Every create/update/delete operation shows a success or error toast.

  **Requirements:** R1

  **Dependencies:** Unit 1

  **Files:**
  - Modify: `src/components/Episodes/CreateEpisode.tsx`
  - Modify: `src/components/Episodes/EpisodeCRUDTable.tsx`
  - Modify: `src/components/GameEvents/CreateGameEvent.tsx`
  - Modify: `src/components/Challenges/CreateChallenge.tsx`
  - Modify: `src/components/Eliminations/CreateElimination.tsx`
  - Modify: `src/components/Teams/CreateTeam.tsx`
  - Modify: `src/components/Teams/TeamCRUDTable.tsx`
  - Modify: `src/components/Teams/TeamPlayerManager.tsx`
  - Modify: `src/pages/Draft.tsx` (draft pick, prop bet submission, competition creation)

  **Approach:**
  - Wrap each `setDoc`/`updateDoc`/`set` call in try/catch
  - On success: `notifications.show({ title: 'Episode created', color: 'green', icon: <IconCheck /> })`
  - On error: `notifications.show({ title: 'Failed to save', message: error.message, color: 'red', icon: <IconX /> })`
  - Remove the Alert-based `useUploadFeedback` in Admin.tsx in favor of notifications for consistency

  **Patterns to follow:**
  - Admin.tsx `useUploadFeedback` pattern for try/catch structure (but replace Alert with notification)

  **Test scenarios:**
  - Happy path: Submitting a new episode shows a green success toast
  - Error path: Firestore write failure shows a red error toast with the error message
  - Happy path: Deleting a team shows a success toast after confirmation modal

  **Verification:**
  - Every form submission across the admin shows visual feedback
  - No operations silently succeed or fail

- [ ] **Unit 3: Fix Navbar to use React Router Links**

  **Goal:** Navigation uses client-side routing, no full page reloads.

  **Requirements:** R6

  **Dependencies:** None

  **Files:**
  - Modify: `src/components/Navbar/Navbar.tsx`
  - Modify: `src/components/Navbar/Navbar.module.css`

  **Approach:**
  - Replace `<a href={item.link}>` with `<Link to={item.link}>` from react-router-dom
  - Apply the same `classes.link` styling via `className`
  - Keep `<button>` for Login/Logout (already fixed in audit)

  **Patterns to follow:**
  - React Router `<Link>` usage already present in other components (e.g., `useNavigate` in Seasons.tsx)

  **Test scenarios:**
  - Happy path: Clicking a nav link navigates without full page reload
  - Happy path: Active state (`data-active`) still highlights the correct link

  **Verification:**
  - No `<a href>` tags remain in Navbar.tsx (except external links)
  - Navigation between pages is instant (no white flash from page reload)

- [ ] **Unit 4: Highlight current user in scoring tables**

  **Goal:** The logged-in user's row stands out in scoring tables so they can instantly see their ranking.

  **Requirements:** R2

  **Dependencies:** None

  **Files:**
  - Modify: `src/components/ScoringTables/PerUserPerEpisodeScoringTable.tsx`

  **Approach:**
  - Pass `slimUser.uid` to the table component (or use `useUser` inside it)
  - Add a distinct background color (e.g., `var(--mantine-color-blue-light)`) to the row where `participant.uid === slimUser.uid`
  - Add a subtle left border or bold text for additional emphasis

  **Patterns to follow:**
  - Existing row styling in PerSurvivorPerEpisodeDetailedScoringTable (green for winner, gray for eliminated)

  **Test scenarios:**
  - Happy path: Current user's row has a distinct background in the scoring table
  - Edge case: User who is not a participant sees no highlighted row

  **Verification:**
  - Opening a competition immediately shows which row is "you"

- [ ] **Unit 5: Add scoring legends above tables**

  **Goal:** Color-coded badges and row colors in scoring tables have a visible legend so users understand what they mean.

  **Requirements:** R4

  **Dependencies:** None

  **Files:**
  - Modify: `src/components/ScoringTables/PerSurvivorPerEpisodeDetailedScoringTable.tsx`
  - Modify: `src/pages/SingleCompetition.tsx`

  **Approach:**
  - Add a small inline legend above the detailed scoring table using Mantine `Group` + `Badge` components
  - Legend items: green background = winner, gray background = eliminated, red badge = elimination points, dark badge = event points
  - Keep it compact — one line of small badges

  **Patterns to follow:**
  - Badge usage already present in the scoring tables for actions

  **Test scenarios:**
  - Happy path: Legend renders above the detailed scoring table with all color meanings
  - Happy path: Legend badges match the actual badge colors used in table rows

  **Verification:**
  - A new user can look at the legend and understand what the colors mean without hovering

- [ ] **Unit 6: Progressive disclosure on Draft page**

  **Goal:** The draft page shows only the current phase, reducing cognitive load during draft night.

  **Requirements:** R3

  **Dependencies:** None

  **Files:**
  - Modify: `src/pages/Draft.tsx`

  **Approach:**
  - Use `draft.started`, `draft.finished`, and `userHasSubmittedPropBets` to determine the current phase
  - **Pre-draft (not started):** Show join controls, participant list, and start button only
  - **Active draft:** Show current pick info prominently, player grid, and draft picks table. Hide join controls.
  - **Post-draft (prop bets):** Show prop bet form prominently. Collapse/hide the player grid and draft table into an expandable section.
  - **Completed:** Show competition link/scoring redirect. Show draft results and prop bets as reference.
  - Use Mantine `Collapse` or simple conditional rendering for section visibility

  **Patterns to follow:**
  - The existing conditional blocks in Draft.tsx already partially do this (e.g., prop bets form only shows when draft is finished)

  **Test scenarios:**
  - Happy path: Before draft starts, only join controls and participant list are visible
  - Happy path: During active draft, current pick is the most prominent element
  - Happy path: After draft ends, prop bet form is front and center
  - Edge case: User refreshes mid-draft and sees the correct phase

  **Verification:**
  - At each draft phase, the primary action is immediately visible without scrolling
  - No duplicate breadcrumbs visible

- [ ] **Unit 7: Add instructional text to drag-and-drop and prop bets**

  **Goal:** Complex interactions have contextual guidance for first-time users.

  **Requirements:** R4

  **Dependencies:** None

  **Files:**
  - Modify: `src/components/Teams/TeamPlayerManager.tsx`
  - Modify: `src/pages/Draft.tsx` (prop bets section)

  **Approach:**
  - Add a `Text` element above the drag-and-drop columns: "Drag players between columns to assign them to teams. Save when done."
  - Add a brief description above the prop bets form: "Predict what will happen this season. Points are awarded for correct answers."
  - Keep text concise — one line, `c="dimmed"`, `size="sm"`

  **Patterns to follow:**
  - Existing helper text in Seasons.tsx: `<Title order={3} c="dimmed">`

  **Test scenarios:**
  - Happy path: Instructional text is visible above the drag-and-drop interface
  - Happy path: Prop bets section has a brief explanation of what prop bets are

  **Verification:**
  - A first-time user can understand how to use drag-and-drop and prop bets without external help

- [ ] **Unit 8: Normalize heading hierarchy and spacing**

  **Goal:** Consistent visual hierarchy across all pages.

  **Requirements:** R5

  **Dependencies:** None

  **Files:**
  - Modify: `src/pages/SingleSeason.tsx`
  - Modify: `src/pages/SingleCompetition.tsx`
  - Modify: `src/pages/Competitions.tsx`
  - Modify: `src/pages/Seasons.tsx`
  - Modify: `src/AppRoutes.module.css`

  **Approach:**
  - Establish convention: page title = `order={2}`, section title = `order={3}`, subsection = `order={4}`
  - Fix `SingleSeason.tsx` where `<Title>` has no order (defaults to h1)
  - Reduce `margin-bottom: rem(144px)` on mobile in AppRoutes.module.css to `rem(72px)` (matching desktop)
  - Standardize spacing between sections: use `mb="xl"` for major sections, `mb="md"` for subsections

  **Patterns to follow:**
  - SeasonAdmin.tsx already uses consistent `order={4}` for card section titles

  **Test scenarios:**
  - Happy path: All page titles use `order={2}`, section titles use `order={3}`
  - Happy path: Mobile bottom margin is reasonable (no excessive whitespace)

  **Verification:**
  - Visual scan of heading sizes across pages shows consistent hierarchy
  - No `<Title>` without an explicit `order` prop

## System-Wide Impact

- **Notification provider:** Adding `<Notifications />` to AppRoutes.tsx is a one-time global change that enables toasts everywhere
- **Navbar routing change:** Affects all page transitions — must verify active states still work with `<Link>` instead of `<a>`
- **Draft page restructuring:** Most complex change — must preserve all existing state management logic while reorganizing the visual layout
- **Scoring table changes:** Row highlighting and legends are additive — no existing behavior changes

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `@mantine/notifications` version mismatch with existing Mantine 7.8.0 | Install matching version `@mantine/notifications@^7.8.0` |
| Draft page restructuring breaks state management | Only change rendering logic, not state/hooks. Test each phase transition. |
| React Router `<Link>` styling differs from `<a>` tag | Apply same CSS classes and verify hover/active states |

## Sources & References

- **Origin document:** [docs/audit-2026-03-29.md](docs/audit-2026-03-29.md)
- **Design context:** [.impeccable.md](.impeccable.md)
- Related patterns: `src/pages/Admin.tsx` (useUploadFeedback), `src/components/ScoringTables/`
- Mantine notifications docs: https://mantine.dev/x/notifications/
