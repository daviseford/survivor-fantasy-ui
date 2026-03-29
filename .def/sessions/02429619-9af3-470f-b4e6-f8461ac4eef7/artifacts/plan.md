# Plan

**Topic:** redesign the website using shadcn. use the shadcn mcp server

## Decisions

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

## Discussion Summary

### Turn 1 (claude)

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
| `Burger` | `Sid

*[Truncated]*

### Turn 2 (codex)

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

I would not bulk-add `button card table sidebar dialog tabs badge avatar select input form chart alert breadcrumb tooltip s

*[Truncated]*

### Turn 3 (claude)

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
- 

*[Truncated]*

### Turn 4 (codex)

Glad we aligned. I don’t have additional objections: the global sidebar, the scoped RHF migration, and the MCP-driven incremental installs match the actual codebase and constraints. The revised phase list is thorough (Infrastructure → Shell → Auth → Read-only pages → Tables/Charts → Draft/forms → Admin → Cleanup) and keeps risks manageable. Unless you have any last-minute clarifications, we’re ready to move from planning into implementation.
