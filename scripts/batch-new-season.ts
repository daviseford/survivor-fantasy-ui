/**
 * Batch Season Bootstrap — generate multiple seasons in one run.
 *
 * Fetches each survivoR table once (8 HTTP requests total), then iterates
 * over the requested season numbers to filter, transform, generate, and register.
 *
 * Usage:
 *   yarn tsx scripts/batch-new-season.ts [season numbers...] [flags]
 *
 * Examples:
 *   yarn tsx scripts/batch-new-season.ts              # all missing seasons
 *   yarn tsx scripts/batch-new-season.ts 2 3 4 5      # specific seasons
 *   yarn tsx scripts/batch-new-season.ts --skip-wiki   # skip wiki image/logo fetching
 *   yarn tsx scripts/batch-new-season.ts --force       # overwrite existing files
 *   yarn tsx scripts/batch-new-season.ts --push        # also push to Firestore
 *   yarn tsx scripts/batch-new-season.ts --dry-run     # preview without writing
 *
 * Flags:
 *   --force      Overwrite existing season data files
 *   --dry-run    Preview what would be generated without writing
 *   --skip-wiki  Skip all wiki fetching (images, bios, logos) for speed
 *   --push       Push generated seasons to Firestore after generation
 */

import * as fs from "fs";
import * as path from "path";
import { generateFullSeasonFile, registerSeason } from "./lib/codegen.js";
import { pushSeasonToFirestore } from "./lib/firebase-push.js";
import {
  fetchTable,
  filterBySeason,
  type SurvivorSeasonData,
} from "./lib/survivor-client.js";
import {
  transformPlayers,
  transformResults,
} from "./lib/survivor-transformer.js";
import type {
  SurvivorAdvantageDetail,
  SurvivorAdvantageMovement,
  SurvivorCastaway,
  SurvivorChallengeResult,
  SurvivorEpisode,
  SurvivorJourney,
  SurvivorTribeMapping,
  SurvivorVoteHistory,
} from "./lib/survivor-types.js";
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

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const SEASONS_FILE = path.join(PROJECT_ROOT, "src", "data", "seasons.ts");

/** All 50 US Survivor season numbers */
const ALL_SEASONS = Array.from({ length: 50 }, (_, i) => i + 1);

/** Determine which seasons are missing (no data file yet) */
function getMissingSeasons(): number[] {
  return ALL_SEASONS.filter((n) => {
    const dir = path.join(PROJECT_ROOT, "src", "data", `season_${n}`);
    return !fs.existsSync(path.join(dir, "index.ts"));
  });
}

/** Fetch player images and bios from the Survivor Wiki (copied from new-season.ts) */
async function fetchWikiSupplemental(
  players: ScrapedPlayer[],
  seasonNum: number,
): Promise<void> {
  const seasonKey = `season_${seasonNum}`;
  const imageFileNames = new Map<string, string>();

  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const wikiPageTitle = player.wikiPageTitle;
    console.log(
      `    [${i + 1}/${players.length}] Fetching wiki page: ${wikiPageTitle}`,
    );

    const wikitext = await fetchWikitext(wikiPageTitle);
    if (!wikitext) {
      console.warn(
        `      ⚠ Wiki page not found for "${wikiPageTitle}" — skipping`,
      );
      if (i < players.length - 1) await delay(150);
      continue;
    }

    const info = parseContestantPage(wikitext, seasonNum);
    if (!info) {
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
    console.log(`    Resolving ${imageFileNames.size} image URLs...`);
    const imageUrls = await fetchImageUrls([...imageFileNames.values()]);
    console.log(
      `    Resolved ${imageUrls.size}/${imageFileNames.size} image URLs`,
    );

    const imgDir = path.join(PROJECT_ROOT, "public", "images", seasonKey);
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
      }
      await delay(100);
    }
    console.log(`    Downloaded ${downloaded}/${imageUrls.size} images`);
  }
}

/** Extract season logo from wiki page (matches new-season.ts logic) */
async function fetchSeasonLogo(
  seasonNum: number,
  seasonWikitext: string | null,
): Promise<string> {
  const seasonKey = `season_${seasonNum}`;

  if (seasonWikitext) {
    const fieldMatch = seasonWikitext.match(
      /\|\s*(?:image|logo)\s*=\s*([\s\S]*?)(?=\n\s*\||\n\}\})/i,
    );
    if (fieldMatch) {
      const fileMatch = fieldMatch[1].match(/\[\[File:([^\]|]+)/i);
      if (fileMatch) {
        const logoUrl = await fetchImageUrl(fileMatch[1].trim());
        if (logoUrl) {
          const imgDir = path.join(PROJECT_ROOT, "public", "images", seasonKey);
          const ext = path.extname(new URL(logoUrl).pathname) || ".png";
          const logoFileName = `season-${seasonNum}-logo${ext}`;
          const destPath = path.join(imgDir, logoFileName);
          const ok = await downloadImage(logoUrl, destPath);
          if (ok) {
            return `/images/${seasonKey}/${logoFileName}`;
          }
        }
      }
    }
  }

  // Fallback: try common filename patterns
  for (const candidate of [
    `US S${seasonNum} logo.png`,
    `Survivor ${seasonNum} Logo.png`,
  ]) {
    const url = await fetchImageUrl(candidate);
    if (url) {
      const imgDir = path.join(PROJECT_ROOT, "public", "images", seasonKey);
      const ext = path.extname(new URL(url).pathname) || ".png";
      const logoFileName = `season-${seasonNum}-logo${ext}`;
      const destPath = path.join(imgDir, logoFileName);
      const ok = await downloadImage(url, destPath);
      if (ok) {
        return `/images/${seasonKey}/${logoFileName}`;
      }
    }
  }

  return "";
}

interface SeasonMetadataEntry {
  seasonNum: number;
  location: string | null;
  filmingDates: string | null;
  seasonRun: string | null;
  playerCount: number;
  episodeCount: number;
  challengeCount: number;
  eliminationCount: number;
  eventCount: number;
  logoPath: string;
  warnings: number;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith("--")));
  const positional = args
    .filter((a) => !a.startsWith("--"))
    .map(Number)
    .filter((n) => !isNaN(n) && n >= 1 && n <= 50);

  const force = flags.has("--force");
  const dryRun = flags.has("--dry-run");
  const skipWiki = flags.has("--skip-wiki");
  const push = flags.has("--push");

  // Determine which seasons to generate
  let seasonNums: number[];
  if (positional.length > 0) {
    seasonNums = positional;
  } else {
    seasonNums = getMissingSeasons();
  }

  if (seasonNums.length === 0) {
    console.log("All seasons already exist. Use --force to regenerate.");
    return;
  }

  // Filter out existing seasons unless --force
  if (!force) {
    const before = seasonNums.length;
    seasonNums = seasonNums.filter((n) => {
      const dir = path.join(PROJECT_ROOT, "src", "data", `season_${n}`);
      return !fs.existsSync(path.join(dir, "index.ts"));
    });
    if (seasonNums.length < before) {
      console.log(
        `Skipping ${before - seasonNums.length} existing season(s) (use --force to overwrite)`,
      );
    }
  }

  console.log(
    `\nBatch generating ${seasonNums.length} season(s): ${seasonNums.join(", ")}`,
  );
  if (dryRun) console.log("  [DRY RUN — no files will be written]");
  if (skipWiki) console.log("  [SKIP WIKI — no images or logos]");
  if (push) console.log("  [PUSH — will upload to Firestore after generation]");

  // ── Step 1: Fetch all survivoR tables once ──
  console.log(`\n${"=".repeat(60)}`);
  console.log("Step 1: Fetching all survivoR tables (8 requests)...");
  console.log(`${"=".repeat(60)}`);

  const [
    allCastaways,
    allEpisodes,
    allChallengeResults,
    allVoteHistory,
    allAdvantageDetails,
    allAdvantageMovement,
    allTribeMapping,
    allJourneys,
  ] = await Promise.all([
    fetchTable<SurvivorCastaway>("castaways"),
    fetchTable<SurvivorEpisode>("episodes"),
    fetchTable<SurvivorChallengeResult>("challenge_results"),
    fetchTable<SurvivorVoteHistory>("vote_history"),
    fetchTable<SurvivorAdvantageDetail>("advantage_details"),
    fetchTable<SurvivorAdvantageMovement>("advantage_movement"),
    fetchTable<SurvivorTribeMapping>("tribe_mapping"),
    fetchTable<SurvivorJourney>("journeys"),
  ]);

  console.log(
    `  Fetched: ${allCastaways.length} castaways, ${allEpisodes.length} episodes, ${allChallengeResults.length} challenge results`,
  );

  // ── Step 2: Generate each season ──
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Step 2: Generating ${seasonNums.length} season(s)...`);
  console.log(`${"=".repeat(60)}`);

  const results: SeasonMetadataEntry[] = [];
  const failures: { seasonNum: number; error: string }[] = [];

  for (const seasonNum of seasonNums) {
    const seasonKey = `season_${seasonNum}`;
    const outputDir = path.join(PROJECT_ROOT, "src", "data", seasonKey);
    const outputPath = path.join(outputDir, "index.ts");

    console.log(`\n── Season ${seasonNum} ──`);

    try {
      // Filter cached tables for this season
      const seasonData: SurvivorSeasonData = {
        castaways: filterBySeason(allCastaways, seasonNum),
        episodes: filterBySeason(allEpisodes, seasonNum),
        challengeResults: filterBySeason(allChallengeResults, seasonNum),
        voteHistory: filterBySeason(allVoteHistory, seasonNum),
        advantageDetails: filterBySeason(allAdvantageDetails, seasonNum),
        advantageMovement: filterBySeason(allAdvantageMovement, seasonNum),
        tribeMapping: filterBySeason(allTribeMapping, seasonNum),
        journeys: filterBySeason(allJourneys, seasonNum),
      };

      if (seasonData.castaways.length === 0) {
        console.warn(
          `  ⚠ No castaways found for Season ${seasonNum} — skipping`,
        );
        failures.push({
          seasonNum,
          error: "No castaways in survivoR data",
        });
        continue;
      }

      // Transform
      const playerData = transformPlayers(seasonData, seasonNum);
      const resultsData = transformResults(seasonData, seasonNum);

      console.log(
        `  survivoR: ${playerData.players.length} players, ${resultsData.episodes.length} episodes, ${resultsData.challenges.length} challenges, ${resultsData.eliminations.length} eliminations, ${resultsData.events.length} events`,
      );

      // Wiki supplemental (images, bios)
      if (!skipWiki) {
        console.log("  Fetching wiki supplemental...");
        await fetchWikiSupplemental(playerData.players, seasonNum);
      }

      // Generate season file
      const fileContent = generateFullSeasonFile(
        playerData,
        resultsData,
        seasonNum,
      );

      if (!dryRun) {
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        fs.writeFileSync(outputPath, fileContent);
        console.log(`  Created: ${outputPath}`);
      } else {
        console.log(`  [DRY RUN] Would create: ${outputPath}`);
      }

      // Wiki: season logo + season info
      let logoPath = "";
      let location: string | null = null;
      let filmingDates: string | null = null;
      let seasonRun: string | null = null;

      if (!skipWiki) {
        const seasonPageName = getSeasonPageName(seasonNum);
        const seasonWikitext = await fetchWikitext(seasonPageName);

        if (seasonWikitext) {
          const seasonInfo = parseSeasonInfobox(seasonWikitext);
          if (seasonInfo) {
            location = seasonInfo.location ?? null;
            filmingDates = seasonInfo.filmingDates ?? null;
            seasonRun = seasonInfo.seasonRun ?? null;
            if (location) console.log(`  Location: ${location}`);
          }
        }

        if (!dryRun) {
          logoPath = await fetchSeasonLogo(seasonNum, seasonWikitext ?? null);
          if (logoPath) console.log(`  Logo: ${logoPath}`);
        }
      }

      // Register in seasons.ts
      if (!dryRun) {
        registerSeason(seasonNum, SEASONS_FILE, logoPath);
      } else {
        console.log(`  [DRY RUN] Would register in seasons.ts`);
      }

      results.push({
        seasonNum,
        location,
        filmingDates,
        seasonRun,
        playerCount: playerData.players.length,
        episodeCount: resultsData.episodes.length,
        challengeCount: resultsData.challenges.length,
        eliminationCount: resultsData.eliminations.length,
        eventCount: resultsData.events.length,
        logoPath,
        warnings: resultsData.warnings.length,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ Failed: ${msg}`);
      failures.push({ seasonNum, error: msg });
    }
  }

  // ── Step 3: Push to Firestore (optional) ──
  if (push) {
    console.log(`\n${"=".repeat(60)}`);
    console.log("Step 3: Pushing seasons to Firestore...");
    console.log(`${"=".repeat(60)}`);

    // Push only the seasons that were successfully generated in this run
    for (const entry of results) {
      const seasonNum = entry.seasonNum;
      try {
        const logoPath = entry.logoPath;

        console.log(`  Pushing season ${seasonNum}...`);
        await pushSeasonToFirestore(seasonNum, dryRun, logoPath);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `  ✗ Firestore push failed for season ${seasonNum}: ${msg}`,
        );
      }
    }
  }

  // ── Summary ──
  console.log(`\n${"=".repeat(60)}`);
  console.log("Batch generation complete!");
  console.log(`${"=".repeat(60)}`);
  console.log(`  Generated: ${results.length} season(s)`);
  if (failures.length > 0) {
    console.log(`  Failed: ${failures.length} season(s)`);
    for (const f of failures) {
      console.log(`    Season ${f.seasonNum}: ${f.error}`);
    }
  }

  // Write metadata JSON for use in building SEASON_METADATA
  if (results.length > 0 && !dryRun) {
    const metadataPath = path.join(PROJECT_ROOT, "data", "batch-metadata.json");
    const metadataDir = path.dirname(metadataPath);
    if (!fs.existsSync(metadataDir)) {
      fs.mkdirSync(metadataDir, { recursive: true });
    }
    fs.writeFileSync(metadataPath, JSON.stringify(results, null, 2));
    console.log(`\n  Metadata written to: ${metadataPath}`);
  }

  console.log(`\nNext steps:`);
  console.log("  1. Run 'yarn format' and 'yarn tsc' to verify");
  if (!push) {
    console.log(
      "  2. Run 'yarn tsx scripts/batch-new-season.ts --push' to upload to Firestore",
    );
  }

  if (failures.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\nBatch generation failed:", err);
  process.exit(1);
});
