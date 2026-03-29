You are Codex, participating in a structured planning conversation with another AI agent (Claude).
You are collaborating on: I want to have the ability to add players to teams. There are often two to three teams in play in Survivor, and later in the season there are no teams. I think a drag-and-drop interface would be best. I'd like to have an admin panel to manage teams. I should be able to create teams. I should have a CRUD panel for teams and then a drag-and-drop interface to move players from team to team. Keep in mind there needs to be a 'no team' option for when the tribes emerge. I'd like the ability for events, challenges, et cetera to be able to select a winning team, which would automatically give the correct points to each player on that team.

## Rules
- Respond with YAML frontmatter followed by markdown. Required frontmatter fields: id, turn, from (must be "codex"), timestamp (ISO-8601), status (complete | needs_human | done | decided).
- Optional frontmatter: decisions (array of strings -- key decisions made in this turn).
- Be specific and concrete. Reference files, functions, and line numbers in the target repo when relevant.
- Challenge the other agent's assumptions. Don't just agree -- push for better solutions.
- You have read-only tool access (Read, Glob, Grep, git). You CANNOT modify files -- that happens in the implementation phase. Do not request human help because of this limitation. When the plan is ready to implement, set status: decided.
- If the plan is complete and BOTH agents have contributed, set status: done. Do NOT set done on your first turn -- the other agent must have a chance to respond.
- If you believe you and the other agent have reached consensus on all key decisions, set status: decided. The other agent will then confirm or contest.
- Always use status: complete unless the conversation is truly finished after multiple turns.
- Do NOT include anything before the opening --- of the frontmatter.
- Use ASCII-safe punctuation only. Use - or -- instead of em-dashes or en-dashes. Do not use Unicode special characters.
- Paths under `.def/` (sessions, worktrees, artifacts) and gitignored `docs/` directories are ephemeral session artifacts -- not authoritative project source. The canonical codebase is the tracked files in the working directory. When referencing code, use repo-relative paths, not absolute `.def/worktrees/...` paths.

## Session Brief
**Topic:** I want to have the ability to add players to teams. There are often two to three teams in play in Survivor, and later in the season there are no teams. I think a drag-and-drop interface would be best. I'd like to have an admin panel to manage teams. I should be able to create teams. I should have a CRUD panel for teams and then a drag-and-drop interface to move players from team to team. Keep in mind there needs to be a 'no team' option for when the tribes emerge. I'd like the ability for events, challenges, et cetera to be able to select a winning team, which would automatically give the correct points to each player on that team.
**Mode:** edit
**Phase:** plan


## Prior Turns
---
id: turn-0001-claude
turn: 1
from: claude
timestamp: '2026-03-29T20:54:36.123Z'
status: complete
phase: plan
duration_ms: 193363
decisions:
  - 'Store tribes in a separate Firestore doc per season (tribes/{seasonId}) matching the challenges/eliminations/events pattern'
  - 'Tribe assignments are episode-scoped -- a player''s tribe can change per episode (swaps, merge, etc)'
  - 'Use @dnd-kit/core + @dnd-kit/sortable for drag-and-drop (modern, well-maintained, React 18 compatible)'
  - Add a 'winning_tribe' optional field to Challenge rather than creating a new entity
  - Add a Tribes tab to the existing SeasonAdmin page following the established tab pattern
model_tier: full
model_name: opus
---
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

When `winning_tribe_id` is set on a challenge, the scoring engine resolves it to the players on that tribe at that episode, and `winning_players` gets populated automatically (or validated against). This gives the admin the choice: enter individual winners OR pick a winning tribe.

## 2. New Hooks

### `useTribes(seasonId?)` -- mirrors `useChallenges`

```
src/hooks/useTribes.ts
```
Pattern: `onSnapshot` on `doc(db, "tribes", seasonId)`, returns `Record<Tribe["id"], Tribe>`. Identical structure to `useChallenges` at `src/hooks/useChallenges.ts:27-45`.

### `useTribeAssignments(seasonId?)`

```
src/hooks/useTribeAssignments.ts
```
Same pattern. Returns `Record<TribeAssignment["id"], TribeAssignment>`.

### `usePlayerTribeAtEpisode(assignments, playerName, episodeNum)` -- utility

A pure function (not a hook, actually) that finds the latest `TribeAssignment` for a player where `effective_episode <= episodeNum`, sorted by `effective_episode` descending. Returns the `tribe_id` or `null`.

```typescript
// src/utils/tribeUtils.ts
export const getPlayerTribeAtEpisode = (
  assignments: TribeAssignment[],
  playerName: string,
  episodeNum: number,
): Tribe["id"] | null => {
  const playerAssignments = assignments
    .filter(a => a.player_name === playerName && a.effective_episode <= episodeNum)
    .sort((a, b) => b.effective_episode - a.effective_episode);
  return playerAssignments[0]?.tribe_id ?? null;
};

export const getPlayersOnTribe = (
  assignments: TribeAssignment[],
  tribeId: Tribe["id"],
  episodeNum: number,
  allPlayerNames: string[],
): string[] => {
  return allPlayerNames.filter(
    name => getPlayerTribeAtEpisode(assignments, name, episodeNum) === tribeId
  );
};
```

## 3. Scoring Integration

In `src/utils/scoringUtils.ts`, the `getEnhancedSurvivorPoints` function at line 18 processes challenges at line 44-48 by checking `c.winning_players.includes(playerName)`. Two options here:

**Option A (Recommended): Resolve tribe winners at write time.** When the admin selects a winning tribe on a challenge, the `CreateChallenge` form auto-populates `winning_players` with all players on that tribe at that episode. The scoring engine stays unchanged. This is simpler and keeps scoring pure.

**Option B: Resolve at scoring time.** Pass `tribeAssignments` into `getEnhancedSurvivorPoints` and resolve `winning_tribe_id` to players. This means the scoring function needs new parameters and the challenge data alone isn't self-contained.

I recommend **Option A** because it keeps the scoring engine untouched, makes challenge data self-documenting (you can always see who won), and avoids cascading changes through `useScoringCalculations.ts`.

## 4. Admin UI

### 4a. Tribes Tab in SeasonAdmin

Add a fifth tab to `src/pages/SeasonAdmin.tsx` (currently has Episodes, Events, Challenges, Eliminations at lines 28-54):

```
Tabs: Episodes | Events | Challenges | Eliminations | Tribes (NEW)
```

Icon: `IconUsersGroup` from `@tabler/icons-react`.

### 4b. Tribe CRUD Components

```
src/components/Tribes/
  CreateTribe.tsx        -- form: name + color picker
  TribeCRUDTable.tsx     -- table of tribes with delete
  TribePlayerManager.tsx -- drag-and-drop assignment UI
  index.ts
```

**CreateTribe.tsx** follows the pattern of `CreateChallenge` at `src/components/Challenges/CreateChallenge.tsx`:
- Form with `useForm` from `@mantine/form`
- Fields: tribe name (TextInput), color (ColorInput from Mantine)
- Writes to `tribes/{seasonId}` with `setDoc(..., { merge: true })`
- Payload preview via `<Code block>`

**TribeCRUDTable.tsx** -- simple table listing tribes with name, color swatch, and delete button.

### 4c. Drag-and-Drop Player Assignment (TribePlayerManager)

**Library: `@dnd-kit/core` + `@dnd-kit/sortable`**

Rationale:
- `react-beautiful-dnd` is deprecated (Atlassian stopped maintaining it)
- `@dnd-kit` is the modern standard, has excellent React 18 support, accessible by default, and handles the "multiple droppable containers" pattern well
- Mantine does not ship its own DnD

**UI Layout:**

```
[Episode Selector: NumberInput or Select]

+-------------+  +-------------+  +-------------+  +------------------+
|  Tribe Luvu  |  | Tribe Yase  |  | Tribe Vati  |  |    No Tribe      |
|  (blue)      |  |  (yellow)   |  |  (green)    |  |  (unassigned)    |
|              |  |             |  |             |  |                  |
|  [Player A]  |  |  [Player D] |  |  [Player G] |  |                  |
|  [Player B]  |  |  [Player E] |  |  [Player H] |  |                  |
|  [Player C]  |  |  [Player F] |  |  [Player I] |  |                  |
+-------------+  +-------------+  +-------------+  +------------------+

                    [Save Assignments]
```

- Each tribe is a **droppable container** (including "No Tribe")
- Each player card is a **draggable item**
- Episode selector at the top controls which episode's assignments you're viewing/editing
- "Save Assignments" writes `TribeAssignment` records for the selected episode
- **Copy from previous episode** button for convenience -- pre-populates from the prior episode's state so the admin only moves swapped players
- Player cards show avatar + name (using existing `Player.img` field)

### 4d. Challenge Form Enhancement

In `src/components/Challenges/CreateChallenge.tsx`, add an optional "Winning Tribe" select above the "Winning Players" multi-select. When a tribe is selected:

1. Auto-populate `winning_players` with all players on that tribe at the challenge's episode
2. Set `winning_tribe_id` on the challenge
3. The admin can still manually override `winning_players` if needed (e.g., a player sat out)

## 5. New Dependency

```
yarn add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

That is the only new dependency. Mantine's `ColorInput` is already available in `@mantine/core@^7.8.0`.

## 6. Files to Create

| File | Purpose |
|------|---------|
| `src/types/index.ts` | Add `Tribe`, `TribeAssignment` types; extend `Challenge` |
| `src/hooks/useTribes.ts` | Firestore hook for tribes |
| `src/hooks/useTribeAssignments.ts` | Firestore hook for tribe assignments |
| `src/utils/tribeUtils.ts` | `getPlayerTribeAtEpisode`, `getPlayersOnTribe` |
| `src/components/Tribes/CreateTribe.tsx` | Tribe CRUD form |
| `src/components/Tribes/TribeCRUDTable.tsx` | Tribe list table |
| `src/components/Tribes/TribePlayerManager.tsx` | DnD assignment UI |
| `src/components/Tribes/index.ts` | Barrel export |

## 7. Files to Modify

| File | Change |
|------|--------|
| `src/pages/SeasonAdmin.tsx` | Add Tribes tab (line 28+) |
| `src/components/Challenges/CreateChallenge.tsx` | Add optional winning tribe selector |
| `src/types/index.ts` | New types + Challenge extension |
| `package.json` | Add `@dnd-kit/*` |

## 8. Implementation Order

1. **Types** -- add `Tribe`, `TribeAssignment`, extend `Challenge`
2. **Hooks** -- `useTribes`, `useTribeAssignments`
3. **Utility** -- `tribeUtils.ts`
4. **Tribe CRUD** -- `CreateTribe`, `TribeCRUDTable`
5. **Tribe tab** -- wire into `SeasonAdmin.tsx`
6. **DnD assignment** -- `TribePlayerManager` (most complex piece)
7. **Challenge integration** -- winning tribe selector in `CreateChallenge`

## Open Questions for Discussion

1. **Should tribe color be a free-form hex input or a predefined palette?** Survivor tribes have canonical colors, so a predefined palette (red, blue, green, yellow, purple, orange) might be more user-friendly than a free color picker. But the hex input is more flexible.

2. **Do we need tribe-based scoring rules beyond challenge wins?** E.g., "team reward" giving partial points. The current scoring in `src/data/scoring.ts` is all individual -- is the ask limited to "winning tribe on a challenge auto-resolves to member players," or are there tribe-specific scoring actions to add?

3. **Should the "No Tribe" pool be visible after merge?** Once `merge_occurs` is true on an episode, all players are effectively unassigned. Should the UI auto-move everyone to "No Tribe" at the merge episode, or should the admin manually do it?


## Your Turn
Respond with YAML frontmatter followed by your markdown response. Required frontmatter fields: id, turn, from, timestamp, status. Optional: decisions (array of strings).