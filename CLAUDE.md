# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Survivor Fantasy is a fantasy sports-style web app for the TV show Survivor. Users create competitions, draft contestants, and earn points based on in-game events (challenge wins, idol plays, eliminations, etc.). The scoring engine is in `src/utils/scoringUtils.ts` with rules defined in `src/data/scoring.ts`.

## Commands

- **Dev server:** `yarn dev`
- **Build:** `yarn build` (runs `tsc && vite build`)
- **Lint:** `yarn lint` (ESLint, zero warnings allowed)
- **Format:** `yarn format` (Prettier with `prettier-plugin-organize-imports`)
- **Type check:** `yarn tsc`
- **Test:** `yarn test` (vitest)
- **Pre-push check:** `yarn prepush` (format + lint --fix + tsc)
- **Deploy:** `yarn deploy:local` (prepush + build + firebase deploy)
- **E2E screenshots:** `yarn e2e:screenshot` (Playwright — screenshots all pages)
- **E2E auth setup:** `yarn e2e:setup` (login once, save session for reuse)
- **E2E interactive:** `yarn e2e:ui` (Playwright UI mode)
- **New season (preferred):** `yarn new-season <season_number> [--force] [--push]` (scrapes players + results, generates full season file, registers in seasons.ts, optionally pushes to Firestore)
- **Add season (slash command):** `/add-season <season_number>` — preferred way to add a new season in Claude Code; wraps `yarn new-season` with validation, progress reporting, and post-generation verification
- **Batch new seasons:** `yarn tsx scripts/batch-new-season.ts [season_numbers...] [--force] [--skip-wiki] [--push] [--dry-run]` (generate multiple seasons in one run; fetches survivoR tables once, then iterates)
- **Push seasons to Firestore:** `yarn tsx scripts/push-seasons.ts [season_numbers...] [--dry-run] [--collections events,challenges]` (push existing local season data to Firestore without regenerating)
- **Push all seasons:** `yarn tsx scripts/push-all-seasons.ts [--dry-run]` (push all registered seasons to Firestore)
- **Snapshot Firestore:** `yarn tsx scripts/snapshot-firestore.ts` (backup Firestore + RTDB to `data/firestore-snapshots/`)
- **Validate Firestore sync:** `yarn tsx scripts/validate-firestore-sync.ts [season_numbers...] [--snapshot <dir>]` (compare local season data against Firestore snapshot to detect missing/mismatched events)
- **Compare Firestore:** `yarn tsx scripts/compare-firestore.ts <season_number>` (read-only comparison of scraped results vs Firestore data)
- **Sync season (CI):** `yarn tsx scripts/sync-season.ts` (automated sync for active season — detects new episodes, validates, pushes to Firestore)
- **Migrate to castaway_id:** `yarn tsx scripts/migrate-to-castaway-id.ts [--upload]` (translate Firestore/RTDB from player names to castaway_id; writes to `data/migration-output/` for review, `--upload` pushes to Firebase)
- **Migrate competition state:** `yarn tsx scripts/migrate-competition-state.ts [--upload]` (backfill competition lifecycle state — sets `finished` based on win_survivor event; dry-run by default)
- **Cleanup abandoned drafts:** `yarn tsx scripts/cleanup-abandoned-drafts.ts` (delete drafts from RTDB that are unfinished and older than 7 days)
- **Set admin claim:** `yarn tsx scripts/set-admin-claim.ts <uid>` (set Firebase Auth admin custom claim on a user)
- **Optimize images:** `yarn tsx scripts/optimize-images.ts` (resize and compress all images in `public/images/`)
- **Generate web assets:** `yarn tsx scripts/generate-web-assets.ts` (generate favicon PNGs, apple-touch-icon, and OG image from SVG source)

## Data Source

**survivoR is the authoritative data source.** Always prefer survivoR data (the R dataset at `github.com/doehm/survivoR`) over wiki scraping. The wiki scraper is retained only for player images. When data conflicts between survivoR and the wiki, trust survivoR.

**Finale rule:** An episode is the finale only if a winner has been declared (`castaways.winner === true`). If the season is still in progress (no winner in survivoR data), no episode should be flagged as `isFinale`. See `docs/survivor-data-reference.md` for full transformation rules.

## Architecture

- **React 19 + TypeScript + Vite** SPA with Mantine v9 UI components
- **Routing:** react-router-dom v6, routes defined in `src/AppRoutes.tsx`
- **State/Data:** All hooks use raw Firebase `onSnapshot` for realtime Firestore/RTDB subscriptions (no react-query)
- **Firebase backend:** Firestore (seasons, competitions), Realtime Database (live drafts), Firebase Auth, hosted on Firebase Hosting
- **Dual database pattern:** Firestore for persistent read-heavy data (seasons, competitions, game events), Realtime Database for live collaborative state (drafts in progress)
- **Documented solutions:** `docs/solutions/` contains past problem resolutions organized by category with YAML frontmatter (`module`, `tags`, `problem_type`). Relevant when debugging or implementing in documented areas.

## Key Patterns

- **Season data is hardcoded** in `src/data/` (players, episodes per season) and also stored in Firestore. The `SEASONS` map in `src/data/seasons.ts` is the local source of truth for season metadata. Each season exports `SEASON_XX_PLAYERS`, `SEASON_XX_EPISODES`, and `SEASON_XX_CASTAWAY_LOOKUP` (a `Record<CastawayId, { full_name, castaway }>` for display name resolution).
- **Typed IDs:** Domain types use branded string IDs (`season_${number}`, `draft_${string}`, `episode_${string}`, `US${string}` for `CastawayId`, etc.) defined in `src/types/index.ts`. `CastawayId` uses survivoR's format (e.g., `US0693`) as the canonical player identifier.
- **Hooks per entity:** Each Firestore/RTDB entity has a dedicated hook (`useSeason`, `useCompetition`, `useDraft`, `useChallenges`, `useEliminations`, `useEvents`). Hooks read route params via `useParams()` with optional ID override. All onSnapshot hooks include error callbacks.
- **CSS Modules** for component-scoped styles (`.module.css` files), PostCSS with `postcss-preset-mantine`.

## Spoiler-Free Experience

**This is a core feature.** The app supports "watch along" mode where users progress through episodes at their own pace. Results (eliminations, challenge wins, idol plays, scores, player status) must NEVER be revealed beyond the episode a user's competition is currently on. When building or modifying any UI that displays game data, always scope it to the competition's current episode. This applies to leaderboards, player cards, scoring breakdowns, and all result-bearing UI.

## Admin Credentials

The `.env` file contains real admin credentials (USERNAME/PASSWORD). **NEVER use these to modify production season data** (episodes, challenges, eliminations, events, teams). Read-only operations and screenshots are safe. Ask before any write operations.

## Firebase Documentation

Use the Context7 MCP to fetch up-to-date Firebase documentation when working with Firebase features. Available libraries:

- `/websites/firebase_google` — Full Firebase docs (26k+ snippets)
- `/firebase/firebase-js-sdk` — Firebase JS SDK source/docs

## Deployment

Merges to `main` auto-deploy to Firebase Hosting via GitHub Actions (`.github/workflows/firebase-hosting-merge.yml`). PRs get preview deploys. Firebase project: `survivor-fantasy-51c4b`.
