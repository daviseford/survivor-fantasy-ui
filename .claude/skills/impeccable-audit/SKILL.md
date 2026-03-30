---
name: impeccable-audit
description: Full-app visual audit using Playwright screenshots and impeccable design commands. Captures every page in light/dark mode at desktop/mobile viewports, then runs audit, critique, polish, and other impeccable passes to improve the UI.
user-invocable: true
---

# Impeccable Audit: Full-App Design Sweep

Automated design audit and improvement loop. Uses Playwright to screenshot every page (light & dark, desktop & mobile), then runs impeccable commands against each screenshot to identify and fix design issues.

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

### Phase 2: Audit (Diagnostic)

For each **desktop light** screenshot, run `/audit` to get a technical quality report covering:
- Accessibility issues
- Performance anti-patterns
- Theming inconsistencies
- Responsive design problems
- Component anti-patterns

Read each screenshot file using the Read tool, then invoke the `/audit` skill. Collect all findings.

### Phase 3: Critique (Design Review)

For each **desktop light** screenshot, run `/critique` to get a UX/design review covering:
- Visual hierarchy
- Information architecture
- Cognitive load
- Emotional resonance
- Overall design quality

Read each screenshot file using the Read tool, then invoke the `/critique` skill. Collect all findings.

### Phase 4: Triage & Prioritize

After Phases 2-3, compile all findings across all pages into a single prioritized list:
- **P0** — Accessibility blockers, broken layouts, critical UX issues
- **P1** — Significant design inconsistencies, poor contrast, layout problems
- **P2** — Typography, spacing, color improvements
- **P3** — Polish, delight, animation opportunities

Present this list to the user and ask:
1. **Direction** — Energy vs. clean? Bolder vs. quieter?
2. **Scope** — All issues, P1+ only, or specific pages?
3. **Constraints** — Anything off-limits?

Default recommendation: fix P0 and P1 automatically, present P2 for approval.

### Phase 5: Fix

For each approved finding, run the appropriate impeccable command to fix it:

| Issue Type | Command |
|---|---|
| Design system alignment | `/normalize` |
| Typography issues | `/typeset` |
| Layout/spacing problems | `/arrange` |
| Unclear UX copy | `/clarify` |
| Too visually busy | `/distill` or `/quieter` |
| Too bland/generic | `/bolder` or `/colorize` |
| Missing responsiveness | `/adapt` |
| Error handling gaps | `/harden` |
| Performance issues | `/optimize` |
| Final polish | `/polish` |

After each fix:
1. Run `yarn tsc` to verify no type errors
2. Run `yarn lint` to verify no lint errors

### Phase 6: Re-screenshot & Compare

After all fixes are applied:

1. Run `yarn e2e:audit` again to capture new screenshots
2. For each page that was modified, read the before and after screenshots
3. Present a before/after summary to the user

### Phase 7: Commit

If the user approves the changes, commit them with a message like:
```
style: improve UI based on impeccable audit
```

## Important Rules

- **READ-ONLY screenshots** — Playwright tests only navigate and screenshot, never modify data
- **Never modify production season data** — the .env has real admin credentials
- **Fix incrementally** — apply one impeccable command at a time, verify builds between fixes
- **Respect dark mode** — when fixing styles, verify changes look correct in BOTH color schemes
- **Desktop-first screenshots for audit** — use desktop light screenshots as the primary audit input, but verify fixes against all viewport/scheme combinations
- **Ask before P2+ fixes** — only auto-fix P0 and P1; get user approval for lower-severity improvements
- **Focus on the component/page files** — when an impeccable command suggests changes, apply them to the relevant component in `src/components/` or `src/pages/`, not to global styles (unless the finding is truly global)
