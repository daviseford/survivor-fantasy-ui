import * as fs from "fs";
import * as path from "path";
import { resolveNames } from "./lib/name-resolver.js";
import type { ScrapedPlayer, ScrapeResult } from "./lib/types.js";
import { delay, fetchWikitext, getSeasonPageName } from "./lib/wiki-api.js";
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

async function scrape(seasonNum: number): Promise<void> {
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
    console.error(`Failed to fetch season page: ${seasonPageName}`);
    process.exit(1);
  }

  const castEntries = parseCastTable(seasonWikitext);
  console.log(`Found ${castEntries.length} contestants in cast table\n`);

  if (castEntries.length === 0) {
    console.error(
      "No contestants found in cast table. Check season page name.",
    );
    process.exit(1);
  }

  // Step 3: Resolve names
  const nameMatches = resolveNames(localNames, castEntries);

  // Step 4: Fetch individual player pages
  const players: ScrapedPlayer[] = [];
  const unmatched: ScrapedPlayer[] = [];

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

    const player: ScrapedPlayer = {
      wikiPageTitle: match.wikiPageTitle,
      localName: match.localName,
      matchStatus: match.matchStatus,
      age: info?.age ?? castEntry.age,
      profession: info?.occupation ?? castEntry.occupation,
      hometown: info?.hometown ?? castEntry.location,
      tribes: info?.tribes,
      daysLasted: info?.daysLasted ?? undefined,
      previousSeasons:
        info?.previousSeasons && info.previousSeasons.length > 0
          ? info.previousSeasons
          : undefined,
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
  console.log(`\nOutput: ${outputPath}`);
}

// --- Main ---
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
