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
import { validateSeasonData } from "./lib/validate-season.js";
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

const TOTAL_SEASONS = 50;
const SEPARATOR = "=".repeat(60);

function getSeasonDataPath(seasonNum: number): string {
  return path.join(
    PROJECT_ROOT,
    "src",
    "data",
    `season_${seasonNum}`,
    "index.ts",
  );
}

function seasonExists(seasonNum: number): boolean {
  return fs.existsSync(getSeasonDataPath(seasonNum));
}

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** All possible season numbers. */
function getAllSeasons(): number[] {
  return Array.from({ length: TOTAL_SEASONS }, (_, i) => i + 1);
}

/** Determine which seasons are missing (no data file yet) */
function getMissingSeasons(): number[] {
  return getAllSeasons().filter((n) => !seasonExists(n));
}

/** Fetch player images and bios from the Survivor Wiki */
async function fetchWikiSupplemental(
  players: ScrapedPlayer[],
  seasonNum: number,
): Promise<void> {
  const seasonKey = `season_${seasonNum}`;
  const imageFileNames = new Map<string, string>();
  const isNotLast = (i: number): boolean => i < players.length - 1;

  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const { wikiPageTitle } = player;
    console.log(
      `    [${i + 1}/${players.length}] Fetching wiki page: ${wikiPageTitle}`,
    );

    const wikitext = await fetchWikitext(wikiPageTitle);
    if (!wikitext) {
      console.warn(
        `      ⚠ Wiki page not found for "${wikiPageTitle}" — skipping`,
      );
      if (isNotLast(i)) await delay(150);
      continue;
    }

    const info = parseContestantPage(wikitext, seasonNum);
    if (!info) {
      if (isNotLast(i)) await delay(150);
      continue;
    }

    if (info.imageFileName) {
      imageFileNames.set(wikiPageTitle, info.imageFileName);
    }
    if (info.occupation) {
      player.profession = info.occupation;
    }
    if (info.nickname) {
      player.nickname = info.nickname;
    }

    if (isNotLast(i)) await delay(150);
  }

  if (imageFileNames.size === 0) return;

  // Batch-resolve image URLs and download
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

/** Try to download a logo image and return its public path, or empty string on failure. */
async function tryDownloadLogo(
  url: string,
  seasonNum: number,
): Promise<string> {
  const seasonKey = `season_${seasonNum}`;
  const imgDir = path.join(PROJECT_ROOT, "public", "images", seasonKey);
  const ext = path.extname(new URL(url).pathname) || ".png";
  const logoFileName = `season-${seasonNum}-logo${ext}`;
  const destPath = path.join(imgDir, logoFileName);
  const ok = await downloadImage(url, destPath);
  return ok ? `/images/${seasonKey}/${logoFileName}` : "";
}

/** Extract the wiki File: reference from a season infobox field. */
function extractLogoFileName(wikitext: string): string | null {
  const fieldMatch = wikitext.match(
    /\|\s*(?:image|logo)\s*=\s*([\s\S]*?)(?=\n\s*\||\n\}\})/i,
  );
  if (!fieldMatch) return null;

  const fileMatch = fieldMatch[1].match(/\[\[File:([^\]|]+)/i);
  return fileMatch ? fileMatch[1].trim() : null;
}

/** Extract season logo from wiki page (matches new-season.ts logic) */
async function fetchSeasonLogo(
  seasonNum: number,
  seasonWikitext: string | null,
): Promise<string> {
  // Try extracting logo from the season wiki page
  if (seasonWikitext) {
    const logoFile = extractLogoFileName(seasonWikitext);
    if (logoFile) {
      const logoUrl = await fetchImageUrl(logoFile);
      if (logoUrl) {
        const result = await tryDownloadLogo(logoUrl, seasonNum);
        if (result) return result;
      }
    }
  }

  // Fallback: try common filename patterns
  for (const candidate of [
    `US S${seasonNum} logo.png`,
    `Survivor ${seasonNum} Logo.png`,
  ]) {
    const url = await fetchImageUrl(candidate);
    if (!url) continue;
    const result = await tryDownloadLogo(url, seasonNum);
    if (result) return result;
  }

  return "";
}

interface AllSurvivorTables {
  castaways: SurvivorCastaway[];
  episodes: SurvivorEpisode[];
  challengeResults: SurvivorChallengeResult[];
  voteHistory: SurvivorVoteHistory[];
  advantageDetails: SurvivorAdvantageDetail[];
  advantageMovement: SurvivorAdvantageMovement[];
  tribeMapping: SurvivorTribeMapping[];
  journeys: SurvivorJourney[];
}

async function fetchAllTables(): Promise<AllSurvivorTables> {
  const [
    castaways,
    episodes,
    challengeResults,
    voteHistory,
    advantageDetails,
    advantageMovement,
    tribeMapping,
    journeys,
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

  return {
    castaways,
    episodes,
    challengeResults,
    voteHistory,
    advantageDetails,
    advantageMovement,
    tribeMapping,
    journeys,
  };
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

function logStep(title: string): void {
  console.log(`\n${SEPARATOR}`);
  console.log(title);
  console.log(SEPARATOR);
}

/** Filter all pre-fetched tables down to a single season. */
function filterAllTables(
  allTables: AllSurvivorTables,
  seasonNum: number,
): SurvivorSeasonData {
  return {
    castaways: filterBySeason(allTables.castaways, seasonNum),
    episodes: filterBySeason(allTables.episodes, seasonNum),
    challengeResults: filterBySeason(allTables.challengeResults, seasonNum),
    voteHistory: filterBySeason(allTables.voteHistory, seasonNum),
    advantageDetails: filterBySeason(allTables.advantageDetails, seasonNum),
    advantageMovement: filterBySeason(allTables.advantageMovement, seasonNum),
    tribeMapping: filterBySeason(allTables.tribeMapping, seasonNum),
    journeys: filterBySeason(allTables.journeys, seasonNum),
  };
}

/** Write a file, creating parent directories as needed. */
function writeFileWithDirs(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith("--")));
  const positional = args
    .filter((a) => !a.startsWith("--"))
    .map(Number)
    .filter((n) => !isNaN(n) && n >= 1 && n <= TOTAL_SEASONS);

  const force = flags.has("--force");
  const dryRun = flags.has("--dry-run");
  const skipWiki = flags.has("--skip-wiki");
  const push = flags.has("--push");

  let seasonNums =
    positional.length > 0
      ? positional
      : force
        ? getAllSeasons()
        : getMissingSeasons();

  if (seasonNums.length === 0) {
    console.log("All seasons already exist. Use --force to regenerate.");
    return;
  }

  // Filter out existing seasons unless --force
  if (!force) {
    const before = seasonNums.length;
    seasonNums = seasonNums.filter((n) => !seasonExists(n));
    const skipped = before - seasonNums.length;
    if (skipped > 0) {
      console.log(
        `Skipping ${skipped} existing season(s) (use --force to overwrite)`,
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
  logStep("Step 1: Fetching all survivoR tables (8 requests)...");

  const allTables = await fetchAllTables();

  console.log(
    `  Fetched: ${allTables.castaways.length} castaways, ${allTables.episodes.length} episodes, ${allTables.challengeResults.length} challenge results`,
  );

  // ── Step 2: Generate each season ──
  logStep(`Step 2: Generating ${seasonNums.length} season(s)...`);

  const results: SeasonMetadataEntry[] = [];
  const failures: { seasonNum: number; error: string }[] = [];

  for (const seasonNum of seasonNums) {
    const outputPath = getSeasonDataPath(seasonNum);

    console.log(`\n── Season ${seasonNum} ──`);

    try {
      const seasonData = filterAllTables(allTables, seasonNum);

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

      const playerData = transformPlayers(seasonData, seasonNum);
      const resultsData = transformResults(seasonData, seasonNum);

      console.log(
        `  survivoR: ${playerData.players.length} players, ${resultsData.episodes.length} episodes, ${resultsData.challenges.length} challenges, ${resultsData.eliminations.length} eliminations, ${resultsData.events.length} events`,
      );

      // Validate before writing
      const validation = validateSeasonData(playerData, resultsData);
      if (validation.warnings.length > 0) {
        for (const w of validation.warnings) console.warn(`  ⚠ ${w}`);
      }
      if (!validation.valid) {
        for (const e of validation.errors) console.error(`  ✗ ${e}`);
        console.error(
          `  Skipping season ${seasonNum} due to validation errors`,
        );
        failures.push({ seasonNum, error: validation.errors.join("; ") });
        continue;
      }

      if (!skipWiki) {
        console.log("  Fetching wiki supplemental...");
        await fetchWikiSupplemental(playerData.players, seasonNum);
      }

      const fileContent = generateFullSeasonFile(
        playerData,
        resultsData,
        seasonNum,
        outputPath,
      );

      if (dryRun) {
        console.log(`  [DRY RUN] Would create: ${outputPath}`);
      } else {
        writeFileWithDirs(outputPath, fileContent);
        console.log(`  Created: ${outputPath}`);
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

      if (dryRun) {
        console.log(`  [DRY RUN] Would register in seasons.ts`);
      } else {
        registerSeason(seasonNum, SEASONS_FILE, logoPath);
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
      const msg = toErrorMessage(err);
      console.error(`  ✗ Failed: ${msg}`);
      failures.push({ seasonNum, error: msg });
    }
  }

  // ── Step 3: Push to Firestore (optional) ──
  if (push) {
    logStep("Step 3: Pushing seasons to Firestore...");

    for (const entry of results) {
      console.log(`  Pushing season ${entry.seasonNum}...`);
      try {
        await pushSeasonToFirestore(entry.seasonNum, dryRun, entry.logoPath);
      } catch (err) {
        console.error(
          `  ✗ Firestore push failed for season ${entry.seasonNum}: ${toErrorMessage(err)}`,
        );
      }
    }
  }

  // ── Summary ──
  logStep("Batch generation complete!");
  console.log(`  Generated: ${results.length} season(s)`);
  if (failures.length > 0) {
    console.log(`  Failed: ${failures.length} season(s)`);
    for (const f of failures) {
      console.log(`    Season ${f.seasonNum}: ${f.error}`);
    }
  }

  if (results.length > 0 && !dryRun && !skipWiki) {
    const metadataPath = path.join(PROJECT_ROOT, "data", "batch-metadata.json");
    writeFileWithDirs(metadataPath, JSON.stringify(results, null, 2));
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
