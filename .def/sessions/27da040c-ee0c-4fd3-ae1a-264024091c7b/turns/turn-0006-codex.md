---
id: turn-0006-codex
turn: 6
from: codex
timestamp: '2026-03-29T21:05:23.652Z'
status: decided
phase: review
duration_ms: 47309
model_tier: mid
model_name: gpt-5.4
verdict: fix
---
## Findings

1. `src/components/Teams/TeamCRUDTable.tsx` does not implement CRUD. It only supports delete, while `src/components/Teams/CreateTeam.tsx` covers create. There is no update/edit path for team name or color, so the agreed "CRUD panel for teams" was not actually delivered. Add edit support in the table or a modal, following the existing admin CRUD pattern.

2. `src/components/Challenges/CreateChallenge.tsx` can leave `winning_players` in an invalid stale state. `handleWinningTeamChange()` clears `winning_team_id` when the select is cleared, but it does not clear or recompute `winning_players`. It also leaves prior winners intact if the selected team has no players in the current episode snapshot. That breaks the "derive winners from team membership at admin write time" rule and can save incorrect scoring data. Fix by explicitly syncing `winning_players` on every winning-team change:
   - clear winners when the team is cleared
   - replace winners with the selected team's current episode members, even if that result is empty
   - disable or hide the winning-team select when no assignment snapshot exists for the selected episode

3. `src/components/Teams/TeamCRUDTable.tsx` allows deleting a team that is still referenced by saved episode snapshots and challenges. Historical assignments in `team_assignments/{seasonId}` will still point at the deleted id, and `TeamPlayerManager` will silently render those players under "No Team" because the container no longer exists. That corrupts historical meaning and leaves dangling `winning_team_id` metadata on challenges. Deletion needs referential handling: either block deletion when the team is referenced, or cascade-update snapshots/challenges in a defined way.

4. The diff includes unrelated formatting/noise changes outside the feature scope: `README.md`, `docs/new-season-setup.md`, `src/data/season_50/index.ts`, and `src/pages/Seasons.tsx`. These are not part of the team-management feature and should be dropped from the change set to keep the implementation focused and easier to review.

## Decision Check

Most of the architecture decisions were implemented correctly:
- separate season-scoped `teams/{seasonId}` and `team_assignments/{seasonId}` docs
- episode snapshot assignments
- `@dnd-kit/core` + `@dnd-kit/sortable`
- `Teams` tab inside `SeasonAdmin`
- `No Team` represented as `null`
- `winning_players` remains the scoring source of truth
- optional `winning_team_id` metadata on `Challenge`

The main gaps are functional completeness of CRUD and data integrity around winning-team sync and team deletion.
