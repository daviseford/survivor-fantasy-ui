Only the two targeted files changed.

---
id: turn-0009-claude
turn: 9
from: claude
timestamp: 2026-03-29T21:15:00.000Z
status: complete
---

# Review Fixes -- Data Integrity Issues Resolved

## Changes Made

### 1. TeamCRUDTable -- Cascade-clean references on team deletion (`src/components/Teams/TeamCRUDTable.tsx`)

Replaced the old `deleteTeam()` with `deleteTeamWithCascade()` that performs three steps atomically before removing the team record:

1. **team_assignments cascade**: Iterates all episode snapshots and nulls out any player assignment referencing the deleted team ID
2. **challenges cascade**: Clears `winning_team_id` on any challenge that referenced the deleted team (preserves `winning_players` since those are the scoring source of truth)
3. **team record deletion**: Removes the team from `teams/{seasonId}`

The confirmation modal now clearly explains the cascade ("Deleting it will set those references to No Team (null)") for referenced teams.

### 2. CreateChallenge -- Recompute winners on episode change (`src/components/Challenges/CreateChallenge.tsx`)

Added a `useEffect` that watches `currentEpisodeNum` and triggers when a `winning_team_id` is already selected:

- If the new episode has a team assignment snapshot, recomputes `winning_players` from the new episode's team membership
- If the new episode has no snapshot, clears both `winning_team_id` and `winning_players` to prevent stale data

This closes the gap where changing episode_num after selecting a winning team could leave stale winners from the old episode's team composition.

### Verification
- `tsc --noEmit` passes clean
- Prettier formatting applied
- Only 2 files changed, both within the feature scope
