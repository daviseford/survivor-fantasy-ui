You are Codex, participating in a structured planning conversation with another AI agent (Claude).
You are collaborating on: redesign the website using shadcn. use the shadcn mcp server

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
**Topic:** redesign the website using shadcn. use the shadcn mcp server
**Mode:** edit
**Phase:** plan


## Prior Turns
---
id: turn-0001-claude
turn: 1
from: claude
timestamp: '2026-03-29T03:19:33.769Z'
status: complete
phase: plan
duration_ms: 555121
decisions:
  - 'Full Mantine-to-shadcn migration, not a hybrid -- remove all @mantine/* packages at the end'
  - Add Tailwind CSS v4 as the styling foundation (shadcn requires it)
  - 'Use shadcn Sidebar component for the app shell layout, replacing Mantine AppShell'
  - Use shadcn Dialog for modals instead of @mantine/modals context system
  - Use shadcn Chart (built on recharts) to replace @mantine/charts LineChart
  - Replace @mantine/form with react-hook-form + zod (shadcn form standard)
  - Switch from @tabler/icons-react to lucide-react (shadcn standard icon set)
  - 'Keep react-query v3, react-router-dom v6, and Firebase -- data layer untouched'
  - 'Phased migration: infrastructure first, then layout shell, then pages leaf-to-root'
model_tier: full
model_name: opus
---
# Shadcn Redesign Plan: Survivor Fantasy UI

## 1. Scope & Strategy

This is a **full UI library migration** from Mantine v7 to shadcn/ui + Tailwind CSS. The data layer (Firebase, react-query, hooks) and routing remain untouched. Every Mantine component gets a shadcn equivalent.

**Why full replacement, not hybrid?** Mantine brings its own CSS reset, theme provider, and PostCSS pipeline (`postcss-preset-mantine`). Running both systems creates conflicting resets, doubled bundle size, and two design languages. A clean swap is less work than maintaining a bridge.

## 2. Current State Inventory

### Mantine Packages to Remove (5)
- `@mantine/core` -- 30+ components used across all files
- `@mantine/hooks` -- `useDisclosure`, `useMediaQuery`
- `@mantine/form` -- `useForm` in 4 form components
- `@mantine/modals` -- `ModalsProvider`, `modals.open/openContextModal/openConfirmModal/closeAll`
- `@mantine/charts` -- `LineChart` in 1 component

### CSS Modules to Delete (4)
- `src/AppRoutes.module.css`
- `src/components/Home/Home.module.css`
- `src/components/Navbar/Navbar.module.css`
- `src/components/Footer/Footer.module.css`

### PostCSS plugins to remove
- `postcss-preset-mantine`
- `postcss-simple-vars` (Mantine breakpoint variables)

### Other Dependencies Affected
- `@tabler/icons-react` -- replace with `lucide-react` (shadcn standard)
- `recharts` 2.12.5 -- shadcn chart requires `recharts@3.8.0`, must upgrade

## 3. New Dependencies to Add

```
# Tailwind CSS v4 (Vite plugin)
@tailwindcss/vite  tailwindcss

# shadcn prerequisites
class-variance-authority  clsx  tailwind-merge  lucide-react

# Form system (shadcn standard)
react-hook-form  @hookform/resolvers  zod

# shadcn will also pull in Radix UI primitives as transitive deps
```

## 4. Mantine-to-Shadcn Component Mapping

| Mantine Component | shadcn Replacement | Files Affected |
|---|---|---|
| `AppShell` + Header/Navbar/Footer | `SidebarProvider` + `Sidebar` + `SidebarInset` | `AppRoutes.tsx` |
| `Burger` | `SidebarTrigger` | `AppRoutes.tsx` |
| `Button` | `Button` | ~12 files |
| `Card` + `Card.Section` | `Card` + `CardHeader/Content/Footer` | Seasons, SingleCompetition, MyPlayers, Players |
| `Table` + sub-components | `Table` + sub-components | 7+ scoring/CRUD tables |
| `Tabs` + `Tabs.List/Tab/Panel` | `Tabs` + `TabsList/Trigger/Content` | AuthModal, SeasonAdmin |
| `Badge` | `Badge` | Seasons, Draft, ScoringTables, PropBets |
| `Avatar` + `Avatar.Group` | `Avatar` + custom group | Footer, DraftTable, MyPlayers, ScoringTables, Players, Draft |
| `Select` | `Select` | Draft, CreateChallenge, CreateElimination |
| `MultiSelect` | `Combobox` (multi-mode) | CreateChallenge |
| `TextInput` / `PasswordInput` / `NumberInput` | `Input` + `Label` (+ `type="password"/"number"`) | Login, CreateChallenge, CreateElimination, CreateGameEvent |
| `useForm` (@mantine/form) | `react-hook-form` + `zod` | Draft, Login, Register, CreateChallenge, CreateElimination, CreateGameEvent |
| `ModalsProvider` + `modals.open/openContextModal` | `Dialog` (controlled via state) | AppRoutes, Navbar, Draft, CRUD tables |
| `Alert` | `Alert` | Draft, Competitions |
| `Breadcrumbs` | `Breadcrumb` | Draft |
| `Tooltip` | `Tooltip` | MyDraftedPlayers, PlayerGroup |
| `Text` | `<p>` / `<span>` with Tailwind classes | everywhere |
| `Title` | `<h1>`-`<h6>` with Tailwind classes | everywhere |
| `Group` | `<div className="flex items-center gap-*">` | everywhere |
| `Stack` | `<div className="flex flex-col gap-*">` | everywhere |
| `SimpleGrid` | `<div className="grid grid-cols-*">` | everywhere |
| `Box` | `<div>` | everywhere |
| `Container` | `<div className="mx-auto max-w-*">` | Home, Footer, Login |
| `Center` | `<div className="flex items-center justify-center">` | Draft, Competitions |
| `Paper` | `Card` or `<div className="rounded-lg border p-*">` | Draft, Players, Login |
| `Anchor` | `<a>` with Tailwind or shadcn `Button variant="link"` | AppRoutes header, Footer |
| `Image` | `<img>` with Tailwind | Seasons |
| `Loader` | `Spinner` | Competitions, SingleSeason, CreateChallenge |
| `CopyButton` | Custom hook or `navigator.clipboard` + `Button` | Draft |
| `Code` | `<code>` with Tailwind or shadcn `kbd` | CRUD tables |
| `LineChart` (@mantine/charts) | shadcn `Chart` (recharts v3) | SurvivorPerEpisodeScoringChart |
| `ActionIcon` | `Button variant="ghost" size="icon"` | CRUD tables |
| `useDisclosure` | `React.useState<boolean>` | AppRoutes |
| `useMediaQuery` | shadcn `use-mobile` hook | useIsMobile |

## 5. Implementation Phases

### Phase 0: Infrastructure Setup
**Files:** `package.json`, `vite.config.ts`, `tsconfig.json`, `postcss.config.cjs`, new `components.json`, new `src/lib/utils.ts`, new `src/app/globals.css`

1. Run `npx shadcn@latest init` -- this creates `components.json`, sets up Tailwind, creates `src/lib/utils.ts` with `cn()` helper
2. Configure `components.json` to use `src/components/ui` for component output
3. Add `@tailwindcss/vite` plugin to `vite.config.ts`
4. Add path alias `@/` -> `src/` in `tsconfig.json` and `vite.config.ts` (shadcn convention)
5. Replace `postcss-preset-mantine` + `postcss-simple-vars` with Tailwind's PostCSS config
6. Install all shadcn components in one batch:
   ```
   npx shadcn@latest add button card table sidebar dialog tabs badge avatar
   select input form chart alert breadcrumb tooltip separator sheet
   dropdown-menu skeleton spinner collapsible
   ```
7. Install `lucide-react`, `react-hook-form`, `@hookform/resolvers`, `zod`
8. Upgrade `recharts` from 2.12.5 to 3.8.0

**Verify:** `yarn build` succeeds with both Mantine and shadcn installed (temporary dual-install)

### Phase 1: Layout Shell
**Files:** `AppRoutes.tsx`, `Navbar.tsx`, `Footer.tsx`, `Home.tsx`, all 4 `.module.css` files

1. Rewrite `AppRoutes.tsx`:
   - Replace `MantineProvider` + `ModalsProvider` with `SidebarProvider` + `TooltipProvider`
   - Replace `AppShell` with `SidebarProvider` > `AppSidebar` + `SidebarInset`
   - Header becomes a `<header>` inside `SidebarInset` with `SidebarTrigger`
   - Footer becomes a simple Tailwind-styled `<footer>`
2. Rewrite `Navbar.tsx` as `AppSidebar.tsx`:
   - Use shadcn `Sidebar`, `SidebarContent`, `SidebarFooter`, `SidebarMenu`, `SidebarMenuButton`
   - Nav items use `SidebarMenuItem` with `SidebarMenuButton asChild` wrapping `<a>` links
   - User section in `SidebarFooter` with `DropdownMenu` for login/logout
   - Replace `@tabler/icons-react` with `lucide-react` equivalents (`Home`, `Settings`, `LayoutDashboard`, `Swords`, `LogIn`, `LogOut`, `User`, `Mail`)
3. Rewrite `Footer.tsx` with Tailwind utility classes
4. Rewrite `Home.tsx` hero section with Tailwind utility classes
5. Delete all 4 `.module.css` files

**Verify:** App shell renders, navigation works, responsive sidebar collapse works

### Phase 2: Auth System
**Files:** `AuthModal.tsx`, `Login.tsx`, `Register.tsx`

1. Replace `ModalsProvider`/`modals.openContextModal` pattern with a React state-driven `Dialog` component
   - Create an `AuthDialog` component using shadcn `Dialog`
   - Lift dialog open state to a context or the layout level
   - Navbar login button sets dialog open state
2. Rewrite `AuthModal.tsx` using shadcn `Tabs` inside `Dialog`
3. Rewrite `Login.tsx` and `Register.tsx`:
   - Replace `@mantine/form useForm` with `react-hook-form` + `zod` schema
   - Replace `TextInput`/`PasswordInput` with shadcn `Input` + `Label`
   - Replace `Paper`/`Container` with `Card`

### Phase 3: Data Display Pages (read-only pages first)
**Files:** `Seasons.tsx`, `SingleSeason.tsx`, `Competitions.tsx`, `SingleCompetition.tsx`, `Players.tsx`

1. `Seasons.tsx`: `SimpleGrid` -> CSS grid, `Card`/`Image`/`Badge`/`Button` -> shadcn equivalents
2. `Competitions.tsx`: `Table` -> shadcn `Table`, `Loader` -> `Spinner`, `Alert` -> shadcn `Alert`
3. `SingleCompetition.tsx`: `GridCard` helper -> shadcn `Card`, scoring tables remain (updated in Phase 4)
4. `SingleSeason.tsx`: Similar card/button/loader replacements
5. `Players.tsx`: `Card`/`Avatar`/`Paper` -> shadcn equivalents

### Phase 4: Scoring & Data Tables
**Files:** All files in `src/components/ScoringTables/`, `DraftTable/`, `PropBetTables/`, `Charts/`

1. All `Table.*` sub-components -> shadcn `Table` equivalents (`TableHeader`, `TableBody`, `TableRow`, `TableCell`, `TableHead`)
2. `SurvivorPerEpisodeScoringChart.tsx`: Replace `@mantine/charts LineChart` with shadcn `ChartContainer` + recharts v3 `LineChart` + `ChartTooltip`
3. `Table.ScrollContainer` -> `<div className="overflow-x-auto">`
4. Badge colors -> shadcn Badge variants (`default`, `secondary`, `destructive`, `outline`)

### Phase 5: Draft Page & Forms
**Files:** `Draft.tsx`, `CreateChallenge.tsx`, `CreateElimination.tsx`, `CreateGameEvent.tsx`

1. `Draft.tsx` (largest file, ~660 lines):
   - Replace all `modals.open`/`modals.openConfirmModal` calls with shadcn `Dialog` (state-controlled)
   - `CopyButton` -> custom impl with `navigator.clipboard.writeText` + `Button`
   - Player cards: `Paper`/`Avatar`/`Badge` -> shadcn equivalents
   - `Select` -> shadcn `Select`
   - `useForm` -> `react-hook-form`
   - All layout primitives (`Stack`/`Group`/`Center`/`SimpleGrid`/`Box`) -> Tailwind flex/grid
2. CRUD forms: `useForm` -> `react-hook-form` + `zod`, `MultiSelect` -> shadcn `Combobox`

### Phase 6: Admin Pages
**Files:** `Admin.tsx`, `SeasonAdmin.tsx`, `ChallengesAdmin.tsx`, `EventsAdmin.tsx`

1. `SeasonAdmin.tsx`: `Tabs` -> shadcn `Tabs`
2. CRUD tables: `ActionIcon` -> `Button variant="ghost" size="icon"`, `Code` -> `<code>`
3. Admin page: `SimpleGrid`/`Button` -> Tailwind grid + shadcn `Button`

### Phase 7: Cleanup & Removal
1. Remove all `@mantine/*` packages from `package.json`
2. Remove `@tabler/icons-react`
3. Remove `postcss-preset-mantine`, `postcss-simple-vars`
4. Remove Mantine CSS imports (`@mantine/core/styles.css`, `@mantine/charts/styles.css`)
5. Remove `src/theme.ts`
6. Update `postcss.config.cjs` (or delete if Tailwind v4 handles it via Vite plugin)
7. Run `yarn build` + `yarn lint` to catch any remaining references
8. Update CLAUDE.md to reflect new architecture (shadcn + Tailwind)

## 6. Key Technical Decisions & Rationale

### Modal System Redesign
Mantine's `ModalsProvider` + `modals.openContextModal` is a global imperative API. shadcn uses declarative `<Dialog>` components controlled by React state. The migration requires:
- A shared `AuthDialog` component rendered at the layout level, controlled by context or zustand
- Inline `Dialog` components in Draft.tsx for the "Name Your Competition" and player detail modals
- Inline `AlertDialog` for confirm modals in CRUD tables

### Form Migration
`@mantine/form` -> `react-hook-form` + `zod` is the biggest behavioral change. Key differences:
- Validation schemas move from inline functions to zod schemas
- `form.getInputProps("name")` -> `register("name")` or `Controller` for shadcn `Select`
- Error display changes from Mantine's built-in to shadcn `FormMessage`

### Chart Migration
shadcn's `Chart` wraps recharts v3. The codebase already uses `recharts` 2.x as a transitive dep of `@mantine/charts`. The migration path:
- Upgrade recharts to v3.8.0
- Replace `<LineChart>` from `@mantine/charts` with raw recharts `<LineChart>` wrapped in shadcn `ChartContainer`
- Color system changes from Mantine color tokens (`"red.1"`) to CSS variables (`--chart-1`, `--chart-2`, etc.)

### Icon Migration
`@tabler/icons-react` -> `lucide-react`. Both are similar stroke-icon sets. Key renames:
- `IconHome` -> `Home`
- `IconSettings` -> `Settings`
- `IconLayoutBoard` -> `LayoutDashboard`
- `IconKarate` -> `Swords`
- `IconLogin`/`IconLogout` -> `LogIn`/`LogOut`
- `IconUser` -> `User`
- `IconMail` -> `Mail`
- `IconBrandGithub` -> `Github`

## 7. Risk Areas

1. **`Draft.tsx` complexity** (~660 lines, 5+ modal interactions, real-time state). This is the highest-risk file. Plan to migrate it in isolation and test thoroughly.
2. **Recharts v3 breaking changes** -- the API may have changed between v2 and v3. Need to verify chart data format compatibility.
3. **Mantine's `light-dark()` CSS function** used in some module CSS. Tailwind handles dark mode via `dark:` prefix instead -- need to verify dark mode still works.
4. **`@react-query-firebase` compatibility** -- should be unaffected since it's a data layer, but verify no Mantine-specific integrations exist.

## 8. Files Unchanged (Data Layer)
These files need zero modifications:
- `src/firebase.ts`
- `src/queryClient.ts`
- `src/consts.ts`
- `src/types/index.ts`
- `src/data/**/*`
- `src/utils/**/*`
- All hooks in `src/hooks/` (except `useIsMobile.ts` which uses `@mantine/hooks`)

## 9. Open Questions for Discussion

1. **Sidebar style preference:** `sidebar-01` (simple grouped nav) vs `sidebar-07` (collapsible to icons). The current Mantine navbar is simple flat links -- `sidebar-01` is the closest match, but `sidebar-07` gives a more polished collapsed state on desktop. I'd recommend `sidebar-07`.

2. **Dark mode:** The current Mantine setup has light/dark support via `light-dark()` CSS functions. Should we preserve dark mode with Tailwind's `dark:` classes, or ship light-only initially?

3. **Form library:** I proposed `react-hook-form` + `zod` (shadcn standard). An alternative is keeping forms simple with uncontrolled inputs + manual validation since the forms are small. But `react-hook-form` gives us better UX (field-level errors, touched state) for the Draft prop bets form.

4. **Recharts v3:** shadcn chart wants recharts 3.8.0. If the upgrade is painful, we could skip the shadcn chart wrapper and use recharts directly with Tailwind styling. The chart is only used in one component.


---
id: turn-0002-codex
turn: 2
from: codex
timestamp: '2026-03-29T03:21:04.464Z'
status: complete
phase: plan
duration_ms: 90687
decisions:
  - 'Treat shadcn MCP as a required workflow gate, not an optional alternative to direct CLI usage'
  - 'Split the shell redesign by route type: public marketing routes vs authenticated/admin app routes'
  - Minimize generated shadcn surface area early; do not bulk-add every possible component up front
model_tier: full
model_name: gpt-5.4
---
# Plan Review

Claude's migration direction is mostly sound, but the current plan misses the user's explicit constraint: use the shadcn MCP server. That cannot be a footnote. Per the official shadcn docs, Codex needs MCP configured in `~/.codex/config.toml`, and the MCP server is the intended path to browse/search/install registry items in-project, not just `npx shadcn add ...` by hand. The implementation plan should therefore start with an MCP readiness check, then use MCP prompts for discovery and install, with CLI only as the transport behind MCP. Sources: [MCP docs](https://ui.shadcn.com/docs/mcp), [Vite install docs](https://ui.shadcn.com/docs/installation/vite).

I would also push back on the assumption that the entire app should move to a sidebar shell. "Use shadcn" does not imply "everything becomes a dashboard." If `Home`, season browsing, and competition discovery are public-facing, forcing `Sidebar` across all routes will likely regress information density and mobile usability. Better plan: keep a top-nav public shell for landing/list/detail pages, and use `SidebarProvider` only for authenticated/admin-heavy flows like Draft and admin screens. That is a design decision, not just a component swap.

# Changes I Would Make To The Plan

## 1. Replace "Phase 0: Infrastructure Setup" with "Phase 0: MCP + Design System Bootstrap"

Add these gates before any UI migration:

1. Verify shadcn MCP is configured for Codex.
   - Official config is `[mcp_servers.shadcn] command = "npx"` with `args = ["shadcn@latest", "mcp"]` in `~/.codex/config.toml`.
2. Initialize `components.json` for the Vite app.
3. Add Tailwind foundation and aliases.
4. Define global design tokens first:
   - colors
   - radius
   - spacing scale
   - typography
   - chart variables
5. Use MCP to inspect available registry components and only install the initial minimal set.

I would not bulk-add `button card table sidebar dialog tabs badge avatar select input form chart alert breadcrumb tooltip separator sheet dropdown-menu skeleton spinner collapsible` on day one. shadcn is open-code; every added component becomes owned code. Generate only what the app needs in the first migration slice. Otherwise review noise and drift go up immediately. The docs explicitly frame shadcn as code you own, not a runtime library: [Introduction](https://ui.shadcn.com/docs).

## 2. Route-Split The Shell

Revise Claude's shell phase into two tracks:

- Public shell
  - `Home.tsx`
  - season list/detail
  - competition list/detail
  - top navigation + mobile sheet/drawer
- App shell
  - draft
  - admin
  - account/authenticated workflows
  - shadcn `Sidebar`

If Claude wants `sidebar-07`, I would reject that as premature. Pick the simplest sidebar variant that does not introduce collapsible-icon behavior until the IA is stable. Fancy sidebar states are not the risk to spend time on first.

## 3. Decouple Form Migration From Component Migration

I disagree with doing a repo-wide `@mantine/form -> react-hook-form + zod` conversion as a blanket rule. shadcn works fine without RHF. Use RHF + zod where there is actual schema complexity:
- Draft
- CreateChallenge
- CreateElimination
- CreateGameEvent

For simple auth forms, controlled inputs or light RHF usage is fine, but do not make "replace every form library" a prerequisite for the redesign. Otherwise you combine:
- new styling system
- new modal model
- new form state model
- new validation model

That is too much behavioral churn in the same PR slice.

## 4. De-Risk Charts

Claude is right that chart migration is isolated, but I would not let `recharts` v3 become a blocker for the redesign. Keep chart migration in a separate late phase. If the shadcn chart wrapper adds friction, use raw Recharts styled with the same tokens and revisit the wrapper later. The official Tailwind v4 docs note chart variable changes, which is another reason to stabilize tokens first: [Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4).

# Revised Execution Order

1. MCP bootstrap and `components.json`.
2. Tailwind v4 setup, aliases, `globals.css`, design tokens.
3. Add only core primitives via MCP:
   - `button`
   - `card`
   - `input`
   - `dialog`
   - `sheet`
   - `dropdown-menu`
   - `table`
   - `tabs`
   - `badge`
4. Migrate public shell and homepage first.
5. Migrate auth dialog pattern.
6. Migrate read-only pages.
7. Migrate Draft and admin flows.
8. Migrate charts.
9. Remove Mantine packages and CSS only after zero references remain.

# Points I Want Claude To Confirm Or Contest

- Do you agree the shell should be split by route type instead of forcing `Sidebar` globally?
- Do you still want full RHF conversion, or can we limit it to complex forms first?
- Are you comfortable making MCP a hard requirement for component discovery/install, instead of treating CLI commands as the primary workflow?

If we align on those three points, the plan is ready for implementation.


---
id: turn-0003-claude
turn: 3
from: claude
timestamp: '2026-03-29T03:23:10.617Z'
status: decided
phase: plan
duration_ms: 126147
decisions:
  - 'Keep global sidebar layout -- app already uses sidebar on all routes, only 4 nav items, splitting shells adds complexity for no real gain'
  - 'Use shadcn MCP tools for component discovery, examples, and install commands throughout implementation -- not as a separate Phase 0 gate'
  - Scope react-hook-form + zod to the 4 files that actually use @mantine/form; auth forms use simple controlled inputs
  - Use sidebar-01 (simple grouped nav) as the base -- matches current flat nav with 4 items
  - Chart migration stays in a late standalone phase; recharts v3 upgrade is not a blocker
  - 'Incremental component install via MCP as each phase needs them, not bulk upfront'
model_tier: full
model_name: opus
---
# Response to Codex's Review

Good pushback on three specific points. Here is where I land after reading the actual code.

## 1. Shell Split: Disagree -- Keep Global Sidebar

Codex's proposal to split into a public top-nav shell and an app sidebar shell sounds reasonable in the abstract, but it does not match this codebase:

**The app already uses a global sidebar on every route** (`AppRoutes.tsx:47-121`). There are exactly **4 navigation items** (Home, Admin, Seasons, Competitions -- `Navbar.tsx:18-23`). The homepage is a single hero section with two buttons (`Home.tsx:6-62`) -- it is not a marketing site with multiple sections, pricing tables, or public content requiring a wide viewport.

Introducing two different layout shells means:
- A `<PublicLayout>` wrapper with a custom top-nav component (shadcn has **no top-nav/header block** -- I searched the registry and got zero results for "header navbar top navigation")
- A `<AppLayout>` wrapper with `SidebarProvider`
- Route-level layout switching logic in `AppRoutes.tsx`
- Two responsive patterns to maintain instead of one

For 4 nav links and a hero page, this is over-engineering. The sidebar collapses to a mobile drawer already (Mantine's current behavior, and shadcn `Sidebar` does the same). The homepage renders fine inside a sidebar layout -- it is just centered content with `padding-top: 200px`.

**Decision: Global sidebar.** Use `sidebar-01` (simple grouped nav) as the base. It is the closest match to the current flat link list. `sidebar-07` (collapsible to icons) is premature -- we have 4 items, not a complex IA.

## 2. MCP Usage: Agree on Intent, Disagree on Framing

The shadcn MCP server is already configured and available in this session. I can see all 7 tools:
- `search_items_in_registries` -- fuzzy search for components
- `list_items_in_registries` -- browse available components
- `view_items_in_registries` -- read component source code
- `get_item_examples_from_registries` -- get usage examples/demos
- `get_add_command_for_items` -- get the CLI install command
- `get_project_registries` -- check `components.json` config
- `get_audit_checklist` -- post-install verification

This is a **developer workflow tool**, not an infrastructure gate that needs its own phase. We should use it throughout implementation:
- Before installing a component: `search_items` to find the right one, `view_items` to inspect source, `get_item_examples` to see usage patterns
- To install: `get_add_command_for_items` to get the exact CLI command
- After installing: `get_audit_checklist` to verify

But "Phase 0: MCP Bootstrap" as a discrete step is artificial. The MCP server is ready now. `components.json` gets created by `npx shadcn@latest init`, which is already step 1 of Phase 0.

**Decision: Use MCP tools as the primary workflow for discovering and installing components at each phase.** No separate MCP phase.

## 3. Form Migration Scope: Agree -- Limit to 4 Files

Codex is right. `@mantine/form` is used in exactly 4 files:

| File | Validators Used |
|---|---|
| `src/pages/Draft.tsx:19` | `isNotEmpty, useForm` |
| `src/components/Challenges/CreateChallenge.tsx:17` | `hasLength, useForm` |
| `src/components/Eliminations/CreateElimination.tsx:16` | `hasLength, useForm` |
| `src/components/GameEvents/CreateGameEvent.tsx:16` | `isNotEmpty, useForm` |

The auth forms (`Login.tsx`, `Register.tsx`) do **not** use `@mantine/form` at all -- they can stay as simple controlled inputs with shadcn `Input` + `Label`.

**Decision: `react-hook-form` + `zod` only in those 4 files.** Auth forms use plain controlled inputs.

## 4. Incremental Component Install: Agree

Codex is correct that bulk-adding 20 components upfront creates review noise and owned code we may not need yet. Install per-phase using MCP:

- **Phase 0 (init):** Just `npx shadcn@latest init` -- no components yet
- **Phase 1 (shell):** `sidebar`, `separator`, `breadcrumb`, `dropdown-menu`, `sheet` (for mobile)
- **Phase 2 (auth):** `dialog`, `tabs`, `input`, `label`, `button`, `card`
- **Phase 3 (data pages):** `table`, `badge`, `avatar`, `alert`, `skeleton`
- **Phase 4 (scoring/charts):** `chart`, `tooltip`
- **Phase 5 (draft/forms):** `form`, `select`, `combobox`
- **Phase 6 (admin):** nothing new needed

## Revised Final Plan

### Phase 0: Infrastructure
1. `npx shadcn@latest init` -- creates `components.json`, `src/lib/utils.ts`, CSS variables
2. Add `@tailwindcss/vite` to `vite.config.ts`, add `@/` path alias
3. Install `lucide-react`
4. Verify `yarn build` passes with both systems installed

### Phase 1: Layout Shell
1. Use MCP to inspect `sidebar-01` block, install `sidebar` + deps
2. Rewrite `AppRoutes.tsx`: `MantineProvider`/`ModalsProvider`/`AppShell` -> `SidebarProvider` + `SidebarInset`
3. Create `AppSidebar.tsx` from `sidebar-01` pattern with current 4 nav items + auth footer section
4. Rewrite `Footer.tsx` and `Home.tsx` with Tailwind utilities
5. Delete all 4 `.module.css` files

### Phase 2: Auth System
1. Install `dialog`, `tabs`, `input`, `label`, `button`, `card` via MCP
2. Replace `ModalsProvider`/`modals.openContextModal` with a state-driven `Dialog`
3. Rewrite `AuthModal.tsx` as `AuthDialog.tsx` with shadcn `Dialog` + `Tabs`
4. Rewrite `Login.tsx`/`Register.tsx` with shadcn inputs (controlled, no RHF)

### Phase 3: Read-Only Pages
1. Install `table`, `badge`, `avatar`, `alert`, `skeleton` via MCP
2. Migrate `Seasons.tsx`, `Competitions.tsx`, `SingleSeason.tsx`, `SingleCompetition.tsx`, `Players.tsx`
3. Replace layout primitives (`Group`/`Stack`/`SimpleGrid`/`Box`/`Container`/`Center`/`Paper`) with Tailwind flex/grid

### Phase 4: Scoring Tables & Charts
1. Install `chart`, `tooltip` via MCP
2. Migrate all `ScoringTables/*.tsx`, `DraftTable/`, `PropBetTables/`
3. Migrate `SurvivorPerEpisodeScoringChart.tsx` -- upgrade recharts, wrap in `ChartContainer`
4. If recharts v3 upgrade is painful, use raw recharts + Tailwind and skip the shadcn chart wrapper

### Phase 5: Draft & Forms
1. Install `form`, `select` via MCP; add `react-hook-form`, `@hookform/resolvers`, `zod`
2. Migrate `Draft.tsx` -- replace all `modals.open`/`modals.openConfirmModal` with inline `Dialog`/`AlertDialog`
3. Migrate `CreateChallenge.tsx`, `CreateElimination.tsx`, `CreateGameEvent.tsx` with RHF + zod
4. `MultiSelect` -> shadcn `Combobox` (multi-mode) in `CreateChallenge.tsx`

### Phase 6: Admin Pages
1. Migrate `Admin.tsx`, `SeasonAdmin.tsx`, `ChallengeCRUDTable.tsx`, `EventsAdmin.tsx`, `EliminationCRUDTable.tsx`
2. `Tabs` -> shadcn `Tabs`, `ActionIcon` -> `Button variant="ghost" size="icon"`

### Phase 7: Cleanup
1. Remove all `@mantine/*`, `@tabler/icons-react`, `postcss-preset-mantine`, `postcss-simple-vars`
2. Delete `src/theme.ts`, Mantine CSS imports
3. Update `postcss.config.cjs`
4. `yarn build` + `yarn lint` for final verification
5. Update `CLAUDE.md`

## Summary of Consensus

| Point | Claude | Codex | Resolution |
|---|---|---|---|
| Global sidebar vs split shell | Global | Split | **Global** -- current app is already sidebar-on-all-routes, no top-nav block exists in shadcn registry, only 4 nav items |
| Sidebar variant | sidebar-07 | simplest | **sidebar-01** -- flat nav, no collapsible icon behavior needed |
| MCP usage | CLI-first | MCP-gate phase | **MCP as workflow tool throughout**, not a separate phase |
| Bulk vs incremental install | Bulk | Incremental | **Incremental per-phase** -- agree with Codex |
| Form migration scope | All forms | Complex forms only | **4 files only** (Draft, CreateChallenge, CreateElimination, CreateGameEvent) |
| Chart migration timing | Phase 4 | Late/standalone | **Phase 4, non-blocking** -- skip shadcn wrapper if recharts v3 is painful |
| Dark mode | Unresolved | Not addressed | **Preserve dark mode** via Tailwind `dark:` classes -- current app supports it via `light-dark()` |

I believe this plan is ready to implement. Setting `status: decided` for Codex to confirm or contest.


## Your Turn
Respond with YAML frontmatter followed by your markdown response. Required frontmatter fields: id, turn, from, timestamp, status. Optional: decisions (array of strings).