You are Claude, participating in a structured planning conversation with another AI agent (Codex).
You are collaborating on: I want to have the ability to add players to teams. There are often two to three teams in play in Survivor, and later in the season there are no teams. I think a drag-and-drop interface would be best. I'd like to have an admin panel to manage teams. I should be able to create teams. I should have a CRUD panel for teams and then a drag-and-drop interface to move players from team to team. Keep in mind there needs to be a 'no team' option for when the tribes emerge. I'd like the ability for events, challenges, et cetera to be able to select a winning team, which would automatically give the correct points to each player on that team.

## Rules
- Respond with YAML frontmatter followed by markdown. Required frontmatter fields: id, turn, from (must be "claude"), timestamp (ISO-8601), status (complete | needs_human | done | decided).
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


---
id: turn-0002-codex
turn: 2
from: codex
timestamp: '2026-03-29T20:56:27.079Z'
status: complete
phase: plan
duration_ms: 110950
decisions:
  - Keep `Challenge.winning_players` as the scoring source of truth and derive it from team membership at admin write time
  - 'Add a new season-scoped team assignments document, but model assignments as episode snapshots rather than open-ended effective ranges'
  - Add a `teams` tab to `SeasonAdmin` instead of a separate admin route
model_tier: full
model_name: gpt-5.4
---
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

That is compact, but it creates extra resolution logic everywhere:
- challenge form has to compute current assignment from historical transitions
- the DnD screen has to reconstruct state before edits
- deletes and corrections become more error-prone because one bad transition can corrupt all later episodes

A better fit here is:

- `teams/{seasonId}`: team definitions
- `team_assignments/{seasonId}`: `Record<episodeId, Record<playerName, teamId | null>>`

That matches the actual admin mental model:
- choose episode
- drag roster into 2-3 teams or "No Team"
- save snapshot

It also handles merge cleanly:
- for the merge episode and later, snapshot all players to `null`

You can still add a "Copy previous episode" button in the UI, but that becomes a UI convenience instead of the persistence model.

### 2. Do not make scoring resolve teams at read time

Claude already leaned toward write-time resolution, and I think that should be a firm decision, not an option.

Given [src/hooks/useScoringCalculations.ts:23](src/hooks/useScoringCalculations.ts#L23) through [src/hooks/useScoringCalculations.ts:44](src/hooks/useScoringCalculations.ts#L44), read-time team resolution would require:
- new hook(s) in scoring
- new dependencies in memo inputs
- backfilling team logic into every score computation path

That is unnecessary coupling. The challenge record should remain self-contained:
- `winning_players` stays required
- optional `winning_team_id` can be stored for audit/display
- admin form auto-fills `winning_players` from the episode snapshot

That keeps [src/utils/scoringUtils.ts:44](src/utils/scoringUtils.ts#L44) through [src/utils/scoringUtils.ts:47](src/utils/scoringUtils.ts#L47) unchanged.

### 3. Be careful with "No Team"

I would not model "No Team" as a fake team record. Make it `null` in assignment data and in `winning_team_id`. That avoids:
- polluting CRUD with a non-deletable pseudo-team
- special-case display bugs when someone edits or deletes it
- treating merge as just another tribe

In the UI, render a fixed "No Team" drop zone. In data, use `null`.

## Proposed concrete shape

In [src/types/index.ts](src/types/index.ts):

- add `Team`
- add `EpisodeTeamAssignments`
- extend `Challenge` with optional `winning_team_id?: Team["id"] | null`

Suggested direction:

- `Team`: `id`, `season_id`, `season_num`, `name`, `color`, `order`
- `EpisodeTeamAssignments`: `episode_id`, `episode_num`, `assignments: Record<Player["name"], Team["id"] | null>`

I would not add a separate `TribeAssignment` entity per player. That is noisier to write, noisier to diff, and a worse match for drag-and-drop saves.

## Implementation outline I would hand to the implementer

1. Add types in [src/types/index.ts](src/types/index.ts).
2. Add `useTeams` and `useTeamAssignments` hooks mirroring [src/hooks/useChallenges.ts](src/hooks/useChallenges.ts).
3. Add a `Teams` admin tab in [src/pages/SeasonAdmin.tsx](src/pages/SeasonAdmin.tsx).
4. Add team CRUD components following the table/edit pattern already used in [src/components/Episodes/EpisodeCRUDTable.tsx](src/components/Episodes/EpisodeCRUDTable.tsx) and [src/components/Challenges/ChallengeCRUDTable.tsx](src/components/Challenges/ChallengeCRUDTable.tsx).
5. Add DnD team assignment UI for a selected episode, with:
   - team columns from `teams`
   - fixed `No Team` column
   - load current episode snapshot if present
   - otherwise seed from previous episode snapshot or all `null`
6. Update [src/components/Challenges/CreateChallenge.tsx](src/components/Challenges/CreateChallenge.tsx) to:
   - load assignments for selected episode
   - offer optional `winning_team_id`
   - auto-fill `winning_players`
   - still allow manual edits to `winning_players`
7. Optionally show `winning_team_id` in [src/components/Challenges/ChallengeCRUDTable.tsx](src/components/Challenges/ChallengeCRUDTable.tsx) for admin visibility.

## Decisions I think we should lock now

- Team membership is episode-scoped.
- Persistence should be episode snapshot data, not effective-range transition rows.
- `winning_players` remains authoritative for scoring.
- `winning_team_id` is optional metadata for admin UX and auditability.
- `No Team` is represented as `null`, not a synthetic team record.
- New UI belongs under a `Teams` tab in `SeasonAdmin`.

If Claude agrees with the snapshot model, I would move this to `decided` on the next turn.


## Your Turn
Respond with YAML frontmatter followed by your markdown response. Required frontmatter fields: id, turn, from, timestamp, status. Optional: decisions (array of strings).