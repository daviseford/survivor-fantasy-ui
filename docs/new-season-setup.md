# How to Add a New Season

This guide covers every step required to get a new season visible and functional on the site. Replace `XX` with the season number throughout.

## 1. Gather Assets

- **Player names** — full list of contestant names (save to `data/names.txt` or similar)
- **Player images** — one headshot per player as `.jpg` (naming convention: `Survivor-XX-Cast-Firstname-Lastname.jpg`)
- **Season logo** — the official season logo image (`.webp` or `.jpg`)

## 2. Create the Season Data File

Create `src/data/season_XX/index.ts` following the pattern in `src/data/season_46/index.ts`:

1. Define a `Players` const array with all contestant names (`as const`)
2. Define `PlayerName` and `SeasonNumber` types
3. Create a `buildPlayer` helper with `season_num: XX` and `season_id: "season_XX"`
4. Export these (all empty to start except players):
   - `SEASON_XX_PLAYERS` — array of `buildPlayer()` calls with name, image path, and optional description
   - `SEASON_XX_EPISODES` — empty array, fill in as episodes air
   - `SEASON_XX_CHALLENGES` — empty record
   - `SEASON_XX_ELIMINATIONS` — empty record
   - `SEASON_XX_EVENTS` — empty record

## 3. Add Images to Public Directory

1. Copy player images into `public/images/season_XX/`
2. Copy the season logo into `public/images/season_XX/season-XX-logo.webp`
3. Reference images in `buildPlayer()` calls as `/images/season_XX/Survivor-XX-Cast-Firstname-Lastname.jpg`

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
if (x.name !== "Survivor 46" && x.name !== "Survivor XX" && !slimUser?.isAdmin) return null;
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
