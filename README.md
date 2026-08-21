# Grab Your Torch

[Grab Your Torch](https://grabyourtorch.com/) is a spoiler-free fantasy league
for Survivor fans. Create a competition, draft castaways with friends, and score
the moments that shape each season without revealing episodes you have not
watched yet.

## Features

- Live, collaborative drafts
- Competitions spanning all 50 US Survivor seasons
- Configurable scoring for challenges, advantages, eliminations, and other events
- Watch-along progression that keeps results and scores spoiler-free
- Trade support and real-time standings

## Development

Grab Your Torch is a React 19 and TypeScript application built with Vite,
Mantine, and Firebase.

```sh
yarn install
yarn dev
```

Copy `.env.example` to `.env` and add the required Firebase configuration values
before starting the app. Use `yarn ci` to run the same formatting, linting,
type-checking, tests, and build checks used in GitHub Actions.

## Production

The production app is available at [grabyourtorch.com](https://grabyourtorch.com/).
Merges to `main` deploy automatically through Firebase Hosting.
