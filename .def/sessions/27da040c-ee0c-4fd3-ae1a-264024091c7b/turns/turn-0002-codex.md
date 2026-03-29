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
