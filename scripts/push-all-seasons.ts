/**
 * Push all registered seasons to Firestore.
 *
 * Reads src/data/seasons.ts to discover every registered season,
 * then calls pushSeasonToFirestore for each one.
 *
 * Usage: yarn push-all-seasons [--dry-run]
 */

import * as fs from "fs";
import * as path from "path";
import { pushSeasonToFirestore } from "./lib/firebase-push.js";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");

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
  const seasonBlock = content.match(
    new RegExp(
      `season_${seasonNum}:\\s*\\{[\\s\\S]*?img:\\s*"([^"]*)"[\\s\\S]*?\\}`,
    ),
  );
  return seasonBlock?.[1] ?? "";
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  const seasonsFilePath = path.join(PROJECT_ROOT, "src", "data", "seasons.ts");
  const seasonNums = getRegisteredSeasons(seasonsFilePath).sort(
    (a, b) => a - b,
  );

  console.log(
    `Found ${seasonNums.length} registered seasons: ${seasonNums.join(", ")}`,
  );
  if (dryRun) {
    console.log("[DRY RUN] Will log what would be pushed without writing.\n");
  }

  let success = 0;
  let failed = 0;
  const failures: number[] = [];

  for (const seasonNum of seasonNums) {
    const seasonImg = getSeasonImg(seasonsFilePath, seasonNum);
    console.log(`\n--- Season ${seasonNum} ---`);

    try {
      await pushSeasonToFirestore(seasonNum, dryRun, seasonImg);
      success++;
    } catch (err) {
      failed++;
      failures.push(seasonNum);
      console.error(
        `  [ERROR] Season ${seasonNum} failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  console.log(`\n${"=".repeat(40)}`);
  console.log(`Done. ${success} succeeded, ${failed} failed.`);
  if (failures.length > 0) {
    console.log(`Failed seasons: ${failures.join(", ")}`);
  }
}

main().catch((err) => {
  console.error("Push all seasons failed:", err);
  process.exit(1);
});
