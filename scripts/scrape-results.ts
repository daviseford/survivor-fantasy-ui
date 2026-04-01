import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import type { PlayerTribeHistory, ScrapeResultsOutput } from "./lib/types.js";
import {
  fetchEpisodeTitles,
  fetchWikitext,
  getSeasonPageName,
} from "./lib/wiki-api.js";
import {
  buildTribeRosters,
  parseCastawayTribes,
  parseEpisodeGuide,
  parseVotingHistory,
} from "./lib/wikitext-parser.js";

export async function scrapeResults(
  seasonNum: number,
): Promise<ScrapeResultsOutput> {
  console.log(`\nScraping results for Season ${seasonNum}...\n`);

  const warnings: string[] = [];

  // Step 1: Fetch episode guide template
  const epguidePage = `Template:S${seasonNum}epguide`;
  console.log(`Fetching episode guide: ${epguidePage}`);
  const epguideWikitext = await fetchWikitext(epguidePage);

  if (!epguideWikitext) {
    throw new Error(
      `Failed to fetch episode guide template: ${epguidePage}. ` +
        `The wiki may use a different naming convention for this season.`,
    );
  }

  // Step 2: Fetch voting history template
  const votetablePage = `Template:S${seasonNum}votetable`;
  console.log(`Fetching voting history: ${votetablePage}`);
  const votetableWikitext = await fetchWikitext(votetablePage);

  if (!votetableWikitext) {
    throw new Error(
      `Failed to fetch voting history: ${votetablePage}. ` +
        `Tribe data is required for challenge resolution.`,
    );
  }

  // Step 3: Parse episode guide
  console.log(`\nParsing episode guide...`);
  const epguideResult = parseEpisodeGuide(epguideWikitext, seasonNum);
  warnings.push(...epguideResult.warnings);

  console.log(`  Episodes: ${epguideResult.episodes.length}`);
  console.log(`  Challenges: ${epguideResult.challenges.length}`);
  console.log(`  Eliminations: ${epguideResult.eliminations.length}`);

  // Step 3b: Resolve episode titles from {{Ep|SSEE}} templates
  console.log(`\nResolving episode titles...`);
  const episodeTitles = await fetchEpisodeTitles(
    seasonNum,
    epguideResult.episodes.length,
  );
  for (const ep of epguideResult.episodes) {
    const resolvedTitle = episodeTitles.get(ep.order);
    if (resolvedTitle) {
      ep.title = resolvedTitle;
    }
  }
  console.log(`  Resolved ${episodeTitles.size} episode titles`);

  // Step 3c: Load local player data for name resolution
  let playerNames: string[] = [];
  try {
    const mod = await import(`../src/data/season_${seasonNum}/index.ts`);
    const playersKey = `SEASON_${seasonNum}_PLAYERS`;
    const players = mod[playersKey] as Array<{ name: string }> | undefined;
    if (players) {
      playerNames = players.map((p) => p.name);
      console.log(`  Loaded ${playerNames.length} player names`);
    }
  } catch {
    // No local season data — skip name resolution
  }

  // Step 4: Parse voting history
  console.log(`\nParsing voting history...`);
  const voteResult = parseVotingHistory(votetableWikitext, seasonNum);
  const voteEvents = voteResult.events;
  warnings.push(...voteResult.warnings);
  console.log(`  Game events (idol plays, etc): ${voteEvents.length}`);
  console.log(`  Tribe histories: ${voteResult.tribeHistories.size} players`);

  // Step 4b: Resolve elimination + challenge player names BEFORE event generation
  const resolvePlayerName = (shortName: string): string => {
    if (playerNames.length === 0) return shortName;
    if (playerNames.includes(shortName)) return shortName;
    // First name match
    const byFirst = playerNames.find(
      (full) =>
        full.split(" ")[0] === shortName || full.startsWith(shortName + " "),
    );
    if (byFirst) return byFirst;
    // Nickname match — e.g., "Q" matches 'Quintavius "Q" Burdette'
    const byNickname = playerNames.find((full) =>
      full.includes(`"${shortName}"`),
    );
    if (byNickname) return byNickname;
    // Last name match
    const byLast = playerNames.find((full) => full.endsWith(` ${shortName}`));
    if (byLast) return byLast;
    // Abbreviated name match — "John K." → "John Kenney" (first name + last initial with period)
    const abbrMatch = shortName.match(/^(\w+)\s+(\w)\.\s*$/);
    if (abbrMatch) {
      const [, firstName, lastInitial] = abbrMatch;
      const byAbbr = playerNames.find((full) => {
        const parts = full.split(" ");
        const fullFirst = parts[0];
        const fullLast = parts[parts.length - 1];
        return fullFirst === firstName && fullLast.startsWith(lastInitial);
      });
      if (byAbbr) return byAbbr;
    }
    return shortName;
  };

  if (playerNames.length > 0) {
    for (const elim of epguideResult.eliminations) {
      elim.playerName = resolvePlayerName(elim.playerName);
    }
    for (const challenge of epguideResult.challenges) {
      challenge.winnerNames = challenge.winnerNames.map(resolvePlayerName);
    }
  }

  // Step 5: Merge events from both sources
  const allEvents = [...voteEvents];

  // Add milestone events from episode guide data
  const mergeEpisode = epguideResult.episodes.find((e) => e.mergeOccurs);
  if (mergeEpisode && playerNames.length > 0) {
    // Generate make_merge events — exclude players eliminated in or before the merge episode
    const eliminatedBefore = new Set(
      epguideResult.eliminations
        .filter((e) => e.episodeNum <= mergeEpisode.order)
        .map((e) => e.playerName),
    );
    const mergePlayers = playerNames.filter(
      (name) => !eliminatedBefore.has(name),
    );
    for (const name of mergePlayers) {
      allEvents.push({
        episodeNum: mergeEpisode.order,
        playerName: name,
        action: "make_merge",
        multiplier: null,
      });
    }
    console.log(
      `  Generated ${mergePlayers.length} make_merge events for episode ${mergeEpisode.order}`,
    );
  } else if (mergeEpisode) {
    warnings.push(
      `Merge detected at episode ${mergeEpisode.order}. ` +
        `make_merge events could not be generated (no player data).`,
    );
  }

  // Detect winner from finale
  const finaleElim = epguideResult.eliminations.find((e) =>
    e.finishText.toLowerCase().includes("sole survivor"),
  );
  if (finaleElim) {
    // The "eliminated" person in the finale with "Sole Survivor" finish IS the winner
    allEvents.push({
      episodeNum: finaleElim.episodeNum,
      playerName: finaleElim.playerName,
      action: "win_survivor",
      multiplier: null,
    });
  }

  // Detect FTC participants
  const ftcElims = epguideResult.eliminations.filter(
    (e) =>
      e.finishText.toLowerCase().includes("runner-up") ||
      e.finishText.toLowerCase().includes("sole survivor"),
  );
  for (const ftc of ftcElims) {
    allEvents.push({
      episodeNum: ftc.episodeNum,
      playerName: ftc.playerName,
      action: "make_final_tribal_council",
      multiplier: null,
    });
  }

  // Step 6: Merge recap events if available
  const recapPath = path.resolve(
    import.meta.dirname,
    "..",
    "data",
    "scraped",
    `season_${seasonNum}_recap_events.json`,
  );
  if (fs.existsSync(recapPath)) {
    console.log(`\nMerging recap events from ${path.basename(recapPath)}...`);
    const recapData = JSON.parse(fs.readFileSync(recapPath, "utf-8"));
    const recapEvents: ScrapeResultsOutput["events"] = recapData.events || [];
    // Deduplicate against existing events
    for (const re of recapEvents) {
      const isDup = allEvents.some(
        (e) =>
          e.episodeNum === re.episodeNum &&
          e.playerName === re.playerName &&
          e.action === re.action,
      );
      if (!isDup) {
        allEvents.push(re);
      }
    }
    console.log(
      `  Merged ${recapEvents.length} recap events (${allEvents.length} total)`,
    );
  }

  // Step 7: Resolve event player names to full names
  if (playerNames.length > 0) {
    console.log(`\nResolving player names (${playerNames.length} players)...`);
    for (const evt of allEvents) {
      evt.playerName = resolvePlayerName(evt.playerName);
    }
  }

  // Step 8: Resolve tribe-level challenge wins to player names using wiki tribe data
  let resolvedTribeHistories: Map<string, PlayerTribeHistory>;

  if (voteResult.tribeHistories.size > 0) {
    // Modern seasons: resolve votetable short names → full names
    resolvedTribeHistories = new Map(
      [...voteResult.tribeHistories.entries()].map(([shortName, hist]) => [
        resolvePlayerName(shortName),
        hist,
      ]),
    );
  } else {
    // Older seasons: votetable doesn't have tribebox2 patterns.
    // Fallback: fetch tribe data from the season page's Castaways table.
    console.log(`\nVotetable has no tribe data — fetching from season page...`);
    const seasonPageName = getSeasonPageName(seasonNum);
    const seasonPageWikitext = await fetchWikitext(seasonPageName);
    if (seasonPageWikitext) {
      const castawayTribes = parseCastawayTribes(seasonPageWikitext);
      console.log(
        `  Parsed ${castawayTribes.size} player tribe assignments from ${seasonPageName}`,
      );
      // Convert to PlayerTribeHistory format (original tribe only, no swaps)
      resolvedTribeHistories = new Map<string, PlayerTribeHistory>();
      for (const [wikiName, tribe] of castawayTribes) {
        const fullName = resolvePlayerName(wikiName);
        resolvedTribeHistories.set(fullName, {
          tribebox2: tribe,
          tribeicons: [],
        });
      }
    } else {
      console.warn(`  Could not fetch season page — tribe resolution skipped`);
      resolvedTribeHistories = new Map();
    }
  }

  const mergeEpNum = mergeEpisode ? mergeEpisode.order : null;
  const tribeRoster = buildTribeRosters(
    resolvedTribeHistories,
    epguideResult.episodes,
    epguideResult.eliminations,
    mergeEpNum,
  );
  console.log(
    `\nResolving challenge winners from wiki tribe data (${tribeRoster.size} episodes)...`,
  );
  let resolved = 0;
  for (const challenge of epguideResult.challenges) {
    // Only resolve tribe-level wins (no individual names yet)
    if (challenge.winnerNames.length > 0 || !challenge.winnerTribe) continue;

    const tribeMap = tribeRoster.get(challenge.episodeNum);
    if (!tribeMap) continue;

    const tribePlayers = tribeMap.get(challenge.winnerTribe.toLowerCase());
    if (tribePlayers && tribePlayers.length > 0) {
      // Names in tribeRoster are already resolved to full names
      challenge.winnerNames = [...tribePlayers].sort();
      resolved++;
    }
  }
  console.log(`  Resolved ${resolved} challenges to player names`);

  // Filter out TBD/placeholder data from future episodes
  const filteredEpisodes = epguideResult.episodes.filter(
    (e) => !e.title.includes("TBD"),
  );
  const filteredChallenges = epguideResult.challenges.filter(
    (c) => !c.winnerNames.some((n) => n === "TBD"),
  );
  // Filter out TBD players and the Sole Survivor (winner is not an elimination)
  const filteredEliminations = epguideResult.eliminations.filter(
    (e) =>
      e.playerName !== "TBD" &&
      !e.finishText.toLowerCase().includes("sole survivor"),
  );
  const filteredEvents = allEvents.filter((e) => e.playerName !== "TBD");

  // Build output
  const result: ScrapeResultsOutput = {
    seasonNum,
    scrapedAt: new Date().toISOString(),
    episodes: filteredEpisodes,
    challenges: filteredChallenges,
    eliminations: filteredEliminations,
    events: filteredEvents,
    warnings,
  };

  // Step 6: Write JSON output
  const outputDir = path.resolve(import.meta.dirname, "..", "data", "scraped");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `season_${seasonNum}_results.json`);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + "\n");

  // Summary
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Results scrape complete for Season ${seasonNum}`);
  console.log(`  Episodes: ${result.episodes.length}`);
  console.log(`  Challenges: ${result.challenges.length}`);
  console.log(`  Eliminations: ${result.eliminations.length}`);
  console.log(`  Events: ${result.events.length}`);
  if (result.warnings.length > 0) {
    console.log(`  Warnings: ${result.warnings.length}`);
    for (const w of result.warnings) {
      console.log(`    ⚠ ${w}`);
    }
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
    console.error("Usage: yarn scrape-results <season_number>");
    console.error("Example: yarn scrape-results 46");
    process.exit(1);
  }

  scrapeResults(seasonNum).catch((err) => {
    console.error("Results scrape failed:", err);
    process.exit(1);
  });
}
