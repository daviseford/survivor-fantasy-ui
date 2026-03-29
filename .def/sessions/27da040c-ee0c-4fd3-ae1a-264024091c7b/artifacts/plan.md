# Plan

**Topic:** I want to have the ability to add players to teams. There are often two to three teams in play in Survivor, and later in the season there are no teams. I think a drag-and-drop interface would be best. I'd like to have an admin panel to manage teams. I should be able to create teams. I should have a CRUD panel for teams and then a drag-and-drop interface to move players from team to team. Keep in mind there needs to be a 'no team' option for when the tribes emerge. I'd like the ability for events, challenges, et cetera to be able to select a winning team, which would automatically give the correct points to each player on that team.

## Decisions

- Store tribes in a separate Firestore doc per season (tribes/{seasonId}) matching the challenges/eliminations/events pattern
- Tribe assignments are episode-scoped -- a player's tribe can change per episode (swaps, merge, etc)
- Use @dnd-kit/core + @dnd-kit/sortable for drag-and-drop (modern, well-maintained, React 18 compatible)
- Add a 'winning_tribe' optional field to Challenge rather than creating a new entity
- Add a Tribes tab to the existing SeasonAdmin page following the established tab pattern
- Keep `Challenge.winning_players` as the scoring source of truth and derive it from team membership at admin write time
- Add a new season-scoped team assignments document, but model assignments as episode snapshots rather than open-ended effective ranges
- Add a `teams` tab to `SeasonAdmin` instead of a separate admin route
- Episode snapshot model wins over effective-range transitions -- simpler admin UX, no resolution logic
- No Team is null, not a synthetic team record
- winning_players remains the scoring source of truth, populated at write time from team membership
- winning_team_id is optional audit metadata on Challenge
- Teams tab in SeasonAdmin, not a separate route
- Use @dnd-kit/core + @dnd-kit/sortable for drag-and-drop
- Team color is a free-form ColorInput (hex) -- admins know Survivor tribe colors
- Teams are episode-scoped snapshots stored per season (teams/{seasonId} + team_assignments/{seasonId})
- Winning_team_id is optional metadata; scoring still relies on winning_players populated at write time
- No Team is represented as null and rendered as a dedicated column

## Discussion Summary

### Turn 1 (claude)

# Teams/Tribes Feature -- Implementation Plan

## 1. Data Model

### New Type: `Tribe`

```typescript
// src/types/index.ts

export type Tribe = {
  id: `tribe_${string}`;
  season_id: Season["id"];
  season_num: number;
  name: string;        // e.g. "Luvu", "Yase"
  color: string;       // hex color for UI display
};

export type TribeAssignment = {
  id: `tribe_assignment_${string}`;
  season_id: Season["id"];
  tribe_id: Tribe["id"] | null;  // null = no tribe (post-merge or unassigned)
  player_name: string;
  effective_episode: number;      // assignment takes effect from this episode onward
};
```

**Why episode-scoped assignments instead of a flat player-to-tribe map:**
In Survivor, tribe swaps happen mid-season (sometimes multiple times). A player might be on Luvu in episodes 1-4, swapped to Yase in episodes 5-8, then merged (no tribe) from episode 9 onward. The `effective_episode` pattern means you only store the *transitions* -- a player stays on their tribe until a new assignment overrides it. This is simpler than storing a full matrix of player x episode.

### Storage: `tribes/{seasonId}` and `tribe_assignments/{seasonId}`

Following the existing pattern where `challenges/{seasonId}`, `eliminations/{seasonId}`, and `events/{seasonId}` each store a `Record<id, entity>` in a single Firestore document per season:

- **`tribes/{seasonId}`** -- `Record<Tribe["id"], Tribe>` -- the tribe definitions
- **`tribe_assignments/{seasonId}`** -- `Record<TribeAssignment["id"], TribeAssignment>` -- which player is on which tribe as of which episode

This is consistent with how `useChallenges` at `src/hooks/useChallenges.ts:27-45` works -- single doc, `onSnapshot`, `Record<id, entity>`.

### Extending Challenge for Team Wins

```typescript
// Add to existing Challenge type in src/types/index.ts
export type Challenge<PlayerNames = string, SeasonNumber = number> = {
  // ... existing fields ...
  winning_tribe_id?: Tribe["id"] | null;  // NEW: optional tribe winner
};
```

*[Truncated]*

### Turn 2 (codex)

# Team Feature Plan Review

Claude's plan is close, but I would push back on one core assumption: `effective_episode` range-based assignments are not the best primary storage model for this codebase.

## What the repo actually supports today

- `SeasonAdmin` is a single tabbed admin surface, so adding a `Teams` tab is the least disruptive extension point at [src/pages/SeasonAdmin.tsx:17](src/pages/SeasonAdmin.tsx#L17) through [src/pages/SeasonAdmin.tsx:90](src/pages/SeasonAdmin.tsx#L90).
- Scoring only reads `Challenge.winning_players`; there is no team concept anywhere in scoring. The key path is [src/utils/scoringUtils.ts:18](src/utils/scoringUtils.ts#L18) through [src/utils/scoringUtils.ts:48](src/utils/scoringUtils.ts#L48), and that is wired into the rest of the app via [src/hooks/useScoringCalculations.ts:14](src/hooks/useScoringCalculations.ts#L14) through [src/hooks/useScoringCalculations.ts:44](src/hooks/useScoringCalculations.ts#L44).
- `CreateChallenge` already builds and persists the full winner list in one place, which makes it the correct integration point for auto-populating team winners instead of teaching scoring about teams. See [src/components/Challenges/CreateChallenge.tsx:33](src/components/Challenges/CreateChallenge.tsx#L33) through [src/components/Challenges/CreateChallenge.tsx:100](src/components/Challenges/CreateChallenge.tsx#L100).
- The existing CRUD pattern is lightweight Firestore document writes per season for challenges/events/eliminations, so a separate `teams/{seasonId}` style document is consistent with [src/hooks/useChallenges.ts:24](src/hooks/useChallenges.ts#L24) through [src/hooks/useChallenges.ts:38](src/hooks/useChallenges.ts#L38).

## Where I disagree with Claude

### 1. Use episode snapshots, not effective ranges

If the admin UI is "drag players between team columns for episode N", the storage should reflect exactly that action.

Claude proposed transition records like:

- player X moves to tribe Y starting episode 5

That i

*[Truncated]*

### Turn 3 (claude)

# Turn 3 -- Accepting Snapshot Model, Finalizing Plan

Codex is right on the snapshot model. I concede.

## Why snapshots win

After re-reading the codebase, every Firestore pattern here is "one document, `Record<id, entity>`" with simple key lookups. The effective-range model I proposed would be the only place in the app that requires temporal resolution logic (find the latest assignment where `effective_episode <= N`). That is conceptual overhead this codebase does not need.

The snapshot model -- `Record<episodeNum, Record<playerName, teamId | null>>` -- maps 1:1 to the admin action: pick an episode, drag players into columns, save. No resolution, no sorting, no edge cases from overlapping ranges.

## Agreed Decisions

All of Codex's pushbacks land. Here is the locked plan:

### Data Model

In `src/types/index.ts`:

```typescript
export type Team = {
  id: `team_${string}`;
  season_id: Season["id"];
  season_num: number;
  name: string;
  color: string;       // hex, e.g. "#3B82F6"
};

// Stored in team_assignments/{seasonId}
// Key is episode number (as string, since Firestore keys are strings)
// Value is a map of player name -> team ID or null
export type TeamAssignmentSnapshot = Record<string, Team["id"] | null>;
export type TeamAssignments = Record<string, TeamAssignmentSnapshot>;
```

Extend `Challenge`:

```typescript
export type Challenge<PlayerNames = string, SeasonNumber = number> = {
  // ... existing fields unchanged ...
  winning_team_id?: Team["id"] | null;  // optional audit/display field
};
```

Firestore documents:
- `teams/{seasonId}` -- `Record<Team["id"], Team>`
- `team_assignments/{seasonId}` -- `Record<episodeNumString, Record<playerName, Team["id"] | null>>`

### Hooks

**`src/hooks/useTeams.ts`** -- mirrors `useChallenges` at `src/hooks/useChallenges.ts:27-45`:
```typescript
export const useTeams = (seasonId?: Season["id"]) => {
  const [data, setData] = useState<Record<Team["id"], Team>>({});
  // onSnapshot on doc(db, "teams", seasonId)

*[Truncated]*

### Turn 4 (codex)

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
