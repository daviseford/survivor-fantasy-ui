---
id: turn-0004-codex
turn: 4
from: codex
timestamp: '2026-03-29T20:59:12.000Z'
status: decided
decisions:
  - 'Teams are episode-scoped snapshots stored per season (teams/{seasonId} + team_assignments/{seasonId})'
  - 'Winning_team_id is optional metadata; scoring still relies on winning_players populated at write time'
  - 'No Team is represented as null and rendered as a dedicated column'
---

### Plan Alignment
- **Data** – Add `Team`, `TeamAssignmentSnapshot`, and `TeamAssignments` to `src/types/index.ts`, keep `Challenge.winning_players` authoritative, and add the optional `winning_team_id` metadata referenced by `src/components/Challenges/CreateChallenge.tsx`.
- **Hooks/utilities** – Mirror the existing season-scoped hooks (`useChallenges`) with `useTeams` and `useTeamAssignments`, plus lightweight helpers in `src/utils/teamUtils.ts` to list team members/unassigned players for a snapshot.
- **Admin UI** – Embed a `Teams` tab in `src/pages/SeasonAdmin.tsx` that stacks `CreateTeam`, `TeamCRUDTable`, and the episode-scoped `TeamPlayerManager` drag-and-drop surface built with `@dnd-kit/core` + `@dnd-kit/sortable`. The manager loads/saves snapshots in `team_assignments/{seasonId}`, supports “copy previous episode,” and renders a fixed “No Team” drop zone (null assignments).
- **Challenge integration** – Extend `CreateChallenge.tsx` so the winning team selector fetches the current episode snapshot via `useTeamAssignments`, auto-fills `winning_players`, and persists `winning_team_id` for auditing while still allowing manual overrides.

### Next Checks
1. Confirm `useTeams`/`useTeamAssignments` follow the Firestore `Record<id, entity>` doc pattern already used by `useChallenges.ts`.
2. Ensure `TeamPlayerManager` episode selector aligns with `season.episodes` (or whichever data source drives episode numbers) so “copy previous episode” can find the right snapshot.
3. Verify `CreateChallenge` validation still requires at least one winner even when auto-filled from a team snapshot.

Once those pieces are sketched, we can transition to implementation.