# How to Add a New Season

This guide covers how to add or update a season. The primary data source is the [survivoR](https://github.com/doehm/survivoR) R dataset. The wiki is used only for player images.

## Quick Start

```bash
yarn new-season <N> [--force] [--push] [--dry-run]
```

This single command runs the full pipeline:

1. **Fetch survivoR data** — pulls castaways, episodes, challenge results, vote history, advantage details, tribe mapping, and journeys from the survivoR dataset
2. **Transform** — converts survivoR schema into the app's typed season data (players, episodes, challenges, eliminations, game events)
3. **Fetch wiki images** — downloads player headshots and bios from the Survivor Wiki (supplemental only)
4. **Generate season file** — creates `src/data/season_<N>/index.ts` with all typed exports
5. **Fetch season logo** — downloads the season logo from the wiki
6. **Register season** — adds the import and `SEASONS` map entry in `src/data/seasons.ts`
7. **Push to Firestore** — uploads the season document (only with `--push`)

### Flags

| Flag | Effect |
| ----------- | ------------------------------------------------------- |
| `--force` | Overwrite an existing season file |
| `--push` | Push the generated season to Firestore after generation |
| `--dry-run` | Run the pipeline without writing files |

### Post-generation

After running, verify the output:

```bash
yarn format && yarn tsc
```

## Alternative: Claude Code Slash Command

```
/add-season <N>
```

Wraps `yarn new-season` with input validation, progress reporting, post-generation verification (`yarn format && yarn tsc`), and automatic branch creation + commit.

## Batch Generation

To generate multiple seasons at once:

```bash
yarn tsx scripts/batch-new-season.ts --seasons 1-10 [--skip-wiki] [--force] [--push] [--dry-run]
```

This fetches survivoR data once and reuses it across all seasons, which is significantly faster than running `yarn new-season` in a loop.

## Automated Daily Sync

A GitHub Action (`.github/workflows/sync-survivor-data.yml`) runs daily at 14:00 UTC. It:

1. Runs `yarn sync-season` which detects seasons with new data in survivoR
2. Validates the generated data (monotonicity, ID integrity, duplicates)
3. Creates or updates a PR with the changes
4. Pushes updated data to Firestore

This means active seasons are kept in sync automatically — no manual updates needed during a season's airing.

## What Gets Generated

Each season file (`src/data/season_<N>/index.ts`) exports:

- `SEASON_<N>_CASTAWAY_LOOKUP` — `Record<CastawayId, { full_name, castaway }>` for display name resolution
- `SEASON_<N>_PLAYERS` — typed `Player[]` with castaway ID, name, image, age, hometown, description
- `SEASON_<N>_EPISODES` — typed `Episode[]` with merge/finale flags
- `SEASON_<N>_CHALLENGES` — typed challenge records with `winning_castaways` arrays
- `SEASON_<N>_ELIMINATIONS` — typed elimination records with vote counts and variants
- `SEASON_<N>_EVENTS` — typed game event records (idol finds, advantage plays, milestones)

## Re-running a Season

To regenerate a season with updated survivoR data:

```bash
yarn new-season <N> --force
```

## Data Gaps

The codegen marks unresolvable data gaps with TODO comments (e.g., `// TODO: resolve tribe winners to castaway IDs`). These indicate gaps in the survivoR dataset, typically for older seasons. When possible, resolve them manually by researching episode recaps and filling in the correct castaway IDs.
