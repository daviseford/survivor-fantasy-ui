---
name: impeccable-audit
description: Full-app visual audit using Playwright screenshots and impeccable design commands. Captures every page in light/dark mode at desktop/mobile viewports, then runs audit, critique, polish, and other impeccable passes to improve the UI.
user-invocable: true
---

# Impeccable Audit: Full-App Design Sweep

Automated design audit and improvement loop. Uses Playwright to screenshot every page (light & dark, desktop & mobile), then runs impeccable commands against each screenshot to identify and fix design issues.

**This skill uses subagents heavily to parallelize work. Read the subagent instructions carefully.**

## Prerequisites

- Dev server running at `http://localhost:5173` (or it will auto-start via `yarn dev`)
- `.env` file with `USERNAME` and `PASSWORD` for admin auth
- Playwright installed (`yarn playwright install chromium`)
- The `impeccable` plugin must be installed

## Technical Notes

- **Firebase Auth persistence**: The app uses `browserLocalPersistence` (localStorage) instead of the default IndexedDB so that Playwright's `storageState` can capture auth tokens. Do not change this back to `getAuth()` or IndexedDB persistence — it will break E2E auth.
- **Network idle**: Firebase `onSnapshot` listeners keep WebSocket connections open forever. E2E specs use `domcontentloaded` + a 3s settle wait instead of `networkidle`. Never use `waitForLoadState("networkidle")` in this project's E2E tests.
- **Screenshot naming**: `audit-{route-name}-{viewport}-{colorScheme}.png` (e.g., `audit-home-desktop-light.png`)

## Execution

### Phase 1: Take Screenshots

Run the audit screenshot script:

```bash
yarn e2e:audit
```

This runs `e2e/audit-all.spec.ts` which:

1. Authenticates as admin using `.env` credentials (via the Playwright `setup` project)
2. Screenshots every route in the app in **light** and **dark** mode
3. Captures at **desktop** (1280x720) and **mobile** (375x812) viewports

Routes covered (defined in `e2e/helpers.ts`):

- `/` (home)
- `/seasons` (season list)
- `/seasons/season_50` (single season)
- `/competitions` (user competitions — requires auth)
- `/admin` (admin dashboard — requires admin)
- `/admin/season_50` (season admin — requires admin)

All routes render with full auth — admin pages show real data, not "Unauthorized."

### Phase 2 & 3: Audit + Critique (Parallel Subagents)

**Launch subagents in parallel** — one per page group. Each subagent reads the relevant screenshots AND source files, then performs both audit and critique analysis for its pages.

Launch **3 subagents simultaneously** using the Agent tool in a single message:

#### Subagent 1: Public pages (home, seasons, single-season)

- Read screenshots: `audit-home-desktop-light.png`, `audit-seasons-desktop-light.png`, `audit-single-season-desktop-light.png` (plus dark + mobile variants)
- Read source: `src/components/Home/Home.tsx`, `Home.module.css`, `src/pages/Seasons.tsx`, `src/pages/SingleSeason.tsx`, `src/pages/Players.tsx`
- Run both `/audit` and `/critique` analysis
- Return findings as a structured list with P0-P3 severity

#### Subagent 2: Auth pages (competitions)

- Read screenshots: `audit-competitions-desktop-light.png` (plus dark + mobile variants)
- Read source: `src/pages/Competitions.tsx`
- Run both `/audit` and `/critique` analysis
- Return findings as a structured list with P0-P3 severity

#### Subagent 3: Admin pages (admin dashboard, season admin)

- Read screenshots: `audit-admin-dashboard-desktop-light.png`, `audit-season-admin-desktop-light.png` (plus dark + mobile variants)
- Read source: `src/pages/Admin.tsx`, `src/pages/SeasonAdmin.tsx`
- Run both `/audit` and `/critique` analysis
- Return findings as a structured list with P0-P3 severity

**Also launch a 4th subagent in parallel** for shared components:

#### Subagent 4: Shared components

- Read source: `src/components/Navbar/Navbar.tsx`, `Navbar.module.css`, `src/components/Footer/Footer.tsx`, `Footer.module.css`, `src/theme.ts`, `src/AppRoutes.tsx`, `AppRoutes.module.css`
- Audit for: theming consistency, dark mode correctness, responsive design, a11y of shared chrome
- Return findings as a structured list with P0-P3 severity

Each subagent should report back:

1. A health score table (Accessibility, Performance, Theming, Responsive, Anti-Patterns — each 0-4)
2. Findings list with: `[P?] Issue name | Location (file:line) | Category | Fix suggestion | Impeccable command`
3. Positive findings worth preserving

### Phase 4: Triage & Prioritize

Merge findings from all 4 subagents. Deduplicate (same issue found by multiple agents). Compile into a single prioritized list:

- **P0** — Accessibility blockers, broken layouts, critical UX issues
- **P1** — Significant design inconsistencies, poor contrast, layout problems
- **P2** — Typography, spacing, color improvements
- **P3** — Polish, delight, animation opportunities

Present this list to the user and ask:

1. **Direction** — Energy vs. clean? Bolder vs. quieter?
2. **Scope** — All issues, P1+ only, or specific pages?
3. **Constraints** — Anything off-limits?

Default recommendation: fix P0 and P1 automatically, present P2 for approval.

### Phase 5: Fix (Parallel Where Possible)

Group approved fixes by file. **Fixes to independent files can be applied in parallel using subagents.** Fixes to the same file must be sequential.

For each approved finding, run the appropriate impeccable command:

| Issue Type              | Command                  |
| ----------------------- | ------------------------ |
| Design system alignment | `/normalize`             |
| Typography issues       | `/typeset`               |
| Layout/spacing problems | `/arrange`               |
| Unclear UX copy         | `/clarify`               |
| Too visually busy       | `/distill` or `/quieter` |
| Too bland/generic       | `/bolder` or `/colorize` |
| Missing responsiveness  | `/adapt`                 |
| Error handling gaps     | `/harden`                |
| Performance issues      | `/optimize`              |
| Final polish            | `/polish`                |

After all fixes are applied, run `yarn tsc` and `yarn lint` together to verify:

```bash
yarn tsc && yarn lint
```

### Phase 6: Re-screenshot & Compare (Parallel Reads)

After all fixes are applied:

1. Run `yarn e2e:audit` again to capture new screenshots
2. Read before and after screenshots — **use parallel Read calls** to load all screenshots at once
3. Present a before/after summary to the user

### Phase 7: Commit

If the user approves the changes, commit them following the project's conventional commits style.

## Important Rules

- **READ-ONLY screenshots** — Playwright tests only navigate and screenshot, never modify data
- **Never modify production season data** — the .env has real admin credentials
- **Fix incrementally** — apply one impeccable command at a time, verify builds between fixes
- **Respect dark mode** — when fixing styles, verify changes look correct in BOTH color schemes
- **Desktop-first screenshots for audit** — use desktop light screenshots as the primary audit input, but verify fixes against all viewport/scheme combinations
- **Ask before P2+ fixes** — only auto-fix P0 and P1; get user approval for lower-severity improvements
- **Focus on the component/page files** — when an impeccable command suggests changes, apply them to the relevant component in `src/components/` or `src/pages/`, not to global styles (unless the finding is truly global)
- **Maximize parallelism** — always launch independent subagents in a single message so they run concurrently. Never wait for one subagent to finish before launching another independent one.
