/**
 * Season Bootstrap CLI — one command to scaffold a complete season.
 *
 * Usage: yarn new-season <N> [--push] [--force] [--dry-run]
 *
 * Steps:
 *   1. Fetch player data from survivoR dataset
 *   2. Transform survivoR data
 *   3. Fetch player images and bios from wiki (supplemental)
 *   4. Generate full season data file
 *   5. Register season in src/data/seasons.ts
 *   6. (optional) Push to Firestore with --push
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
import type { ScrapedPlayer } from "./lib/types.js";
import {
  delay,
  downloadImage,
  fetchImageUrl,
  fetchImageUrls,
  fetchWikitext,
  getSeasonPageName,
} from "./lib/wiki-api.js";
import {
  parseContestantPage,
  parseSeasonInfobox,
} from "./lib/wikitext-parser.js";

/**
 * Fetch player images and bios from the Survivor Wiki as a supplemental step
 * after survivoR data fetch. Uses survivoR full_name as wiki page titles.
 */
async function fetchWikiSupplemental(
  players: ScrapedPlayer[],
  seasonNum: number,
  projectRoot: string,
): Promise<void> {
  const seasonKey = `season_${seasonNum}`;
  const imageFileNames = new Map<string, string>(); // wikiPageTitle → imageFileName

  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const wikiPageTitle = player.wikiPageTitle;
    console.log(
      `  [${i + 1}/${players.length}] Fetching wiki page: ${wikiPageTitle}`,
    );

    const wikitext = await fetchWikitext(wikiPageTitle);
    if (!wikitext) {
      console.warn(
        `    ⚠ Wiki page not found for "${wikiPageTitle}" — skipping`,
      );
      if (i < players.length - 1) await delay(150);
      continue;
    }

    const info = parseContestantPage(wikitext, seasonNum);
    if (!info) {
      console.warn(
        `    ⚠ No {{Contestant}} infobox found for "${wikiPageTitle}" — skipping`,
      );
      if (i < players.length - 1) await delay(150);
      continue;
    }

    if (info.imageFileName) {
      imageFileNames.set(wikiPageTitle, info.imageFileName);
    }
    if (info.nickname) {
      player.nickname = info.nickname;
    }

    if (i < players.length - 1) await delay(150);
  }

  // Batch-resolve image URLs and download
  if (imageFileNames.size > 0) {
    console.log(`\n  Resolving ${imageFileNames.size} image URLs...`);
    const imageUrls = await fetchImageUrls([...imageFileNames.values()]);
    console.log(
      `  Resolved ${imageUrls.size}/${imageFileNames.size} image URLs`,
    );

    const imgDir = path.join(projectRoot, "public", "images", seasonKey);
    let downloaded = 0;

    for (const player of players) {
      const fileName = imageFileNames.get(player.wikiPageTitle);
      if (!fileName) continue;
      const url = imageUrls.get(fileName);
      if (!url) continue;

      const name = player.localName || player.wikiPageTitle;
      const thumbUrl = url.replace(
        /\/revision\/latest.*/,
        "/revision/latest/scale-to-width-down/400",
      );
      const localFileName = name.replace(/\s+/g, "-") + ".jpg";
      const localPath = path.join(imgDir, localFileName);

      const ok = await downloadImage(thumbUrl, localPath);
      if (ok) {
        player.imageUrl = `/images/${seasonKey}/${localFileName}`;
        downloaded++;
      } else {
        console.warn(`    Failed to download image for ${name}`);
      }
      await delay(100);
    }
    console.log(`  Downloaded ${downloaded}/${imageUrls.size} images`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith("--")));
  const positional = args.filter((a) => !a.startsWith("--"));

  const seasonNum = Number(positional[0]);
  const force = flags.has("--force");
  const push = flags.has("--push");
  const dryRun = flags.has("--dry-run");

  if (!seasonNum || isNaN(seasonNum)) {
    console.error(
      "Usage: yarn new-season <season_number> [--push] [--force] [--dry-run]",
    );
    console.error("Example: yarn new-season 51");
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

  // Step 1: Fetch from survivoR (structured dataset)
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Step 1/6: Fetching survivoR data for Season ${seasonNum}`);
  console.log(`${"=".repeat(60)}`);
  const seasonData = await fetchSeasonData(seasonNum);

  // Step 2: Transform survivoR data
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Step 2/6: Transforming survivoR data`);
  console.log(`${"=".repeat(60)}`);
  const playerData = transformPlayers(seasonData, seasonNum);
  const resultsData = transformResults(seasonData, seasonNum);

  // Step 3: Fetch wiki supplemental data (images, bios)
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Step 3/6: Fetching player images and bios from wiki`);
  console.log(`${"=".repeat(60)}`);
  await fetchWikiSupplemental(playerData.players, seasonNum, projectRoot);

  // Step 4: Generate full season file
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Step 4/6: Generating season data file`);
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

  // Step 5: Fetch season page for logo + season info
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Step 5/7: Fetching season logo and info from wiki`);
  console.log(`${"=".repeat(60)}`);

  const seasonPageName = getSeasonPageName(seasonNum);
  const seasonWikitext = await fetchWikitext(seasonPageName);

  // Extract season info (filming location, dates)
  if (seasonWikitext) {
    const seasonInfo = parseSeasonInfobox(seasonWikitext);
    if (seasonInfo) {
      if (seasonInfo.location)
        console.log(`  Location: ${seasonInfo.location}`);
      if (seasonInfo.filmingDates)
        console.log(`  Filming: ${seasonInfo.filmingDates}`);
      if (seasonInfo.seasonRun) console.log(`  Aired: ${seasonInfo.seasonRun}`);
    } else {
      console.log(`  No {{Season}} infobox found on wiki page`);
    }
  }

  // Extract logo from the season page wikitext (avoids a duplicate fetch)
  let localLogoPath = "";
  if (seasonWikitext) {
    const fieldMatch = seasonWikitext.match(
      /\|\s*(?:image|logo)\s*=\s*([\s\S]*?)(?=\n\s*\||\n\}\})/i,
    );
    if (fieldMatch) {
      const fileMatch = fieldMatch[1].match(/\[\[File:([^\]|]+)/i);
      if (fileMatch) {
        const logoUrl = await fetchImageUrl(fileMatch[1].trim());
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
        }
      }
    }
  }

  if (!localLogoPath) {
    // Fallback: try common filename patterns
    for (const candidate of [
      `US S${seasonNum} logo.png`,
      `Survivor ${seasonNum} Logo.png`,
    ]) {
      const url = await fetchImageUrl(candidate);
      if (url) {
        const imgDir = path.join(projectRoot, "public", "images", seasonKey);
        const ext = path.extname(new URL(url).pathname) || ".png";
        const logoFileName = `season-${seasonNum}-logo${ext}`;
        const destPath = path.join(imgDir, logoFileName);
        const ok = await downloadImage(url, destPath);
        if (ok) {
          localLogoPath = `/images/${seasonKey}/${logoFileName}`;
          console.log(`  Downloaded logo (fallback): ${localLogoPath}`);
          break;
        }
      }
    }
  }

  if (!localLogoPath) {
    console.log(`  No logo found — img will be empty`);
  }

  // Step 6: Register in seasons.ts
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Step 6/7: Registering season in seasons.ts`);
  console.log(`${"=".repeat(60)}`);

  registerSeason(seasonNum, seasonsFilePath, localLogoPath);

  // Step 7: Push to Firestore (optional)
  if (push) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Step 7/7: Pushing to Firestore`);
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
