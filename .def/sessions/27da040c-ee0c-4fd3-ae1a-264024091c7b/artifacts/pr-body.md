> Automated PR from DEF session `27da040c`

## Summary

**Topic:** I want to have the ability to add players to teams. There are often two to three teams in play in Survivor, and later in the season there are no teams. I think a drag-and-drop interface would be best. I'd like to have an admin panel to manage teams. I should be able to create teams. I should have a CRUD panel for teams and then a drag-and-drop interface to move players from team to team. Keep in mind there needs to be a 'no team' option for when the tribes emerge. I'd like the ability for events, challenges, et cetera to be able to select a winning team, which would automatically give the correct points to each player on that team.

14 files changed, 1036 insertions(+), 9 deletions(-) across 3 commits.

## Key Decisions

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

<details>
<summary>Full decisions log</summary>

# Decisions Log

1. **[claude]** Store tribes in a separate Firestore doc per season (tribes/{seasonId}) matching the challenges/eliminations/events pattern
1. **[claude]** Tribe assignments are episode-scoped -- a player's tribe can change per episode (swaps, merge, etc)
1. **[claude]** Use @dnd-kit/core + @dnd-kit/sortable for drag-and-drop (modern, well-maintained, React 18 compatible)
1. **[claude]** Add a 'winning_tribe' optional field to Challenge rather than creating a new entity
1. **[claude]** Add a Tribes tab to the existing SeasonAdmin page following the established tab pattern
2. **[codex]** Keep `Challenge.winning_players` as the scoring source of truth and derive it from team membership at admin write time
2. **[codex]** Add a new season-scoped team assignments document, but model assignments as episode snapshots rather than open-ended effective ranges
2. **[codex]** Add a `teams` tab to `SeasonAdmin` instead of a separate admin route
3. **[claude]** Episode snapshot model wins over effective-range transitions -- simpler admin UX, no resolution logic
3. **[claude]** No Team is null, not a synthetic team record
3. **[claude]** winning_players remains the scoring source of truth, populated at write time from team membership
3. **[claude]** winning_team_id is optional audit metadata on Challenge
3. **[claude]** Teams tab in SeasonAdmin, not a separate route
3. **[claude]** Use @dnd-kit/core + @dnd-kit/sortable for drag-and-drop
3. **[claude]** Team color is a free-form ColorInput (hex) -- admins know Survivor tribe colors
4. **[codex]** Teams are episode-scoped snapshots stored per season (teams/{seasonId} + team_assignments/{seasonId})
4. **[codex]** Winning_team_id is optional metadata; scoring still relies on winning_players populated at write time
4. **[codex]** No Team is represented as null and rendered as a dedicated column

</details>

<details>
<summary>3 commits, 14 files changed, 1036 insertions(+), 9 deletions(-)</summary>

**Commits:**
```
178e3fa def: implement turn 9
b9ea314 def: implement turn 7
3382c30 def: implement turn 5
```

**Diffstat:**
```
package.json                                  |   3 +
 src/components/Challenges/CreateChallenge.tsx |  85 ++++-
 src/components/Teams/CreateTeam.tsx           | 133 ++++++++
 src/components/Teams/TeamCRUDTable.tsx        | 246 +++++++++++++++
 src/components/Teams/TeamPlayerManager.tsx    | 429 ++++++++++++++++++++++++++
 src/components/Teams/index.ts                 |   3 +
 src/data/seasons.ts                           |   2 -
 src/hooks/useTeamAssignments.ts               |  23 ++
 src/hooks/useTeams.ts                         |  23 ++
 src/pages/SeasonAdmin.tsx                     |  20 ++
 src/pages/Seasons.tsx                         |   4 -
 src/types/index.ts                            |  27 +-
 src/utils/teamUtils.ts                        |  16 +
 yarn.lock                                     |  31 ++
 14 files changed, 1036 insertions(+), 9 deletions(-)
```

</details>

