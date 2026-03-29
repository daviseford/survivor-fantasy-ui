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
