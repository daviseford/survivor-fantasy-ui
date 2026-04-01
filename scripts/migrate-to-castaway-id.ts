/**
 * Migration script: Translate Firestore/RTDB data from player display names to castaway_id.
 *
 * Reads from the pre-migration snapshot and generates a new document structure
 * in an output directory for inspection before uploading.
 *
 * Usage:
 *   yarn tsx scripts/migrate-to-castaway-id.ts [--upload]
 *
 * Without --upload: writes transformed data to data/migration-output/ for review.
 * With --upload: writes output AND pushes to Firebase (Firestore + RTDB).
 */

import * as fs from "fs";
import * as path from "path";

// Season data imports — these are the re-generated files with castaway_id
import {
  SEASON_1_CASTAWAY_LOOKUP,
  SEASON_1_EPISODES,
  SEASON_1_PLAYERS,
} from "../src/data/season_1/index.js";
import {
  SEASON_46_CASTAWAY_LOOKUP,
  SEASON_46_EPISODES,
  SEASON_46_PLAYERS,
} from "../src/data/season_46/index.js";
import {
  SEASON_48_CASTAWAY_LOOKUP,
  SEASON_48_EPISODES,
  SEASON_48_PLAYERS,
} from "../src/data/season_48/index.js";
import {
  SEASON_49_CASTAWAY_LOOKUP,
  SEASON_49_EPISODES,
  SEASON_49_PLAYERS,
} from "../src/data/season_49/index.js";
import {
  SEASON_50_CASTAWAY_LOOKUP,
  SEASON_50_EPISODES,
  SEASON_50_PLAYERS,
} from "../src/data/season_50/index.js";
import {
  SEASON_9_CASTAWAY_LOOKUP,
  SEASON_9_EPISODES,
  SEASON_9_PLAYERS,
} from "../src/data/season_9/index.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CastawayLookup = Record<string, { full_name: string; castaway: string }>;

interface MigrationSeason {
  seasonNum: number;
  seasonKey: string;
  lookup: CastawayLookup;
  reverseMap: Map<string, string>; // full_name / castaway / alias → castaway_id
  players: readonly any[];
  episodes: readonly any[];
}

// Known aliases: Firestore display name → survivoR full_name
const KNOWN_ALIASES: Record<string, string> = {
  "Ozzy Lusth": "Oscar Lusth",
  'Quintavius "Q" Burdette': "Q Burdette",
};

// Prop bet keys that contain player names (not Yes/No)
const PLAYER_PROP_BET_PREFIXES = [
  "propbet_winner",
  "propbet_idols",
  "propbet_immunities",
  "propbet_ftc",
  "propbet_first_vote",
];

// ---------------------------------------------------------------------------
// Build reverse name → castaway_id maps
// ---------------------------------------------------------------------------

function buildReverseMap(lookup: CastawayLookup): Map<string, string> {
  const map = new Map<string, string>();
  for (const [id, info] of Object.entries(lookup)) {
    map.set(info.full_name, id);
    map.set(info.full_name.toLowerCase(), id);
    map.set(info.castaway, id);
    map.set(info.castaway.toLowerCase(), id);
    // First name
    const firstName = info.full_name.split(" ")[0];
    if (!map.has(firstName)) map.set(firstName, id);
  }
  return map;
}

/**
 * Resolve a player display name to a castaway_id using exact then fuzzy matching.
 */
function resolveName(
  name: string,
  reverseMap: Map<string, string>,
): string | null {
  // Check known aliases first
  const aliased = KNOWN_ALIASES[name];
  if (aliased) return resolveName(aliased, reverseMap);

  // Exact match
  if (reverseMap.has(name)) return reverseMap.get(name)!;

  // Case-insensitive
  const lower = name.toLowerCase();
  if (reverseMap.has(lower)) return reverseMap.get(lower)!;

  // Strip quotes and extra whitespace
  const cleaned = name.replace(/["']/g, "").replace(/\s+/g, " ").trim();
  if (reverseMap.has(cleaned)) return reverseMap.get(cleaned)!;
  if (reverseMap.has(cleaned.toLowerCase()))
    return reverseMap.get(cleaned.toLowerCase())!;

  // Try first + last name only (handles middle names like "Tiffany Nicole Ervin")
  const parts = cleaned.split(" ");
  if (parts.length > 2) {
    const firstLast = `${parts[0]} ${parts[parts.length - 1]}`;
    if (reverseMap.has(firstLast)) return reverseMap.get(firstLast)!;
    if (reverseMap.has(firstLast.toLowerCase()))
      return reverseMap.get(firstLast.toLowerCase())!;
  }

  // Try nickname format: 'Quintavius "Q" Burdette' → match "Q"
  const nicknameMatch = name.match(/["']([^"']+)["']/);
  if (nicknameMatch) {
    const nickname = nicknameMatch[1];
    if (reverseMap.has(nickname)) return reverseMap.get(nickname)!;
  }

  // Substring match: check if any full_name contains/is contained by the input
  for (const [key, id] of reverseMap) {
    if (
      key.length > 3 &&
      (name.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(name.toLowerCase()))
    ) {
      return id;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Transform functions
// ---------------------------------------------------------------------------

function transformDraftPicks(
  picks: any[],
  season: MigrationSeason,
  warnings: string[],
): any[] {
  return picks.map((pick) => {
    const castawayId = resolveName(pick.player_name, season.reverseMap);
    if (!castawayId) {
      warnings.push(
        `[S${season.seasonNum}] Could not resolve draft pick "${pick.player_name}"`,
      );
      return pick; // leave as-is
    }
    return {
      ...pick,
      castaway_id: castawayId,
      // Keep player_name for display
    };
  });
}

function transformPropBets(
  propBets: any[],
  season: MigrationSeason,
  warnings: string[],
): any[] {
  return propBets.map((pb) => {
    const newValues = { ...pb.values };
    for (const [key, value] of Object.entries(newValues)) {
      if (!PLAYER_PROP_BET_PREFIXES.includes(key)) continue;
      if (!value || typeof value !== "string") continue;

      const castawayId = resolveName(value as string, season.reverseMap);
      if (castawayId) {
        newValues[key] = castawayId;
      } else {
        warnings.push(
          `[S${season.seasonNum}] Could not resolve prop bet ${key}="${value}"`,
        );
      }
    }
    return { ...pb, values: newValues };
  });
}

function transformCompetition(
  comp: any,
  seasons: Map<string, MigrationSeason>,
  warnings: string[],
): any {
  const season = seasons.get(comp.season_id);
  if (!season) {
    warnings.push(
      `Competition ${comp.id}: unknown season ${comp.season_id}, skipping`,
    );
    return comp;
  }

  const newComp = { ...comp };
  if (comp.draft_picks?.length) {
    newComp.draft_picks = transformDraftPicks(
      comp.draft_picks,
      season,
      warnings,
    );
  }
  if (comp.prop_bets?.length) {
    newComp.prop_bets = transformPropBets(comp.prop_bets, season, warnings);
  }
  return newComp;
}

function transformDraft(
  draft: any,
  seasons: Map<string, MigrationSeason>,
  warnings: string[],
): any | null {
  // Clean up drafts with no picks and undefined seasonId
  if (
    (!draft.draft_picks || draft.draft_picks.length === 0) &&
    !draft.season_id
  ) {
    return null; // Mark for deletion
  }

  const seasonId = draft.season_id;
  const season = seasons.get(seasonId);
  if (!season) {
    // Try to infer from draft picks
    const firstPick = draft.draft_picks?.[0];
    const inferredSeason = firstPick
      ? seasons.get(firstPick.season_id)
      : undefined;
    if (!inferredSeason) {
      warnings.push(
        `Draft ${draft.id || "unknown"}: unknown season ${seasonId}, skipping`,
      );
      return draft;
    }
  }

  const effectiveSeason =
    season || seasons.get(draft.draft_picks?.[0]?.season_id);
  if (!effectiveSeason) return draft;

  const newDraft = { ...draft };
  if (draft.draft_picks?.length) {
    newDraft.draft_picks = transformDraftPicks(
      draft.draft_picks,
      effectiveSeason,
      warnings,
    );
  }
  if (draft.prop_bets?.length) {
    newDraft.prop_bets = transformPropBets(
      draft.prop_bets,
      effectiveSeason,
      warnings,
    );
  }
  return newDraft;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const doUpload = args.has("--upload");

  const projectRoot = path.resolve(import.meta.dirname, "..");
  const snapshotDir = path.join(
    projectRoot,
    "data",
    "firestore-snapshots",
    "2026-04-01T16-44-36",
  );
  const outputDir = path.join(projectRoot, "data", "migration-output");

  if (!fs.existsSync(snapshotDir)) {
    console.error(`Snapshot directory not found: ${snapshotDir}`);
    process.exit(1);
  }

  // Build season data
  const seasonConfigs: MigrationSeason[] = [
    {
      seasonNum: 1,
      seasonKey: "season_1",
      lookup: SEASON_1_CASTAWAY_LOOKUP as unknown as CastawayLookup,
      reverseMap: buildReverseMap(
        SEASON_1_CASTAWAY_LOOKUP as unknown as CastawayLookup,
      ),
      players: SEASON_1_PLAYERS,
      episodes: SEASON_1_EPISODES,
    },
    {
      seasonNum: 9,
      seasonKey: "season_9",
      lookup: SEASON_9_CASTAWAY_LOOKUP as unknown as CastawayLookup,
      reverseMap: buildReverseMap(
        SEASON_9_CASTAWAY_LOOKUP as unknown as CastawayLookup,
      ),
      players: SEASON_9_PLAYERS,
      episodes: SEASON_9_EPISODES,
    },
    {
      seasonNum: 46,
      seasonKey: "season_46",
      lookup: SEASON_46_CASTAWAY_LOOKUP as unknown as CastawayLookup,
      reverseMap: buildReverseMap(
        SEASON_46_CASTAWAY_LOOKUP as unknown as CastawayLookup,
      ),
      players: SEASON_46_PLAYERS,
      episodes: SEASON_46_EPISODES,
    },
    {
      seasonNum: 48,
      seasonKey: "season_48",
      lookup: SEASON_48_CASTAWAY_LOOKUP as unknown as CastawayLookup,
      reverseMap: buildReverseMap(
        SEASON_48_CASTAWAY_LOOKUP as unknown as CastawayLookup,
      ),
      players: SEASON_48_PLAYERS,
      episodes: SEASON_48_EPISODES,
    },
    {
      seasonNum: 49,
      seasonKey: "season_49",
      lookup: SEASON_49_CASTAWAY_LOOKUP as unknown as CastawayLookup,
      reverseMap: buildReverseMap(
        SEASON_49_CASTAWAY_LOOKUP as unknown as CastawayLookup,
      ),
      players: SEASON_49_PLAYERS,
      episodes: SEASON_49_EPISODES,
    },
    {
      seasonNum: 50,
      seasonKey: "season_50",
      lookup: SEASON_50_CASTAWAY_LOOKUP as unknown as CastawayLookup,
      reverseMap: buildReverseMap(
        SEASON_50_CASTAWAY_LOOKUP as unknown as CastawayLookup,
      ),
      players: SEASON_50_PLAYERS,
      episodes: SEASON_50_EPISODES,
    },
  ];

  const seasonsByKey = new Map(seasonConfigs.map((s) => [s.seasonKey, s]));
  const warnings: string[] = [];

  // Create output directory
  fs.mkdirSync(outputDir, { recursive: true });

  console.log("=".repeat(60));
  console.log("Migration: player display names → castaway_id");
  console.log("=".repeat(60));
  console.log(`  Source:  ${snapshotDir}`);
  console.log(`  Output:  ${outputDir}`);
  console.log(`  Upload:  ${doUpload ? "YES" : "no (dry run)"}`);
  console.log();

  // --- 1. Season data (from re-generated files, already in castaway_id format) ---
  console.log("--- SEASON DATA (re-scraped, already castaway_id format) ---");
  for (const season of seasonConfigs) {
    const seasonOutDir = path.join(outputDir, "firestore", "seasons");
    fs.mkdirSync(seasonOutDir, { recursive: true });

    // The season doc includes players, episodes, castawayLookup
    const seasonDoc = {
      id: season.seasonKey,
      order: season.seasonNum,
      name: `Survivor ${season.seasonNum}`,
      img: "", // Will be populated from existing data
      players: season.players,
      episodes: season.episodes,
      castawayLookup: season.lookup,
    };

    // Read existing season doc for the img field
    const existingSeasonPath = path.join(
      snapshotDir,
      season.seasonKey,
      "seasons.json",
    );
    if (fs.existsSync(existingSeasonPath)) {
      const existing = JSON.parse(fs.readFileSync(existingSeasonPath, "utf-8"));
      seasonDoc.img = existing.img || "";
    }

    fs.writeFileSync(
      path.join(seasonOutDir, `${season.seasonKey}.json`),
      JSON.stringify(seasonDoc, null, 2),
    );
    console.log(
      `  ${season.seasonKey}: ${season.players.length} players, ${Object.keys(season.lookup).length} lookup entries`,
    );
  }
  console.log();

  // --- 2. Challenges, Eliminations, Events (from re-generated files) ---
  console.log("--- GAMEPLAY DATA (re-scraped, already castaway_id format) ---");
  for (const season of seasonConfigs) {
    // Read the re-scraped data from the season file by dynamically importing
    const seasonFilePath = path.resolve(
      projectRoot,
      "src",
      "data",
      season.seasonKey,
      "index.ts",
    );
    const mod = await import(
      new URL(`file:///${seasonFilePath.replace(/\\/g, "/")}`).href
    );

    const collections = ["challenges", "eliminations", "events"] as const;
    for (const col of collections) {
      const key = `SEASON_${season.seasonNum}_${col.toUpperCase()}`;
      const data = mod[key];
      if (data) {
        const colDir = path.join(outputDir, "firestore", col);
        fs.mkdirSync(colDir, { recursive: true });
        fs.writeFileSync(
          path.join(colDir, `${season.seasonKey}.json`),
          JSON.stringify(data, null, 2),
        );
        console.log(
          `  ${season.seasonKey}/${col}: ${Object.keys(data).length} entries`,
        );
      }
    }
  }
  console.log();

  // --- 3. Competitions (translate draft_picks and prop_bets) ---
  console.log("--- COMPETITIONS (translating player names → castaway_id) ---");
  const compsPath = path.join(snapshotDir, "competitions.json");
  const competitions = JSON.parse(fs.readFileSync(compsPath, "utf-8"));

  const transformedComps: Record<string, any> = {};
  for (const [id, comp] of Object.entries(competitions) as [string, any][]) {
    transformedComps[id] = transformCompetition(comp, seasonsByKey, warnings);
    const picks = transformedComps[id].draft_picks || [];
    const resolved = picks.filter((p: any) => p.castaway_id).length;
    console.log(
      `  ${id.slice(0, 30)}... (S${comp.season_num}): ${resolved}/${picks.length} picks resolved`,
    );
  }

  const compsOutDir = path.join(outputDir, "firestore", "competitions");
  fs.mkdirSync(compsOutDir, { recursive: true });
  fs.writeFileSync(
    path.join(compsOutDir, "all.json"),
    JSON.stringify(transformedComps, null, 2),
  );
  console.log();

  // --- 4. RTDB Drafts (translate draft_picks and prop_bets) ---
  console.log("--- RTDB DRAFTS (translating player names → castaway_id) ---");
  const draftsPath = path.join(snapshotDir, "rtdb_drafts.json");
  const drafts = JSON.parse(fs.readFileSync(draftsPath, "utf-8"));

  const transformedDrafts: Record<string, any> = {};
  const deletedDrafts: string[] = [];

  for (const [id, draft] of Object.entries(drafts) as [string, any][]) {
    const result = transformDraft(draft, seasonsByKey, warnings);
    if (result === null) {
      deletedDrafts.push(id);
      console.log(`  ${id.slice(0, 40)}... — DELETED (empty, no season)`);
    } else {
      transformedDrafts[id] = result;
      const picks = result.draft_picks || [];
      const resolved = picks.filter((p: any) => p.castaway_id).length;
      const seasonId = draft.season_id || picks[0]?.season_id || "unknown";
      console.log(
        `  ${id.slice(0, 40)}... (${seasonId}): ${resolved}/${picks.length} picks resolved`,
      );
    }
  }

  const draftsOutDir = path.join(outputDir, "rtdb");
  fs.mkdirSync(draftsOutDir, { recursive: true });
  fs.writeFileSync(
    path.join(draftsOutDir, "drafts.json"),
    JSON.stringify(transformedDrafts, null, 2),
  );
  if (deletedDrafts.length > 0) {
    fs.writeFileSync(
      path.join(draftsOutDir, "deleted_drafts.json"),
      JSON.stringify(deletedDrafts, null, 2),
    );
  }
  console.log();

  // --- Warnings ---
  if (warnings.length > 0) {
    console.log("--- WARNINGS ---");
    for (const w of warnings) {
      console.log(`  ⚠ ${w}`);
    }
    fs.writeFileSync(
      path.join(outputDir, "warnings.json"),
      JSON.stringify(warnings, null, 2),
    );
    console.log();
  }

  // --- Summary ---
  console.log("=".repeat(60));
  console.log("MIGRATION OUTPUT SUMMARY");
  console.log("=".repeat(60));
  console.log(`  Seasons: ${seasonConfigs.length}`);
  console.log(`  Competitions: ${Object.keys(transformedComps).length}`);
  console.log(
    `  Drafts: ${Object.keys(transformedDrafts).length} kept, ${deletedDrafts.length} deleted`,
  );
  console.log(`  Warnings: ${warnings.length}`);
  console.log(`  Output: ${outputDir}`);
  console.log();

  if (!doUpload) {
    console.log(
      "Dry run complete. Review the output directory before uploading.",
    );
    console.log("Run with --upload to push to Firebase.");
    return;
  }

  // --- Upload to Firebase ---
  console.log("--- UPLOADING TO FIREBASE ---");

  // Import admin SDK (triggers initialization)
  await import("./lib/admin.js");
  const { getFirestore } = await import("firebase-admin/firestore");
  const { getDatabase } = await import("firebase-admin/database");

  const db = getFirestore();
  const rtdb = getDatabase();

  // Upload Firestore season docs
  for (const season of seasonConfigs) {
    const docPath = path.join(
      outputDir,
      "firestore",
      "seasons",
      `${season.seasonKey}.json`,
    );
    const data = JSON.parse(fs.readFileSync(docPath, "utf-8"));
    await db.collection("seasons").doc(season.seasonKey).set(data);
    console.log(`  [OK] seasons/${season.seasonKey}`);

    // Upload challenges, eliminations, events
    for (const col of ["challenges", "eliminations", "events"]) {
      const colPath = path.join(
        outputDir,
        "firestore",
        col,
        `${season.seasonKey}.json`,
      );
      if (fs.existsSync(colPath)) {
        const colData = JSON.parse(fs.readFileSync(colPath, "utf-8"));
        await db.collection(col).doc(season.seasonKey).set(colData);
        console.log(`  [OK] ${col}/${season.seasonKey}`);
      }
    }
  }

  // Upload competitions
  for (const [id, comp] of Object.entries(transformedComps)) {
    await db.collection("competitions").doc(id).set(comp);
    console.log(`  [OK] competitions/${id.slice(0, 30)}...`);
  }

  // Upload RTDB drafts
  for (const [id, draft] of Object.entries(transformedDrafts)) {
    await rtdb.ref(`drafts/${id}`).set(draft);
    console.log(`  [OK] rtdb/drafts/${id.slice(0, 30)}...`);
  }

  // Delete empty drafts
  for (const id of deletedDrafts) {
    await rtdb.ref(`drafts/${id}`).remove();
    console.log(`  [DEL] rtdb/drafts/${id.slice(0, 30)}...`);
  }

  console.log();
  console.log("Upload complete!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
