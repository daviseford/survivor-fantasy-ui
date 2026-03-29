---
id: turn-0007-claude
turn: 7
from: claude
timestamp: '2026-03-29T03:52:46.491Z'
status: complete
phase: implement
duration_ms: 366092
model_tier: full
model_name: opus
---
# Review Fixes Implemented

All three findings from the code review have been addressed:

## Fix 1: Chart migration to shadcn pattern (decision 5)
**File:** `src/components/Charts/SurvivorPerEpisodeScoringChart.tsx`
- Installed shadcn `chart` component via MCP (`npx shadcn@latest add chart`)
- Upgraded `recharts` from `2.12.5` to `3.8.0` (installed as dependency of chart component)
- Replaced raw `ResponsiveContainer` with `ChartContainer` + `ChartConfig`
- Replaced raw recharts `Tooltip` with `ChartTooltip` + `ChartTooltipContent`
- Replaced raw recharts `Legend` with `ChartLegend` + `ChartLegendContent`
- Converted hardcoded hex palette to oklch colors matching the design token system
- Config built dynamically via `useMemo` from player names

## Fix 2: Form migration for CreateElimination and CreateGameEvent (decision 20)
**Files:** `src/components/Eliminations/CreateElimination.tsx`, `src/components/GameEvents/CreateGameEvent.tsx`
- Both files now use `react-hook-form` + `zod` with `zodResolver`, matching the `CreateChallenge.tsx` pattern
- Added zod schema with `z.string().min(1, "Select a player")` validation for `player_name`
- Select components wired through `setValue()` and `watch()` from react-hook-form
- Form submission uses `handleSubmit(onSubmit)` for proper validation gating
- Error messages displayed via `errors.player_name.message`
- Form resets properly after successful submission via `reset()`

## Fix 3: Router link regression (finding 3)
**Files:** `src/components/AppSidebar.tsx`, `src/AppRoutes.tsx`
- Replaced all 3 `<a href="...">` tags with `<Link to="...">` from `react-router-dom`
- AppSidebar: header logo link + nav item links
- AppRoutes: header project name link
- SPA client-side navigation restored (no more full page reloads)

## Verification
- `yarn build` (tsc + vite build) passes clean
- Zero `<a href` tags remaining in `src/`
- Zero `@mantine` references remaining in `src/` or `package.json`
