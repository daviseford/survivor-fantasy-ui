#!/usr/bin/env node
/**
 * CLI tool to scrape Survivor contestant metadata from wiki sources
 * and generate playerMeta.ts files for the app.
 *
 * Usage:
 *   yarn scrape:contestants --season 50 --dry-run
 *   yarn scrape:contestants --season 50 --write
 *   yarn scrape:contestants --season 50 --format json
 */
import { resolve } from "node:path";
import { APP_PLAYERS } from "./scraper/app-players.js";
import {
  generatePlayerMetaSource,
  writePlayerMeta,
} from "./scraper/emit-ts.js";
import { matchContestants } from "./scraper/normalize.js";
import { fandomSource } from "./scraper/sources/fandom.js";

function parseArgs(args: string[]) {
  let season: number | undefined;
  let dryRun = false;
  let force = false;
  let format: "ts" | "json" = "ts";

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--season":
      case "-s":
        season = parseInt(args[++i], 10);
        break;
      case "--dry-run":
        dryRun = true;
        break;
      case "--write":
        dryRun = false;
        break;
      case "--force":
        force = true;
        break;
      case "--format":
        format = args[++i] as "ts" | "json";
        break;
    }
  }

  return { season, dryRun, force, format };
}

async function main() {
  const { season, dryRun, force, format } = parseArgs(process.argv.slice(2));

  if (!season) {
    console.error(
      "Usage: yarn scrape:contestants --season <number> [--dry-run] [--write] [--force] [--format json|ts]",
    );
    console.error("\nAvailable seasons:", Object.keys(APP_PLAYERS).join(", "));
    process.exit(1);
  }

  const appNames = APP_PLAYERS[season];
  if (!appNames) {
    console.error(`No app player names found for season ${season}.`);
    console.error("Available seasons:", Object.keys(APP_PLAYERS).join(", "));
    process.exit(1);
  }

  console.log(`\n=== Scraping Season ${season} ===\n`);
  console.log(`App players: ${appNames.length}`);
  console.log(`Source: ${fandomSource.name}`);
  console.log(`Mode: ${dryRun ? "DRY RUN" : "WRITE"}`);
  console.log();

  // Scrape
  const scraped = await fandomSource.scrapeSeason(season);
  console.log(`\nScraped ${scraped.length} contestants from wiki.\n`);

  // Match
  const report = matchContestants(scraped, appNames, season);

  console.log(`Matched: ${report.matched.length}/${appNames.length}`);

  if (report.unmatched.length > 0) {
    console.log(`\n[UNMATCHED WIKI NAMES] (${report.unmatched.length}):`);
    for (const c of report.unmatched) {
      console.log(`  - "${c.scrapedName}"`);
    }
    console.log(
      "  -> Add entries to scripts/scraper/overrides.ts to fix these.",
    );
  }

  if (report.unmatchedAppNames.length > 0) {
    console.log(
      `\n[UNMATCHED APP NAMES] (${report.unmatchedAppNames.length}):`,
    );
    for (const name of report.unmatchedAppNames) {
      console.log(`  - "${name}"`);
    }
  }

  // Fail closed: exit non-zero if matching is incomplete
  const hasUnmatched =
    report.unmatched.length > 0 || report.unmatchedAppNames.length > 0;
  if (hasUnmatched && !force) {
    console.error(
      "\n[ERROR] Matching is incomplete. Fix overrides in scripts/scraper/overrides.ts or use --force to proceed anyway.",
    );
    process.exit(1);
  }
  if (hasUnmatched && force) {
    console.log("\n[WARN] Proceeding with incomplete matches (--force).");
  }

  // Output
  if (format === "json") {
    const output: Record<string, unknown> = {};
    for (const m of report.matched) {
      output[m.appName] = m.meta;
    }
    console.log("\n" + JSON.stringify(output, null, 2));
    return;
  }

  // TypeScript output
  if (dryRun) {
    console.log("\n--- Generated playerMeta.ts (dry run) ---\n");
    console.log(generatePlayerMetaSource(season, report.matched));
    return;
  }

  // Write mode
  const projectRoot = resolve(import.meta.dirname, "..");
  const filePath = writePlayerMeta(season, report.matched, projectRoot);
  console.log(`\nWrote: ${filePath}`);
  console.log(
    "Next: run `yarn format` to format the generated file, then use Admin upload to push to Firestore.",
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
