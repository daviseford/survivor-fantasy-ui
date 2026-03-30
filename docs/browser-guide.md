# Browser & Screenshot Guide

Instructions for AI design skills (impeccable, frontend-design, etc.) to navigate and screenshot this app.

## Dev Server

Start the dev server:

```
yarn dev
```

Default URL: `http://localhost:5173`

## Taking Screenshots

Use the `agent-browser` skill (or `/agent-browser`) to interact with the running app:

```
/agent-browser navigate to http://localhost:5173 and take a screenshot
```

For specific pages:

```
/agent-browser navigate to http://localhost:5173/seasons and screenshot
```

For full-page captures with scrolling:

```
/agent-browser take a full page screenshot of http://localhost:5173/competitions
```

## App Routes

| Route                               | Page               | What It Shows                                              |
| ----------------------------------- | ------------------ | ---------------------------------------------------------- |
| `/`                                 | Home               | Landing page with hero section                             |
| `/seasons`                          | Seasons            | Grid of all Survivor seasons                               |
| `/seasons/:seasonId`                | Single Season      | Season details, players, episode scores                    |
| `/competitions`                     | Competitions       | User's competition list (requires auth)                    |
| `/competitions/:competitionId`      | Single Competition | Scores, player standings, charts, prop bets                |
| `/admin`                            | Admin Dashboard    | Season management, data upload (admin only)                |
| `/admin/:seasonId`                  | Season Admin       | CRUD for episodes, challenges, eliminations, events, teams |
| `/seasons/:seasonId/draft/:draftId` | Draft              | Live draft flow with stepper (Draft > Prop Bets > Summary) |

## Key Pages for Design Review

- **`/seasons`** — Main content grid. Good for testing card layouts and responsive behavior.
- **`/competitions/:id`** — Data-heavy page with scoring tables, charts, and badges. Best for testing data density and readability.
- **`/admin/:seasonId`** — Tab-based admin with CRUD forms and tables. Good for testing form layouts.
- **`/`** — Hero section with gradient text. Good for testing visual impact.

## Authentication

Some pages require login. To test authenticated pages:

1. Navigate to any auth-required page (e.g., `/competitions`)
2. You'll see a "register or log in" prompt
3. Use the login modal in the navbar

Admin pages (`/admin/*`) require a specific admin UID and won't render for regular users.

## Responsive Testing

The app uses Mantine's responsive breakpoints:

- **xs:** 36em (576px)
- **sm:** 48em (768px) — navbar collapses to mobile hamburger
- **md:** 62em (992px)
- **lg:** 75em (1200px)

Test at `sm` breakpoint to see mobile layout changes (hamburger nav, stacked grids).

## Playwright E2E Tests

Playwright is set up for automated browser screenshots and smoke tests.

### One-time setup

1. Ensure your `.env` file at the project root has admin credentials:

```
USERNAME=your-admin-email@example.com
PASSWORD=your-admin-password
```

2. Install the Chromium browser and authenticate:

```
npx playwright install chromium
yarn e2e:setup
```

This runs `e2e/auth.setup.ts`, which logs in via the UI and saves the session to `e2e/.auth/state.json`.

### Screenshot all pages

```
yarn e2e:screenshot
```

Screenshots are saved to `e2e/screenshots/` (git-ignored). Each route produces a file like `home.png`, `seasons.png`, `admin-dashboard.png`, etc.

### Re-authentication

If your session expires or screenshots show logged-out pages, re-run:

```
yarn e2e:setup
```

### Interactive mode

To run Playwright's interactive UI for debugging tests:

```
yarn e2e:ui
```

### Run all e2e tests (all viewports)

```
yarn e2e
```

This runs the screenshot tests against both desktop (1280x720) and mobile (375x812) viewports.

## Dark Mode

The app supports dark mode via Mantine's `light-dark()` CSS function. It follows the system preference. CSS modules in `src/` use `--mantine-color-*` variables that auto-adapt.
