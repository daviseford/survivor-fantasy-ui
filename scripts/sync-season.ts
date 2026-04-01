/**
 * Automated season data sync for CI.
 *
 * Detects new seasons in survivoR, syncs episode/challenge/elimination/event
 * data for the active season, validates, pushes to Firestore, and writes
 * a structured result file for the GitHub Actions workflow to consume.
 *
 * Usage: yarn tsx scripts/sync-season.ts
 */

import * as fs from "fs";
import * as path from "path";
import { generateFullSeasonFile, registerSeason } from "./lib/codegen.js";
import { pushSeasonToFirestore } from "./lib/firebase-push.js";
import { fetchSeasonData, fetchTable } from "./lib/survivor-client.js";
import {
  transformPlayers,
  transformResults,
} from "./lib/survivor-transformer.js";
import type { SurvivorCastaway } from "./lib/survivor-types.js";
import { validateSeasonData } from "./lib/validate-season.js";

interface SyncResult {
  changed: boolean;
  seasonNum: number;
  isNewSeason: boolean;
  error?: string;
  firestorePushed?: boolean;
  summary?: {
    episodes: number;
    challenges: number;
    eliminations: number;
    events: number;
  };
  warnings?: string[];
}

function writeResult(resultPath: string, result: SyncResult): void {
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
}

/**
 * Parse registered season numbers from src/data/seasons.ts.
 */
function getRegisteredSeasons(seasonsFilePath: string): number[] {
  const content = fs.readFileSync(seasonsFilePath, "utf-8");
  const matches = [...content.matchAll(/season_(\d+):/g)];
  return matches.map((m) => Number(m[1]));
}

/**
 * Extract the season image from seasons.ts for Firestore push.
 */
function getSeasonImg(seasonsFilePath: string, seasonNum: number): string {
  const content = fs.readFileSync(seasonsFilePath, "utf-8");
  // Match the img field in the season entry
  const seasonBlock = content.match(
    new RegExp(
      `season_${seasonNum}:\\s*\\{[\\s\\S]*?img:\\s*"([^"]*)"[\\s\\S]*?\\}`,
    ),
  );
  return seasonBlock?.[1] ?? "";
}

/**
 * Count episodes in an existing season file by matching episode object entries.
 * Uses a pattern that only matches the episode definition (not episode_id refs).
 */
function countExistingEpisodes(filePath: string): number {
  if (!fs.existsSync(filePath)) return 0;
  const content = fs.readFileSync(filePath, "utf-8");
  const matches = content.match(/^\s+id: "episode_\d+",$/gm);
  return matches?.length ?? 0;
}

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const RESULT_PATH = path.join(PROJECT_ROOT, "sync-result.json");

async function main(): Promise<void> {
  const seasonsFilePath = path.join(PROJECT_ROOT, "src", "data", "seasons.ts");

  // Phase 1: Detect — find active season and check for new seasons
  console.log("Phase 1: Detecting active season...");

  const allCastaways = await fetchTable<SurvivorCastaway>("castaways");
  const usCastaways = allCastaways.filter((c) => c.version === "US");
  const survivorSeasons = [...new Set(usCastaways.map((c) => c.season))].sort(
    (a, b) => a - b,
  );
  const registeredSeasons = getRegisteredSeasons(seasonsFilePath);
  const highestRegistered = Math.max(...registeredSeasons);
  const highestInSurvivor = Math.max(...survivorSeasons);

  console.log(
    `  Registered seasons: ${registeredSeasons.sort((a, b) => a - b).join(", ")}`,
  );
  console.log(`  survivoR seasons: ${survivorSeasons.join(", ")}`);

  const isNewSeason = highestInSurvivor > highestRegistered;
  const seasonNum = isNewSeason ? highestInSurvivor : highestRegistered;

  if (isNewSeason) {
    console.log(`  New season detected: ${seasonNum} (not yet registered)`);
  } else {
    console.log(`  Syncing highest registered season: ${seasonNum}`);
  }

  // Phase 2: Fetch + Generate
  console.log(`\nPhase 2: Fetching survivoR data for season ${seasonNum}...`);

  const seasonData = await fetchSeasonData(seasonNum);
  if (seasonData.castaways.length === 0) {
    const result: SyncResult = {
      changed: false,
      seasonNum,
      isNewSeason,
      warnings: [`No castaways found in survivoR for season ${seasonNum}`],
    };
    writeResult(RESULT_PATH, result);
    console.log(`  No castaways found — nothing to sync.`);
    return;
  }

  const playerData = transformPlayers(seasonData, seasonNum);
  const resultsData = transformResults(seasonData, seasonNum);

  console.log("  Generating season file...");
  const generatedContent = generateFullSeasonFile(
    playerData,
    resultsData,
    seasonNum,
  );

  // Phase 3: Compare
  const seasonKey = `season_${seasonNum}`;
  const seasonDir = path.join(PROJECT_ROOT, "src", "data", seasonKey);
  const seasonFilePath = path.join(seasonDir, "index.ts");

  if (!isNewSeason && fs.existsSync(seasonFilePath)) {
    const existingContent = fs.readFileSync(seasonFilePath, "utf-8");
    if (existingContent === generatedContent) {
      const result: SyncResult = {
        changed: false,
        seasonNum,
        isNewSeason: false,
      };
      writeResult(RESULT_PATH, result);
      console.log("\nPhase 3: No changes detected. Exiting.");
      return;
    }
    console.log("\nPhase 3: Changes detected.");
  } else {
    console.log(
      `\nPhase 3: ${isNewSeason ? "New season" : "File missing"} — will create.`,
    );
  }

  // Phase 4: Validate
  console.log("\nPhase 4: Validating data...");
  const existingEpisodeCount = isNewSeason
    ? undefined
    : countExistingEpisodes(seasonFilePath);
  const validation = validateSeasonData(
    playerData,
    resultsData,
    existingEpisodeCount,
  );

  if (!validation.valid) {
    const result: SyncResult = {
      changed: true,
      seasonNum,
      isNewSeason,
      error: `Validation failed: ${validation.errors.join("; ")}`,
      firestorePushed: false,
      warnings: validation.warnings,
    };
    writeResult(RESULT_PATH, result);
    console.error("  Validation failed:");
    for (const err of validation.errors) {
      console.error(`    - ${err}`);
    }
    process.exit(1);
  }

  if (validation.warnings.length > 0) {
    console.log("  Warnings:");
    for (const w of validation.warnings) {
      console.log(`    - ${w}`);
    }
  }
  console.log("  Validation passed.");

  // Phase 5: Write + Push
  console.log("\nPhase 5: Writing file and pushing to Firestore...");

  // Write the generated file
  if (!fs.existsSync(seasonDir)) {
    fs.mkdirSync(seasonDir, { recursive: true });
  }
  fs.writeFileSync(seasonFilePath, generatedContent);
  console.log(`  Wrote: ${seasonFilePath}`);

  // For new seasons, register in seasons.ts
  if (isNewSeason) {
    registerSeason(seasonNum, seasonsFilePath, "");
  }

  // Push to Firestore
  const seasonImg = isNewSeason ? "" : getSeasonImg(seasonsFilePath, seasonNum);
  let firestorePushed = false;
  let firestoreError: string | undefined;

  try {
    await pushSeasonToFirestore(seasonNum, false, seasonImg);
    firestorePushed = true;
    console.log("  Firestore push successful.");
  } catch (err) {
    firestoreError = err instanceof Error ? err.message : String(err);
    console.error(`  Firestore push failed: ${firestoreError}`);
  }

  const result: SyncResult = {
    changed: true,
    seasonNum,
    isNewSeason,
    firestorePushed,
    ...(firestoreError
      ? { error: `Firestore push failed: ${firestoreError}` }
      : {}),
    summary: {
      episodes: resultsData.episodes.length,
      challenges: resultsData.challenges.length,
      eliminations: resultsData.eliminations.length,
      events: resultsData.events.length,
    },
    warnings: validation.warnings,
  };
  writeResult(RESULT_PATH, result);

  console.log("\nSync complete!");
  console.log(`  Season: ${seasonNum}`);
  console.log(`  New season: ${isNewSeason}`);
  console.log(`  Episodes: ${resultsData.episodes.length}`);
  console.log(`  Challenges: ${resultsData.challenges.length}`);
  console.log(`  Eliminations: ${resultsData.eliminations.length}`);
  console.log(`  Events: ${resultsData.events.length}`);
  console.log(`  Firestore pushed: ${firestorePushed}`);
}

main().catch((err) => {
  const result: SyncResult = {
    changed: false,
    seasonNum: 0,
    isNewSeason: false,
    error: err instanceof Error ? err.message : String(err),
    firestorePushed: false,
  };
  writeResult(RESULT_PATH, result);
  console.error("Sync failed:", err);
  process.exit(1);
});
