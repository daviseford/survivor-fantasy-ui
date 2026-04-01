/**
 * Transform survivoR2py data into the app's existing scraper types
 * (ScrapeResult, ScrapeResultsOutput) so the existing codegen pipeline
 * can generate season files from survivoR2py data without modification.
 */

import type { SurvivorSeasonData } from "./survivoR2py-client.js";
import type {
  SurvivorAdvantageMovement,
  SurvivorCastaway,
  SurvivorChallengeResult,
  SurvivorEpisode,
  SurvivorTribeMapping,
} from "./survivoR2py-types.js";
import type {
  ScrapedChallenge,
  ScrapedElimination,
  ScrapedEpisode,
  ScrapedGameEvent,
  ScrapedPlayer,
  ScrapeResult,
  ScrapeResultsOutput,
} from "./types.js";

/**
 * Build a lookup map from castaway short name → full_name.
 * Used to resolve short names in challenge_results, tribe_mapping,
 * and advantage_movement back to the full names codegen expects.
 */
function buildShortNameMap(castaways: SurvivorCastaway[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of castaways) {
    map.set(c.castaway, c.full_name);
    // Also map castaway_id for advantage_movement lookups
    map.set(c.castaway_id, c.full_name);
  }
  return map;
}

/** Resolve a short name or castaway_id to full name, falling back to the input. */
function resolveFullName(
  nameOrId: string,
  nameMap: Map<string, string>,
): string {
  return nameMap.get(nameOrId) ?? nameOrId;
}

/**
 * Transform survivoR2py season data into the app's ScrapeResult (players).
 */
export function transformPlayers(
  data: SurvivorSeasonData,
  seasonNum: number,
): ScrapeResult {
  // Deduplicate castaways by castaway_id (returning players appear once per season)
  const seen = new Set<string>();
  const uniqueCastaways: SurvivorCastaway[] = [];
  for (const c of data.castaways) {
    if (!seen.has(c.castaway_id)) {
      seen.add(c.castaway_id);
      uniqueCastaways.push(c);
    }
  }

  const players: ScrapedPlayer[] = uniqueCastaways.map((c) => {
    const hometown =
      c.city && c.state
        ? `${c.city}, ${c.state}`
        : c.city || c.state || undefined;

    return {
      wikiPageTitle: c.full_name,
      localName: c.full_name,
      matchStatus: "exact" as const,
      age: c.age ?? undefined,
      hometown,
      nickname:
        c.castaway !== c.full_name.split(" ")[0] ? c.castaway : undefined,
    };
  });

  return {
    seasonNum,
    scrapedAt: new Date().toISOString(),
    players,
    unmatched: [],
  };
}

/**
 * Transform survivoR2py season data into the app's ScrapeResultsOutput (gameplay).
 */
export function transformResults(
  data: SurvivorSeasonData,
  seasonNum: number,
): ScrapeResultsOutput {
  const warnings: string[] = [];
  const nameMap = buildShortNameMap(data.castaways);

  const episodes = transformEpisodes(data.episodes, data.tribeMapping);
  const challenges = transformChallenges(
    data.challengeResults,
    data.tribeMapping,
    nameMap,
  );
  const eliminations = transformEliminations(data.castaways);
  const events = transformEvents(
    data.advantageMovement,
    data.castaways,
    data.tribeMapping,
    nameMap,
    warnings,
  );

  // Warn about data gaps
  if (data.episodes.length === 0) {
    warnings.push(`No episodes found for Season ${seasonNum} in survivoR2py`);
  }
  if (data.challengeResults.length === 0) {
    warnings.push(
      `No challenge results found for Season ${seasonNum} in survivoR2py`,
    );
  }

  return {
    seasonNum,
    scrapedAt: new Date().toISOString(),
    episodes,
    challenges,
    eliminations,
    events,
    warnings,
  };
}

// --- Episode transformation ---

function transformEpisodes(
  episodes: SurvivorEpisode[],
  tribeMapping: SurvivorTribeMapping[],
): ScrapedEpisode[] {
  // Detect merge episode: when tribe_status becomes "Merged"
  const mergeEpisodes = new Set<number>();
  const postMergeEpisodes = new Set<number>();
  let mergeFound = false;
  const episodeNums = [
    ...new Set(tribeMapping.map((t) => Math.round(t.episode))),
  ].sort((a, b) => a - b);
  for (const ep of episodeNums) {
    const tribes = tribeMapping.filter((t) => Math.round(t.episode) === ep);
    const hasMerged = tribes.some((t) => t.tribe_status === "Merged");
    if (hasMerged && !mergeFound) {
      mergeEpisodes.add(ep);
      mergeFound = true;
    }
    if (mergeFound) {
      postMergeEpisodes.add(ep);
    }
  }

  return episodes.map((ep) => {
    const epNum = Math.round(ep.episode);
    const isFinale =
      epNum === Math.max(...episodes.map((e) => Math.round(e.episode)));
    const title = ep.episode_title || `Episode ${epNum}`;

    return {
      order: epNum,
      title,
      airDate: new Date(ep.episode_date).toISOString().split("T")[0],
      isCombinedChallenge: false, // survivoR2py doesn't have this flag directly
      isFinale: isFinale,
      postMerge: postMergeEpisodes.has(epNum),
      mergeOccurs: mergeEpisodes.has(epNum),
    };
  });
}

// --- Challenge transformation ---

function transformChallenges(
  results: SurvivorChallengeResult[],
  tribeMapping: SurvivorTribeMapping[],
  nameMap: Map<string, string>,
): ScrapedChallenge[] {
  // Group by challenge_id
  const byChallenge = new Map<number, SurvivorChallengeResult[]>();
  for (const r of results) {
    const id = Math.round(r.challenge_id);
    if (!byChallenge.has(id)) byChallenge.set(id, []);
    byChallenge.get(id)!.push(r);
  }

  const challenges: ScrapedChallenge[] = [];
  let order = 0;

  // Sort challenges by episode then challenge_id
  const sortedIds = [...byChallenge.keys()].sort((a, b) => {
    const aEp = Math.round(byChallenge.get(a)![0].episode);
    const bEp = Math.round(byChallenge.get(b)![0].episode);
    if (aEp !== bEp) return aEp - bEp;
    return a - b;
  });

  for (const chalId of sortedIds) {
    const entries = byChallenge.get(chalId)!;
    const first = entries[0];
    const epNum = Math.round(first.episode);

    // Determine variant
    const type = first.challenge_type.toLowerCase();
    let variant: "reward" | "immunity" | "combined";
    if (type.includes("immunity") && type.includes("reward")) {
      variant = "combined";
    } else if (type.includes("immunity")) {
      variant = "immunity";
    } else {
      variant = "reward";
    }

    // Find winners — resolve short names to full names for codegen compatibility
    const winners = entries.filter(
      (e) => e.result === "Won" || e.result === "Winner",
    );
    const winnerNames = winners.map((w) =>
      resolveFullName(w.castaway, nameMap),
    );

    // Determine winning tribe (for tribal challenges)
    let winnerTribe: string | null = null;
    if (first.outcome_type === "Tribal" && winners.length > 0) {
      winnerTribe = winners[0].tribe;
    }

    order++;
    challenges.push({
      episodeNum: epNum,
      variant,
      winnerNames,
      winnerTribe,
      order,
    });
  }

  return challenges;
}

// --- Elimination transformation ---

function transformEliminations(
  castaways: SurvivorCastaway[],
): ScrapedElimination[] {
  // Filter to eliminated players (not the winner, not still in game)
  // Sort by order (elimination order)
  const eliminated = castaways
    .filter((c) => c.result && c.result !== "")
    .sort((a, b) => a.order - b.order);

  return eliminated.map((c, idx) => {
    const variant = mapResultToVariant(c.result);
    const epNum = Math.round(c.episode);

    return {
      episodeNum: epNum,
      playerName: c.full_name,
      voteString: "",
      variant,
      finishText: c.result,
      order: idx + 1,
    };
  });
}

function mapResultToVariant(
  result: string,
): "tribal" | "medical" | "quitter" | "final_tribal_council" | "other" {
  const lower = result.toLowerCase();
  if (lower.includes("sole survivor") || lower.includes("winner"))
    return "final_tribal_council";
  if (lower.includes("runner") || lower.includes("finalist"))
    return "final_tribal_council";
  if (lower.includes("medically evacuated") || lower.includes("medical"))
    return "medical";
  if (lower.includes("quit")) return "quitter";
  if (lower.includes("voted out") || lower.includes("eliminated"))
    return "tribal";
  if (lower.includes("fire")) return "other";
  // Default to tribal for numbered elimination results like "1st voted out"
  if (/\d+(st|nd|rd|th)\s+voted\s+out/i.test(result)) return "tribal";
  return "tribal";
}

// --- Event transformation ---

function transformEvents(
  advantageMovement: SurvivorAdvantageMovement[],
  castaways: SurvivorCastaway[],
  tribeMapping: SurvivorTribeMapping[],
  nameMap: Map<string, string>,
  warnings: string[],
): ScrapedGameEvent[] {
  const events: ScrapedGameEvent[] = [];

  // Advantage events — resolve short names to full names
  for (const adv of advantageMovement) {
    const epNum = Math.round(adv.episode);
    const playerName = resolveFullName(adv.castaway, nameMap);

    switch (adv.event) {
      case "Found":
        events.push({
          episodeNum: epNum,
          playerName,
          action: "find_idol",
          multiplier: null,
        });
        break;
      case "Played":
        events.push({
          episodeNum: epNum,
          playerName,
          action: "use_idol",
          multiplier: null,
        });
        if (
          adv.votes_nullified !== null &&
          adv.votes_nullified !== undefined &&
          adv.votes_nullified > 0
        ) {
          events.push({
            episodeNum: epNum,
            playerName,
            action: "votes_negated_by_idol",
            multiplier: adv.votes_nullified,
          });
        }
        break;
      case "Received":
        events.push({
          episodeNum: epNum,
          playerName,
          action: "win_advantage",
          multiplier: null,
        });
        break;
    }
  }

  // Merge event — detect from tribe_mapping
  const mergeEp = detectMergeEpisode(tribeMapping);
  if (mergeEp !== null) {
    // All players still in the game at merge — resolve to full names
    const mergedPlayers = tribeMapping
      .filter(
        (t) => Math.round(t.episode) === mergeEp && t.tribe_status === "Merged",
      )
      .map((t) => resolveFullName(t.castaway, nameMap));

    const uniqueMerged = [...new Set(mergedPlayers)];
    for (const name of uniqueMerged) {
      events.push({
        episodeNum: mergeEp,
        playerName: name,
        action: "make_merge",
        multiplier: null,
      });
    }
  }

  // Winner event
  const winner = castaways.find((c) => c.winner);
  if (winner) {
    const lastEp = Math.max(...castaways.map((c) => Math.round(c.episode)));
    events.push({
      episodeNum: lastEp,
      playerName: winner.full_name,
      action: "win_survivor",
      multiplier: null,
    });

    // FTC participants
    const finalists = castaways.filter((c) => c.finalist || c.winner);
    for (const f of finalists) {
      events.push({
        episodeNum: lastEp,
        playerName: f.full_name,
        action: "make_final_tribal_council",
        multiplier: null,
      });
    }
  }

  return events;
}

function detectMergeEpisode(
  tribeMapping: SurvivorTribeMapping[],
): number | null {
  for (const t of tribeMapping) {
    if (t.tribe_status === "Merged") {
      return Math.round(t.episode);
    }
  }
  return null;
}
