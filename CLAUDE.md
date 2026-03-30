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

## Architecture

- **React 18 + TypeScript + Vite** SPA with Mantine v7 UI components
- **Routing:** react-router-dom v6, routes defined in `src/AppRoutes.tsx`
- **State/Data:** react-query v3 with `@react-query-firebase/firestore` for Firestore queries; some hooks use raw `onSnapshot` for realtime subscriptions
- **Firebase backend:** Firestore (seasons, competitions), Realtime Database (live drafts), Firebase Auth, hosted on Firebase Hosting
- **Dual database pattern:** Firestore for persistent read-heavy data (seasons, competitions, game events), Realtime Database for live collaborative state (drafts in progress)

## Key Patterns

- **Season data is hardcoded** in `src/data/` (players, episodes per season) and also stored in Firestore. The `SEASONS` map in `src/data/seasons.ts` is the local source of truth for season metadata.
- **Typed IDs:** Domain types use branded string IDs (`season_${number}`, `draft_${string}`, `episode_${string}`, etc.) defined in `src/types/index.ts`.
- **Hooks per entity:** Each Firestore/RTDB entity has a dedicated hook (`useSeason`, `useCompetition`, `useDraft`, `useChallenges`, `useEliminations`, `useEvents`). Hooks read route params via `useParams()` with optional ID override.
- **CSS Modules** for component-scoped styles (`.module.css` files), PostCSS with `postcss-preset-mantine`.

## Firebase Documentation

Use the Context7 MCP to fetch up-to-date Firebase documentation when working with Firebase features. Available libraries:
- `/websites/firebase_google` — Full Firebase docs (26k+ snippets)
- `/firebase/firebase-js-sdk` — Firebase JS SDK source/docs

## Deployment

Merges to `main` auto-deploy to Firebase Hosting via GitHub Actions (`.github/workflows/firebase-hosting-merge.yml`). PRs get preview deploys. Firebase project: `survivor-fantasy-51c4b`.
