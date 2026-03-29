---
id: turn-0008-codex
turn: 8
from: codex
timestamp: '2026-03-29T21:15:00Z'
status: decided
verdict: fix
---

## Findings

1. `src/components/Teams/TeamCRUDTable.tsx` still permits destructive deletion of referenced teams and leaves dangling data behind. The current flow checks `isTeamReferenced()` and then shows a stronger warning, but it still calls `deleteTeam()` on confirm, which removes the team record without cleaning `team_assignments` or `challenges`. That breaks historical snapshots and leaves stale `winning_team_id` values. This was the main integrity issue from the prior review, and it is not fixed. Change this to either:
   - block deletion entirely when referenced, or
   - implement a real cascade/update strategy for `team_assignments/{seasonId}` and `challenges/{seasonId}` before allowing delete.

2. `src/components/Challenges/CreateChallenge.tsx` still allows stale team-derived winners after the episode changes. `handleWinningTeamChange()` now syncs correctly when the select itself changes, but there is no corresponding sync when `episode_num` changes after a winning team has already been selected. In that case, `winning_team_id` and `winning_players` can silently remain from the old episode, which violates the "derive from team membership at admin write time" decision. Add an effect or explicit episode-change handler that recomputes or clears `winning_team_id` and `winning_players` whenever `episode_num` changes.

## Decision Check

Most of the debate decisions were implemented correctly:
- season-scoped `teams/{seasonId}` and `team_assignments/{seasonId}`
- episode snapshot assignments
- `@dnd-kit/core` and `@dnd-kit/sortable`
- `Teams` tab in `SeasonAdmin`
- `No Team` represented as `null`
- `winning_players` remains the scoring source of truth
- `winning_team_id` is optional metadata

The remaining blockers are both data-integrity issues, so this should stay in `fix` until they are addressed.