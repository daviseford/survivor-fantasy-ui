import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { resolveNames } from "./lib/name-resolver.js";
import type { ScrapedPlayer, ScrapeResult } from "./lib/types.js";
import {
  delay,
  downloadImage,
  fetchImageUrls,
  fetchWikitext,
  getSeasonPageName,
} from "./lib/wiki-api.js";
import {
  ContestantInfo,
  parseCastTable,
  parseContestantPage,
} from "./lib/wikitext-parser.js";

async function getLocalPlayers(seasonNum: number): Promise<string[]> {
  // Dynamically import the season data to get local player names
  const seasonKey = `season_${seasonNum}`;
  try {
    const mod = await import(`../src/data/${seasonKey}/index.ts`);
    const playersKey = `SEASON_${seasonNum}_PLAYERS`;
    const players = mod[playersKey] as Array<{ name: string }>;
    if (!players) {
      console.error(`No ${playersKey} export found in season data`);
      return [];
    }
    return players.map((p) => p.name);
  } catch {
    console.warn(
      `No local season data found for season ${seasonNum}. Proceeding without name matching.`,
    );
    return [];
  }
}

export async function scrape(seasonNum: number): Promise<ScrapeResult> {
  console.log(`\nScraping Season ${seasonNum}...\n`);

  // Step 1: Get local player names
  const localNames = await getLocalPlayers(seasonNum);
  if (localNames.length > 0) {
    console.log(`Found ${localNames.length} local players`);
  }

  // Step 2: Fetch season page and parse cast table
  const seasonPageName = getSeasonPageName(seasonNum);
  console.log(`Fetching season page: ${seasonPageName}`);
  const seasonWikitext = await fetchWikitext(seasonPageName);
  if (!seasonWikitext) {
    throw new Error(`Failed to fetch season page: ${seasonPageName}`);
  }

  const castEntries = parseCastTable(seasonWikitext);
  console.log(`Found ${castEntries.length} contestants in cast table\n`);

  if (castEntries.length === 0) {
    throw new Error(
      "No contestants found in cast table. Check season page name.",
    );
  }

  if (castEntries.length % 2 !== 0) {
    console.warn(
      `⚠ WARNING: Found ${castEntries.length} contestants (odd number). Survivor seasons always have an even number of players — the cast table parser likely missed someone.\n`,
    );
  }

  // Step 3: Resolve names (or discover names from wiki if no local data)
  let nameMatches;
  if (localNames.length === 0) {
    // Discovery mode: use wiki display names as canonical names
    console.log("No local data found — using wiki names directly\n");
    nameMatches = castEntries.map((entry) => ({
      localName: entry.displayName,
      wikiPageTitle: entry.wikiPageTitle,
      matchStatus: "exact" as const,
    }));
  } else {
    nameMatches = resolveNames(localNames, castEntries);
  }

  // Step 4: Fetch individual player pages
  const players: ScrapedPlayer[] = [];
  const unmatched: ScrapedPlayer[] = [];
  // Collect image filenames for batch URL resolution
  const imageFileNames = new Map<string, string>(); // wikiPageTitle → imageFileName

  for (let i = 0; i < nameMatches.length; i++) {
    const match = nameMatches[i];
    const castEntry = castEntries[i];
    console.log(
      `[${i + 1}/${nameMatches.length}] Fetching: ${match.wikiPageTitle}` +
        (match.localName ? ` → ${match.localName}` : " (unmatched)"),
    );

    const playerWikitext = await fetchWikitext(match.wikiPageTitle);

    let info: ContestantInfo | null = null;
    if (playerWikitext) {
      info = parseContestantPage(playerWikitext, seasonNum);
    }

    if (info?.imageFileName) {
      imageFileNames.set(match.wikiPageTitle, info.imageFileName);
    }

    const player: ScrapedPlayer = {
      wikiPageTitle: match.wikiPageTitle,
      localName: match.localName,
      matchStatus: match.matchStatus,
      age: info?.age ?? castEntry.age,
      profession: info?.occupation ?? castEntry.occupation,
      hometown: info?.hometown ?? castEntry.location,
      previousSeasons:
        info?.previousSeasons && info.previousSeasons.length > 0
          ? info.previousSeasons
          : undefined,
      nickname: info?.nickname,
    };

    if (match.matchStatus === "unmatched") {
      unmatched.push(player);
    } else {
      players.push(player);
    }

    // Rate limit: 150ms between requests
    if (i < nameMatches.length - 1) {
      await delay(150);
    }
  }

  // Step 4b: Batch-resolve image URLs and download locally
  if (imageFileNames.size > 0) {
    console.log(`\nResolving ${imageFileNames.size} image URLs...`);
    const imageUrls = await fetchImageUrls([...imageFileNames.values()]);
    console.log(`Resolved ${imageUrls.size}/${imageFileNames.size} image URLs`);

    const imgDir = path.resolve(
      import.meta.dirname,
      "..",
      "public",
      "images",
      `season_${seasonNum}`,
    );

    console.log(`Downloading images to ${imgDir}...`);
    let downloaded = 0;
    const allPlayers = [...players, ...unmatched];
    for (const player of allPlayers) {
      const fileName = imageFileNames.get(player.wikiPageTitle);
      if (!fileName) continue;
      const url = imageUrls.get(fileName);
      if (!url) continue;

      const name = player.localName || player.wikiPageTitle;
      // Use wiki thumbnail API for reasonable file sizes (~25KB vs ~3MB)
      const thumbUrl = url.replace(
        /\/revision\/latest.*/,
        "/revision/latest/scale-to-width-down/400",
      );
      const localFileName = name.replace(/\s+/g, "-") + ".jpg";
      const localPath = path.join(imgDir, localFileName);

      const ok = await downloadImage(thumbUrl, localPath);
      if (ok) {
        player.imageUrl = `/images/season_${seasonNum}/${localFileName}`;
        downloaded++;
      } else {
        console.warn(`  Failed to download image for ${name}`);
      }

      await delay(100);
    }
    console.log(`Downloaded ${downloaded}/${imageUrls.size} images`);
  }

  // Step 5: Write JSON output
  const result: ScrapeResult = {
    seasonNum,
    scrapedAt: new Date().toISOString(),
    players,
    unmatched,
  };

  const outputDir = path.resolve(import.meta.dirname, "..", "data", "scraped");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `season_${seasonNum}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + "\n");

  // Summary
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Scrape complete for Season ${seasonNum}`);
  console.log(`  Matched: ${players.length}`);
  console.log(
    `    Exact: ${players.filter((p) => p.matchStatus === "exact").length}`,
  );
  console.log(
    `    Fuzzy: ${players.filter((p) => p.matchStatus === "fuzzy").length}`,
  );
  if (unmatched.length > 0) {
    console.log(`  Unmatched: ${unmatched.length}`);
    for (const p of unmatched) {
      console.log(`    - ${p.wikiPageTitle}`);
    }
  }
  const totalPlayers = players.length + unmatched.length;
  if (totalPlayers % 2 !== 0) {
    console.log(
      `\n⚠ WARNING: Total player count is ${totalPlayers} (odd). This likely means the cast table parser missed a contestant.`,
    );
  }

  console.log(`\nOutput: ${outputPath}`);

  return result;
}

// --- CLI entry point ---
const isDirectRun =
  process.argv[1] &&
  fileURLToPath(import.meta.url).replace(/\\/g, "/") ===
    process.argv[1].replace(/\\/g, "/");

if (isDirectRun) {
  const seasonNum = Number(process.argv[2]);

  if (!seasonNum || isNaN(seasonNum)) {
    console.error("Usage: yarn scrape <season_number>");
    console.error("Example: yarn scrape 46");
    process.exit(1);
  }

  scrape(seasonNum).catch((err) => {
    console.error("Scrape failed:", err);
    process.exit(1);
  });
}
