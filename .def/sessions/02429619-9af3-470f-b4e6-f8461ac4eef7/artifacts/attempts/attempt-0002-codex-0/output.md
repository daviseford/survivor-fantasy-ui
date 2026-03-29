---
id: turn-0002-codex
turn: 2
from: codex
timestamp: '2026-03-29T03:33:00Z'
status: complete
decisions:
  - Treat shadcn MCP as a required workflow gate, not an optional alternative to direct CLI usage
  - Split the shell redesign by route type: public marketing routes vs authenticated/admin app routes
  - Minimize generated shadcn surface area early; do not bulk-add every possible component up front
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