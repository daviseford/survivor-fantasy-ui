---
id: turn-0003-claude
turn: 3
from: claude
timestamp: "2026-03-29T21:10:45.000Z"
status: decided
decisions:
  - "Episode snapshot model wins over effective-range transitions -- simpler admin UX, no resolution logic"
  - "No Team is null, not a synthetic team record"
  - "winning_players remains the scoring source of truth, populated at write time from team membership"
  - "winning_team_id is optional audit metadata on Challenge"
  - "Teams tab in SeasonAdmin, not a separate route"
  - "Use @dnd-kit/core + @dnd-kit/sortable for drag-and-drop"
  - "Team color is a free-form ColorInput (hex) -- admins know Survivor tribe colors"
---

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
  return { data };
};
```

**`src/hooks/useTeamAssignments.ts`** -- same pattern:
```typescript
export const useTeamAssignments = (seasonId?: Season["id"]) => {
  const [data, setData] = useState<TeamAssignments>({});
  // onSnapshot on doc(db, "team_assignments", seasonId)
  return { data };
};
```

### Utility Functions

**`src/utils/teamUtils.ts`** -- lightweight helpers, not temporal resolution:

```typescript
export const getPlayersOnTeam = (
  snapshot: TeamAssignmentSnapshot,
  teamId: Team["id"],
): string[] =>
  Object.entries(snapshot)
    .filter(([_, tid]) => tid === teamId)
    .map(([name]) => name);

export const getUnassignedPlayers = (
  snapshot: TeamAssignmentSnapshot,
): string[] =>
  Object.entries(snapshot)
    .filter(([_, tid]) => tid === null)
    .map(([name]) => name);
```

### Admin UI Components

```
src/components/Teams/
  CreateTeam.tsx           -- name + ColorInput form
  TeamCRUDTable.tsx        -- table with name, color swatch, delete
  TeamPlayerManager.tsx    -- DnD episode-scoped assignment UI
  index.ts                 -- barrel export
```

**CreateTeam.tsx** follows `CreateChallenge` pattern:
- `useForm` from `@mantine/form`
- Fields: name (TextInput), color (ColorInput)
- Writes to `teams/{seasonId}` with `setDoc(..., { merge: true })`

**TeamCRUDTable.tsx** follows `ChallengeCRUDTable` pattern at `src/components/Challenges/ChallengeCRUDTable.tsx`:
- Table with columns: Name, Color (swatch), Delete
- Inline edit for name/color would be nice but not required for v1
- Delete via `modals.openConfirmModal` like existing CRUD tables

**TeamPlayerManager.tsx** -- the main DnD surface:
- Episode selector (NumberInput or Select from season episodes)
- One droppable column per team + one fixed "No Team" column
- Draggable player cards (name + optional avatar)
- "Copy from previous episode" button -- loads snapshot from `episodeNum - 1` as starting state
- "Save" button writes the entire snapshot for that episode to `team_assignments/{seasonId}`
- When the selected episode has `merge_occurs: true` or `post_merge: true`, show a hint/button to move all players to No Team

### SeasonAdmin Integration

Add a fifth tab to `src/pages/SeasonAdmin.tsx:28-55`:

```tsx
<Tabs.Tab value="teams" leftSection={<IconUsersGroup style={iconStyle} />}>
  Teams
</Tabs.Tab>

// ...

<Tabs.Panel value="teams" pt={"lg"}>
  <Stack gap={"xl"}>
    <CreateTeam />
    <TeamCRUDTable />
    <TeamPlayerManager />
  </Stack>
</Tabs.Panel>
```

### Challenge Form Integration

In `src/components/Challenges/CreateChallenge.tsx`, above the existing `MultiSelect` for winning players at line 142:

1. Add a `Select` for "Winning Team" populated from `useTeams`
2. When a team is selected, look up the team assignment snapshot for `form.values.episode_num`
3. Auto-populate `winning_players` with `getPlayersOnTeam(snapshot, teamId)`
4. Store `winning_team_id` on the challenge
5. The admin can still manually adjust `winning_players` after auto-fill
6. If no teams exist or episode has no assignments, the select is disabled/hidden

The `winning_players` validation at line 46 (`hasLength({ min: 1 })`) stays unchanged -- the team selection is just a convenience for populating it.

### Scoring -- Zero Changes

`src/utils/scoringUtils.ts:44-47` continues to read `c.winning_players` only. `src/hooks/useScoringCalculations.ts` is untouched. The `winning_team_id` field is never read by scoring.

### New Dependency

```
yarn add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

No other new deps. `ColorInput` is already in `@mantine/core@^7.8.0` (confirmed in `package.json:21`).

### ChallengeCRUDTable Enhancement (Optional)

In `src/components/Challenges/ChallengeCRUDTable.tsx`, add a "Winning Team" column that displays the team name/color when `winning_team_id` is present. Low priority -- can be done in a follow-up.

## Implementation Order

1. Types in `src/types/index.ts` -- `Team`, `TeamAssignmentSnapshot`, `TeamAssignments`, extend `Challenge`
2. Hooks -- `useTeams.ts`, `useTeamAssignments.ts`
3. Utility -- `teamUtils.ts`
4. `CreateTeam.tsx` + `TeamCRUDTable.tsx` -- team CRUD
5. Wire Teams tab into `SeasonAdmin.tsx`
6. `TeamPlayerManager.tsx` -- DnD assignment UI (heaviest piece)
7. `CreateChallenge.tsx` -- add winning team selector

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useTeams.ts` | Firestore realtime hook for teams |
| `src/hooks/useTeamAssignments.ts` | Firestore realtime hook for team assignments |
| `src/utils/teamUtils.ts` | `getPlayersOnTeam`, `getUnassignedPlayers` |
| `src/components/Teams/CreateTeam.tsx` | Team creation form |
| `src/components/Teams/TeamCRUDTable.tsx` | Team list with delete |
| `src/components/Teams/TeamPlayerManager.tsx` | DnD assignment UI |
| `src/components/Teams/index.ts` | Barrel export |

## Files to Modify

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `Team`, `TeamAssignmentSnapshot`, `TeamAssignments`; extend `Challenge` with `winning_team_id` |
| `src/pages/SeasonAdmin.tsx` | Add Teams tab |
| `src/components/Challenges/CreateChallenge.tsx` | Add optional winning team selector |
| `package.json` | Add `@dnd-kit/*` |

## Open Questions -- Resolved

1. **Color picker vs palette** -- Free-form `ColorInput` (hex). Admins know Survivor tribe colors and may want exact matches. Mantine's `ColorInput` has built-in swatches we can pre-populate with common Survivor colors while still allowing custom hex.

2. **Tribe-based scoring beyond challenges** -- Out of scope for v1. The ask is "select a winning team, which gives correct points to each player." That is fully handled by auto-populating `winning_players` at write time. If tribe-specific scoring actions are needed later, that is a separate feature.

3. **Auto-move to No Team at merge** -- The UI will show a hint when `merge_occurs` is true on the selected episode. A "Move all to No Team" convenience button handles it in one click, but the admin still has to explicitly save. No silent auto-mutation.
