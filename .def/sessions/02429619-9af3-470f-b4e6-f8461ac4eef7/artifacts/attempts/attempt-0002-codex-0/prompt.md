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


## Your Turn
Respond with YAML frontmatter followed by your markdown response. Required frontmatter fields: id, turn, from, timestamp, status. Optional: decisions (array of strings).