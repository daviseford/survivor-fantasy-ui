> Automated PR from DEF session `02429619`

## Summary

**Topic:** redesign the website using shadcn. use the shadcn mcp server

78 files changed, 6416 insertions(+), 2823 deletions(-) across 2 commits.

## Key Decisions

- Full Mantine-to-shadcn migration, not a hybrid -- remove all @mantine/* packages at the end
- Add Tailwind CSS v4 as the styling foundation (shadcn requires it)
- Use shadcn Sidebar component for the app shell layout, replacing Mantine AppShell
- Use shadcn Dialog for modals instead of @mantine/modals context system
- Use shadcn Chart (built on recharts) to replace @mantine/charts LineChart
- Replace @mantine/form with react-hook-form + zod (shadcn form standard)
- Switch from @tabler/icons-react to lucide-react (shadcn standard icon set)
- Keep react-query v3, react-router-dom v6, and Firebase -- data layer untouched
- Phased migration: infrastructure first, then layout shell, then pages leaf-to-root
- Treat shadcn MCP as a required workflow gate, not an optional alternative to direct CLI usage
- Split the shell redesign by route type: public marketing routes vs authenticated/admin app routes
- Minimize generated shadcn surface area early; do not bulk-add every possible component up front
- Keep global sidebar layout -- app already uses sidebar on all routes, only 4 nav items, splitting shells adds complexity for no real gain
- Use shadcn MCP tools for component discovery, examples, and install commands throughout implementation -- not as a separate Phase 0 gate
- Scope react-hook-form + zod to the 4 files that actually use @mantine/form; auth forms use simple controlled inputs
- Use sidebar-01 (simple grouped nav) as the base -- matches current flat nav with 4 items
- Chart migration stays in a late standalone phase; recharts v3 upgrade is not a blocker
- Incremental component install via MCP as each phase needs them, not bulk upfront
- Use sidebar-01 everywhere to keep the current flat nav while staying inside one layout.
- Limit react-hook-form + zod to the four files that currently consume @mantine/form.
- Treat the shadcn MCP server as the workflow for discovering/installing components throughout implementation.

<details>
<summary>Full decisions log</summary>

# Decisions Log

1. **[claude]** Full Mantine-to-shadcn migration, not a hybrid -- remove all @mantine/* packages at the end
1. **[claude]** Add Tailwind CSS v4 as the styling foundation (shadcn requires it)
1. **[claude]** Use shadcn Sidebar component for the app shell layout, replacing Mantine AppShell
1. **[claude]** Use shadcn Dialog for modals instead of @mantine/modals context system
1. **[claude]** Use shadcn Chart (built on recharts) to replace @mantine/charts LineChart
1. **[claude]** Replace @mantine/form with react-hook-form + zod (shadcn form standard)
1. **[claude]** Switch from @tabler/icons-react to lucide-react (shadcn standard icon set)
1. **[claude]** Keep react-query v3, react-router-dom v6, and Firebase -- data layer untouched
1. **[claude]** Phased migration: infrastructure first, then layout shell, then pages leaf-to-root
2. **[codex]** Treat shadcn MCP as a required workflow gate, not an optional alternative to direct CLI usage
2. **[codex]** Split the shell redesign by route type: public marketing routes vs authenticated/admin app routes
2. **[codex]** Minimize generated shadcn surface area early; do not bulk-add every possible component up front
3. **[claude]** Keep global sidebar layout -- app already uses sidebar on all routes, only 4 nav items, splitting shells adds complexity for no real gain
3. **[claude]** Use shadcn MCP tools for component discovery, examples, and install commands throughout implementation -- not as a separate Phase 0 gate
3. **[claude]** Scope react-hook-form + zod to the 4 files that actually use @mantine/form; auth forms use simple controlled inputs
3. **[claude]** Use sidebar-01 (simple grouped nav) as the base -- matches current flat nav with 4 items
3. **[claude]** Chart migration stays in a late standalone phase; recharts v3 upgrade is not a blocker
3. **[claude]** Incremental component install via MCP as each phase needs them, not bulk upfront
4. **[codex]** Use sidebar-01 everywhere to keep the current flat nav while staying inside one layout.
4. **[codex]** Limit react-hook-form + zod to the four files that currently consume @mantine/form.
4. **[codex]** Treat the shadcn MCP server as the workflow for discovering/installing components throughout implementation.

</details>

<details>
<summary>2 commits, 78 files changed, 6416 insertions(+), 2823 deletions(-)</summary>

**Commits:**
```
8dd2a16 def: implement turn 7
7f37307 def: implement turn 5
```

**Diffstat:**
```
CLAUDE.md                                          |    6 +-
 components.json                                    |   21 +
 package.json                                       |   23 +-
 postcss.config.cjs                                 |   13 +-
 src/AppRoutes.module.css                           |   27 -
 src/AppRoutes.tsx                                  |  134 +-
 src/components/AppSidebar.tsx                      |  130 ++
 src/components/Auth/AuthDialog.tsx                 |   38 +
 src/components/Auth/AuthModal.tsx                  |   23 -
 src/components/Auth/Login.tsx                      |   88 +-
 src/components/Auth/Register.tsx                   |  118 +-
 src/components/Auth/index.ts                       |    1 +
 src/components/Challenges/ChallengeCRUDTable.tsx   |  144 +-
 src/components/Challenges/CreateChallenge.tsx      |  275 ++--
 .../Charts/SurvivorPerEpisodeScoringChart.tsx      |   98 +-
 src/components/DraftTable/DraftTable.tsx           |   52 +-
 src/components/Eliminations/CreateElimination.tsx  |  267 ++--
 .../Eliminations/EliminationCRUDTable.tsx          |  144 +-
 src/components/Episodes/CreateEpisode.tsx          |  138 --
 src/components/Episodes/EpisodeCRUDTable.tsx       |  187 ---
 src/components/Episodes/index.ts                   |    2 -
 src/components/Footer/Footer.module.css            |   23 -
 src/components/Footer/Footer.tsx                   |   47 +-
 src/components/GameEvents/CreateGameEvent.tsx      |  286 ++--
 src/components/GameEvents/GameEventsCRUDTable.tsx  |  144 +-
 src/components/Home/Home.module.css                |   66 -
 src/components/Home/Home.tsx                       |   89 +-
 src/components/MyPlayers/MyDraftedPlayers.tsx      |   37 +-
 src/components/MyPlayers/PlayerGroup.tsx           |   29 +-
 src/components/MyPlayers/PlayerGroupGrid.tsx       |   59 +-
 src/components/Navbar/Navbar.module.css            |   93 --
 src/components/Navbar/Navbar.tsx                   |  109 --
 src/components/Navbar/index.ts                     |    1 -
 .../PropBetTables/PostDraftPropBetTable.tsx        |   69 +-
 src/components/PropBetTables/PropBetScoring.tsx    |   69 +-
 .../PerSurvivorPerEpisodeDetailedScoringTable.tsx  |  190 +--
 .../PerUserPerEpisodeScoringTable.tsx              |   55 +-
 .../ScoringTables/ScoringLegendTable.tsx           |   45 +-
 .../SeasonTotalContestantScoringTable.tsx          |   92 +-
 src/components/ui/alert-dialog.tsx                 |  194 +++
 src/components/ui/alert.tsx                        |   66 +
 src/components/ui/avatar.tsx                       |  109 ++
 src/components/ui/badge.tsx                        |   48 +
 src/components/ui/breadcrumb.tsx                   |  109 ++
 src/components/ui/button.tsx                       |   64 +
 src/components/ui/card.tsx                         |   92 ++
 src/components/ui/chart.tsx                        |  372 +++++
 src/components/ui/dialog.tsx                       |  158 ++
 src/components/ui/dropdown-menu.tsx                |  257 ++++
 src/components/ui/input.tsx                        |   21 +
 src/components/ui/label.tsx                        |   24 +
 src/components/ui/select.tsx                       |  190 +++
 src/components/ui/separator.tsx                    |   26 +
 src/components/ui/sheet.tsx                        |  141 ++
 src/components/ui/sidebar.tsx                      |  724 ++++++++++
 src/components/ui/skeleton.tsx                     |   13 +
 src/components/ui/table.tsx                        |  114 ++
 src/components/ui/tabs.tsx                         |   89 ++
 src/components/ui/tooltip.tsx                      |   55 +
 src/hooks/use-mobile.ts                            |   19 +
 src/hooks/useIsMobile.ts                           |    4 +-
 src/index.css                                      |  122 ++
 src/lib/utils.ts                                   |    6 +
 src/main.tsx                                       |    1 +
 src/pages/Admin.tsx                                |   23 +-
 src/pages/ChallengesAdmin.tsx                      |   11 +-
 src/pages/Competitions.tsx                         |  101 +-
 src/pages/Draft.tsx                                |  782 +++++-----
 src/pages/EventsAdmin.tsx                          |   11 +-
 src/pages/Players.tsx                              |   28 +-
 src/pages/SeasonAdmin.tsx                          |   97 +-
 src/pages/Seasons.tsx                              |   73 +-
 src/pages/SingleCompetition.tsx                    |   54 +-
 src/pages/SingleSeason.tsx                         |   64 +-
 src/theme.ts                                       |    5 -
 tsconfig.json                                      |    6 +
 vite.config.ts                                     |    9 +-
 yarn.lock                                          | 1525 ++++++++++++++++----
 78 files changed, 6416 insertions(+), 2823 deletions(-)
```

</details>

