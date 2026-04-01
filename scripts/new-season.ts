/**
 * Season Bootstrap CLI — one command to scaffold a complete season.
 *
 * Usage: yarn new-season <N> [--push] [--force] [--dry-run] [--source=survivoR|wiki]
 *
 * Steps:
 *   1. Fetch player data (from survivoR or wiki)
 *   2. Fetch results data (from survivoR or wiki)
 *   3. Generate full season data file
 *   4. Register season in src/data/seasons.ts
 *   5. (optional) Push to Firestore with --push
 *
 * Data sources:
 *   --source=survivoR (default) — structured data from survivoR GitHub dataset
 *   --source=wiki — legacy wiki scraping (slower, more fragile)
 */

import * as fs from "fs";
import * as path from "path";
import { generateFullSeasonFile, registerSeason } from "./lib/codegen.js";
import { pushSeasonToFirestore } from "./lib/firebase-push.js";
import { fetchSeasonData } from "./lib/survivor-client.js";
import {
  transformPlayers,
  transformResults,
} from "./lib/survivor-transformer.js";
import { downloadImage, fetchSeasonLogoUrl } from "./lib/wiki-api.js";
import { scrapeResults } from "./scrape-results.js";
import { scrape } from "./scrape.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith("--")));
  const positional = args.filter((a) => !a.startsWith("--"));

  const seasonNum = Number(positional[0]);
  const force = flags.has("--force");
  const push = flags.has("--push");
  const dryRun = flags.has("--dry-run");
  const sourceFlag = [...flags].find((f) => f.startsWith("--source="));
  const source = sourceFlag ? sourceFlag.split("=")[1] : "survivoR";

  if (!seasonNum || isNaN(seasonNum)) {
    console.error(
      "Usage: yarn new-season <season_number> [--push] [--force] [--dry-run] [--source=survivoR|wiki]",
    );
    console.error("Example: yarn new-season 51");
    process.exit(1);
  }

  if (source !== "survivoR" && source !== "wiki") {
    console.error(`Invalid --source value: ${source}`);
    console.error(`Valid options: survivoR, wiki`);
    process.exit(1);
  }

  const projectRoot = path.resolve(import.meta.dirname, "..");
  const seasonKey = `season_${seasonNum}`;
  const outputDir = path.join(projectRoot, "src", "data", seasonKey);
  const outputPath = path.join(outputDir, "index.ts");
  const seasonsFilePath = path.join(projectRoot, "src", "data", "seasons.ts");

  // Check if output already exists
  if (fs.existsSync(outputPath) && !force) {
    console.error(`Season data file already exists: ${outputPath}`);
    console.error(`Use --force to overwrite.`);
    process.exit(1);
  }

  let playerData;
  let resultsData;

  if (source === "survivoR") {
    // Fetch from survivoR (structured dataset)
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Step 1/5: Fetching survivoR data for Season ${seasonNum}`);
    console.log(`${"=".repeat(60)}`);
    const seasonData = await fetchSeasonData(seasonNum);

    console.log(`\n${"=".repeat(60)}`);
    console.log(`Step 2/5: Transforming survivoR data`);
    console.log(`${"=".repeat(60)}`);
    playerData = transformPlayers(seasonData, seasonNum);
    resultsData = transformResults(seasonData, seasonNum);
  } else {
    // Legacy: Scrape from Survivor Wiki
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Step 1/5: Scraping player data for Season ${seasonNum}`);
    console.log(`${"=".repeat(60)}`);
    playerData = await scrape(seasonNum);

    console.log(`\n${"=".repeat(60)}`);
    console.log(`Step 2/5: Scraping results data for Season ${seasonNum}`);
    console.log(`${"=".repeat(60)}`);
    resultsData = await scrapeResults(seasonNum);
  }

  // Step 3: Generate full season file
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Step 3/5: Generating season data file`);
  console.log(`${"=".repeat(60)}`);

  const fileContent = generateFullSeasonFile(
    playerData,
    resultsData,
    seasonNum,
  );

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, fileContent);
  console.log(`  Created: ${outputPath}`);

  // Step 4: Register in seasons.ts (with logo from wiki)
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Step 4/5: Registering season in seasons.ts`);
  console.log(`${"=".repeat(60)}`);

  console.log(`  Fetching season logo from wiki...`);
  const logoUrl = await fetchSeasonLogoUrl(seasonNum);
  let localLogoPath = "";
  if (logoUrl) {
    const imgDir = path.join(projectRoot, "public", "images", seasonKey);
    const ext = path.extname(new URL(logoUrl).pathname) || ".png";
    const logoFileName = `season-${seasonNum}-logo${ext}`;
    const destPath = path.join(imgDir, logoFileName);
    const ok = await downloadImage(logoUrl, destPath);
    if (ok) {
      localLogoPath = `/images/${seasonKey}/${logoFileName}`;
      console.log(`  Downloaded logo: ${localLogoPath}`);
    } else {
      console.log(`  Found logo URL but download failed`);
    }
  } else {
    console.log(`  No logo found — img will be empty`);
  }

  registerSeason(seasonNum, seasonsFilePath, localLogoPath);

  // Step 5: Push to Firestore (optional)
  if (push) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Step 5/5: Pushing to Firestore`);
    console.log(`${"=".repeat(60)}`);
    await pushSeasonToFirestore(seasonNum, dryRun, localLogoPath);
  } else {
    console.log(`\n  Skipping Firestore push (use --push to enable)`);
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Season ${seasonNum} bootstrap complete!`);
  console.log(`${"=".repeat(60)}`);
  console.log(`  Players: ${playerData.players.length}`);
  console.log(`  Episodes: ${resultsData.episodes.length}`);
  console.log(`  Challenges: ${resultsData.challenges.length}`);
  console.log(`  Eliminations: ${resultsData.eliminations.length}`);
  console.log(`  Events: ${resultsData.events.length}`);
  if (resultsData.warnings.length > 0) {
    console.log(`  Warnings: ${resultsData.warnings.length}`);
  }
  console.log(`\nNext steps:`);
  console.log(`  1. Run 'yarn format' and 'yarn tsc' to verify`);
  console.log(`  2. Review generated file at ${outputPath}`);
  if (!push) {
    console.log(
      `  3. Run 'yarn new-season ${seasonNum} --push' to upload to Firestore`,
    );
  }
}

main().catch((err) => {
  console.error("\nSeason bootstrap failed:", err);
  process.exit(1);
});
