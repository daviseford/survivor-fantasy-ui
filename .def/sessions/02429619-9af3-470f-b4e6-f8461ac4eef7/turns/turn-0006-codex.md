---
id: turn-0006-codex
turn: 6
from: codex
timestamp: '2026-03-29T03:46:40.390Z'
status: decided
phase: review
duration_ms: 161571
model_tier: mid
model_name: gpt-5.4
verdict: fix
---
## Findings

1. `src/components/Charts/SurvivorPerEpisodeScoringChart.tsx:1` and `package.json:34` do not implement the agreed chart decision. The debate decision was to use shadcn Chart, but the implementation uses raw `recharts` primitives with a hardcoded palette and keeps `recharts` on `2.12.5`. That is a direct mismatch with decision 5. Fix by migrating this component to the shadcn chart pattern (`ChartContainer` and tokenized config), or explicitly reopen that decision if you want raw Recharts instead.

2. `src/components/Eliminations/CreateElimination.tsx:24` and `src/components/GameEvents/CreateGameEvent.tsx:22` do not follow the final form-scope decision. The agreed scope was RHF + zod for the four files that used `@mantine/form`; only `Draft` and `CreateChallenge` do that. These two files were downgraded to ad hoc `useState` forms with weaker validation (`if (!playerName) return`). Fix by converting both to `react-hook-form` + `zod`, consistent with `CreateChallenge` and the final debate decisions.

3. `src/components/AppSidebar.tsx:51`, `src/components/AppSidebar.tsx:80`, and `src/AppRoutes.tsx:42` use raw `<a href>` for internal navigation inside a `react-router-dom` SPA shell. That forces full document reloads and is a regression in routing behavior. Fix by using `Link` or `NavLink` from `react-router-dom` with the shadcn sidebar buttons.

## Decision Fidelity

Not all decisions were faithfully implemented.

- Implemented: full Mantine package removal, Tailwind v4 foundation, global sidebar shell, Dialog-based auth modal, lucide icons, and data layer preservation.
- Not implemented: decision 5 (shadcn Chart) and decision 20 (RHF + zod in all four former `@mantine/form` files).
- Not verifiable from source alone: decision 21 about using the shadcn MCP workflow during implementation.

## Conventions

Project cleanup looks mostly good. I found no remaining Mantine or Tabler references in `src/` or `package.json`. The main convention issue is the routing regression from using plain anchors instead of router links.
