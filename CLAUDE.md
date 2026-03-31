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
- **Scrape season:** `yarn scrape <season_number>` (pull contestant data from Survivor Wiki)
- **Init season:** `yarn init-season <season_number>` (generate season data file from scraped JSON)
- **Backfill season:** `yarn backfill <season_number>` (merge re-scraped data into existing season file)

## Architecture

- **React 19 + TypeScript + Vite** SPA with Mantine v9 UI components
- **Routing:** react-router-dom v6, routes defined in `src/AppRoutes.tsx`
- **State/Data:** All hooks use raw Firebase `onSnapshot` for realtime Firestore/RTDB subscriptions (no react-query)
- **Firebase backend:** Firestore (seasons, competitions), Realtime Database (live drafts), Firebase Auth, hosted on Firebase Hosting
- **Dual database pattern:** Firestore for persistent read-heavy data (seasons, competitions, game events), Realtime Database for live collaborative state (drafts in progress)

## Key Patterns

- **Season data is hardcoded** in `src/data/` (players, episodes per season) and also stored in Firestore. The `SEASONS` map in `src/data/seasons.ts` is the local source of truth for season metadata.
- **Typed IDs:** Domain types use branded string IDs (`season_${number}`, `draft_${string}`, `episode_${string}`, etc.) defined in `src/types/index.ts`.
- **Hooks per entity:** Each Firestore/RTDB entity has a dedicated hook (`useSeason`, `useCompetition`, `useDraft`, `useChallenges`, `useEliminations`, `useEvents`). Hooks read route params via `useParams()` with optional ID override. All onSnapshot hooks include error callbacks.
- **CSS Modules** for component-scoped styles (`.module.css` files), PostCSS with `postcss-preset-mantine`.

## Admin Credentials

The `.env` file contains real admin credentials (USERNAME/PASSWORD). **NEVER use these to modify production season data** (episodes, challenges, eliminations, events, teams). Read-only operations and screenshots are safe. Ask before any write operations.

## Firebase Documentation

Use the Context7 MCP to fetch up-to-date Firebase documentation when working with Firebase features. Available libraries:

- `/websites/firebase_google` — Full Firebase docs (26k+ snippets)
- `/firebase/firebase-js-sdk` — Firebase JS SDK source/docs

## Deployment

Merges to `main` auto-deploy to Firebase Hosting via GitHub Actions (`.github/workflows/firebase-hosting-merge.yml`). PRs get preview deploys. Firebase project: `survivor-fantasy-51c4b`.
