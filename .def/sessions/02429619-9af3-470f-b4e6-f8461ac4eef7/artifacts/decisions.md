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
