# How to Add a New Season

This guide covers every step required to get a new season visible and functional on the site. Replace `XX` with the season number throughout.

## 1. Scrape Contestant Data

Run the scraper to pull contestant names and metadata from the Survivor Wiki:

```bash
yarn scrape XX
```

This fetches the season's cast table and each contestant's wiki page. Output is saved to `data/scraped/season_XX.json` with names, ages, hometowns, occupations, and previous season appearances.

No local data file is needed — the scraper discovers contestant names directly from the wiki.

## 2. Generate the Season Data File

```bash
yarn init-season XX
```

This reads the scraped JSON and creates `src/data/season_XX/index.ts` with:

- `Players` const array with all contestant names
- `PlayerName` and `SeasonNumber` types
- `buildPlayer` helper
- `SEASON_XX_PLAYERS` with scraped metadata (age, hometown, profession, previous seasons)
- Empty `SEASON_XX_EPISODES`, `SEASON_XX_CHALLENGES`, `SEASON_XX_ELIMINATIONS`, `SEASON_XX_EVENTS`

## 3. Add Images to Public Directory

1. Get player headshots as `.jpg` (naming convention: `Survivor-XX-Cast-Firstname-Lastname.jpg`)
2. Get the official season logo (`.webp` or `.jpg`)
3. Copy player images into `public/images/season_XX/`
4. Copy the season logo into `public/images/season_XX/season-XX-logo.webp`
5. Update image paths in the generated `src/data/season_XX/index.ts`

## 4. Register the Season

In `src/data/seasons.ts`:

1. Import `SEASON_XX_EPISODES` and `SEASON_XX_PLAYERS` from `./season_XX`
2. Add a `season_XX` entry to the `SEASONS` map:

```ts
season_XX: {
  id: "season_XX",
  order: XX,
  name: "Survivor XX",
  img: "/images/season_XX/season-XX-logo.webp",
  players: SEASON_XX_PLAYERS,
  episodes: SEASON_XX_EPISODES,
},
```

## 5. Add Admin Upload Button

In `src/pages/Admin.tsx`:

1. Add an upload function:

```ts
const uploadSXX = async () => {
  try {
    await setDoc(doc(db, "seasons", "season_XX"), SEASONS.season_XX);
    console.log("Done!");
  } catch (err) {
    console.error(err);
  }
};
```

2. Add a button in the `SimpleGrid`:

```tsx
<Button onClick={() => uploadSXX()}>Upload Season XX Data</Button>
```

## 6. Make the Season Visible to Users

In `src/pages/Seasons.tsx`, update the visibility filter to include the new season:

```ts
if (x.name !== "Survivor 46" && x.name !== "Survivor XX" && !slimUser?.isAdmin)
  return null;
```

## 7. Upload to Firestore

After deploying, go to `/admin` and click the **"Upload Season XX Data"** button. This pushes the season document to Firestore so the Seasons page can fetch it.

## 8. During the Season

As episodes air, fill in the following in `src/data/season_XX/index.ts`:

- **Episodes** — add entries to `SEASON_XX_EPISODES` with episode name, order, and merge/finale flags
- **Challenges** — add entries to `SEASON_XX_CHALLENGES` with winning players and challenge type (`reward`, `immunity`, `combined`)
- **Eliminations** — add entries to `SEASON_XX_ELIMINATIONS` with eliminated player, vote count, and variant (`tribal`, `medical`, `quitter`, etc.)
- **Game events** — add entries to `SEASON_XX_EVENTS` for idol finds, advantage plays, etc.

After updating, re-click the upload button on `/admin` to sync changes to Firestore.

## Re-scraping

If you need to update contestant metadata after the initial setup (e.g., wiki data was updated), use the backfill command:

```bash
yarn scrape XX    # re-scrape latest data
yarn backfill XX  # merge into existing season file
```

This preserves your image paths and episode data while updating player metadata.
