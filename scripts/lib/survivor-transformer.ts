/**
 * Transform survivoR data into the app's existing scraper types
 * (ScrapeResult, ScrapeResultsOutput) so the existing codegen pipeline
 * can generate season files from survivoR data without modification.
 */

import type { SurvivorSeasonData } from "./survivor-client.js";
import type {
  SurvivorAdvantageDetail,
  SurvivorAdvantageMovement,
  SurvivorCastaway,
  SurvivorChallengeResult,
  SurvivorEpisode,
  SurvivorJourney,
  SurvivorTribeMapping,
  SurvivorVoteHistory,
} from "./survivor-types.js";
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
 * Transform survivoR season data into the app's ScrapeResult (players).
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
 * Transform survivoR season data into the app's ScrapeResultsOutput (gameplay).
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
    data.advantageDetails,
    data.voteHistory,
    data.journeys,
    data.castaways,
    data.tribeMapping,
    nameMap,
    warnings,
  );

  // Warn about data gaps
  if (data.episodes.length === 0) {
    warnings.push(`No episodes found for Season ${seasonNum} in survivoR`);
  }
  if (data.challengeResults.length === 0) {
    warnings.push(
      `No challenge results found for Season ${seasonNum} in survivoR`,
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
  // Detect merge episode: "Mergatory" (S46+) marks the actual merge episode;
  // for older seasons, the first "Merged" status IS the merge episode.
  const mergeEp = detectMergeEpisode(tribeMapping);
  const mergeEpisodes = new Set<number>();
  const postMergeEpisodes = new Set<number>();
  if (mergeEp !== null) {
    mergeEpisodes.add(mergeEp);
    const episodeNums = [
      ...new Set(tribeMapping.map((t) => Math.round(t.episode))),
    ].sort((a, b) => a - b);
    for (const ep of episodeNums) {
      if (ep >= mergeEp) postMergeEpisodes.add(ep);
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
      isCombinedChallenge: false, // survivoR doesn't have this flag directly
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

    // Determine base variant
    const type = first.challenge_type.toLowerCase();
    const isCombined = type.includes("immunity") && type.includes("reward");
    let variant: "reward" | "immunity" | "combined";
    if (isCombined) {
      variant = "combined";
    } else if (type.includes("immunity")) {
      variant = "immunity";
    } else {
      variant = "reward";
    }

    if (isCombined) {
      // Split combined challenges into separate immunity + reward entries
      const immunityWinners = entries.filter(
        (e) =>
          e.won_tribal_immunity === 1 ||
          e.won_individual_immunity === 1 ||
          e.won_team_immunity === 1,
      );
      const rewardWinners = entries.filter(
        (e) =>
          e.won_tribal_reward === 1 ||
          e.won_individual_reward === 1 ||
          e.won_team_reward === 1,
      );

      // Emit immunity entry (split by tribe if tribal)
      emitChallengeEntries(
        immunityWinners,
        first,
        epNum,
        "immunity",
        nameMap,
        challenges,
        order,
      );
      order +=
        first.outcome_type === "Tribal" && immunityWinners.length > 0
          ? new Set(immunityWinners.map((w) => w.tribe)).size
          : 1;

      // Emit reward entry (split by tribe if tribal)
      emitChallengeEntries(
        rewardWinners,
        first,
        epNum,
        "reward",
        nameMap,
        challenges,
        order,
      );
      order +=
        first.outcome_type === "Tribal" && rewardWinners.length > 0
          ? new Set(rewardWinners.map((w) => w.tribe)).size
          : 1;
    } else {
      // Non-combined challenge
      const winners = entries.filter((e) => e.result.startsWith("Won"));
      emitChallengeEntries(
        winners,
        first,
        epNum,
        variant,
        nameMap,
        challenges,
        order,
      );
      order +=
        first.outcome_type === "Tribal" && winners.length > 0
          ? new Set(winners.map((w) => w.tribe)).size
          : 1;
    }
  }

  return challenges;
}

/** Emit challenge entries, splitting tribal challenges by tribe. */
function emitChallengeEntries(
  winners: SurvivorChallengeResult[],
  first: SurvivorChallengeResult,
  epNum: number,
  variant: "reward" | "immunity" | "combined",
  nameMap: Map<string, string>,
  challenges: ScrapedChallenge[],
  startOrder: number,
): void {
  if (first.outcome_type === "Tribal" && winners.length > 0) {
    const winnersByTribe = new Map<string, SurvivorChallengeResult[]>();
    for (const w of winners) {
      if (!winnersByTribe.has(w.tribe)) winnersByTribe.set(w.tribe, []);
      winnersByTribe.get(w.tribe)!.push(w);
    }

    let idx = 0;
    for (const [tribe, tribeWinners] of winnersByTribe) {
      challenges.push({
        episodeNum: epNum,
        variant,
        winnerNames: tribeWinners.map((w) =>
          resolveFullName(w.castaway, nameMap),
        ),
        winnerTribe: tribe,
        order: startOrder + idx,
      });
      idx++;
    }
  } else {
    challenges.push({
      episodeNum: epNum,
      variant,
      winnerNames: winners.map((w) => resolveFullName(w.castaway, nameMap)),
      winnerTribe: null,
      order: startOrder,
    });
  }
}

// --- Elimination transformation ---

function transformEliminations(
  castaways: SurvivorCastaway[],
): ScrapedElimination[] {
  // Filter to eliminated players — exclude the winner (they were never eliminated)
  // Sort by order (elimination order)
  const eliminated = castaways
    .filter((c) => c.result && c.result !== "" && !c.winner)
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
  if (lower.includes("fire")) return "tribal";
  // Default to tribal for numbered elimination results like "1st voted out"
  if (/\d+(st|nd|rd|th)\s+voted\s+out/i.test(result)) return "tribal";
  return "tribal";
}

// --- Event transformation ---

/** Journey rewards that represent gaining an advantage. */
const ADVANTAGE_REWARDS = new Set([
  "extra vote",
  "block a vote",
  "steal a vote",
  "idol",
  "hidden immunity idol",
  "advantage",
]);

/** Returns true if a journey reward represents winning an advantage. */
function isAdvantageReward(reward: string | null): boolean {
  if (!reward) return false;
  return ADVANTAGE_REWARDS.has(reward.toLowerCase());
}

/** Advantage types that are idols (for use_idol vs use_advantage distinction). */
const IDOL_TYPES = new Set([
  "Hidden Immunity Idol",
  "Hidden Immunity Idol Half",
  "Preventative Hidden Immunity Idol",
  "Super Idol",
]);

function transformEvents(
  advantageMovement: SurvivorAdvantageMovement[],
  advantageDetails: SurvivorAdvantageDetail[],
  voteHistory: SurvivorVoteHistory[],
  journeys: SurvivorJourney[],
  castaways: SurvivorCastaway[],
  tribeMapping: SurvivorTribeMapping[],
  nameMap: Map<string, string>,
  warnings: string[],
): ScrapedGameEvent[] {
  const events: ScrapedGameEvent[] = [];

  // Build advantage_id → detail lookup for type-aware event mapping
  const detailById = new Map<number, SurvivorAdvantageDetail>();
  for (const d of advantageDetails) {
    detailById.set(d.advantage_id, d);
  }

  // Track beware advantage_ids that have been "Found (beware)" to detect fulfill
  const bewareFoundIds = new Set<number>();

  // Advantage events — type-aware mapping using advantage_details
  for (const adv of advantageMovement) {
    const epNum = Math.round(adv.episode);
    const playerName = resolveFullName(adv.castaway, nameMap);
    const event = adv.event;
    const detail = detailById.get(adv.advantage_id);
    const isIdol = detail ? IDOL_TYPES.has(detail.advantage_type) : true; // default to idol if unknown
    const isBeware = detail?.conditions === "Beware advantage";

    if (event === "Found (beware)") {
      // Beware advantage found — emit find + accept (taking it implies acceptance)
      bewareFoundIds.add(adv.advantage_id);
      events.push({
        episodeNum: epNum,
        playerName,
        action: "find_beware_advantage",
        multiplier: null,
      });
      events.push({
        episodeNum: epNum,
        playerName,
        action: "accept_beware_advantage",
        multiplier: null,
      });
    } else if (event.startsWith("Found")) {
      if (bewareFoundIds.has(adv.advantage_id)) {
        // Same advantage_id was previously "Found (beware)" → beware condition fulfilled
        events.push({
          episodeNum: epNum,
          playerName,
          action: "fulfill_beware_advantage",
          multiplier: null,
        });
      }
      // The advantage/idol is now active
      events.push({
        episodeNum: epNum,
        playerName,
        action: isIdol ? "find_idol" : "find_advantage",
        multiplier: null,
      });
    } else if (event === "Played") {
      events.push({
        episodeNum: epNum,
        playerName,
        action: isIdol ? "use_idol" : "use_advantage",
        multiplier: null,
      });
    } else if (event === "Received" || event === "Recieved") {
      events.push({
        episodeNum: epNum,
        playerName,
        action: "win_advantage",
        multiplier: null,
      });
    }
  }

  // Journey events (S41+) — each player who goes on a journey gets go_on_journey,
  // and players who gain an advantage also get win_advantage
  for (const j of journeys) {
    const epNum = Math.round(j.episode);
    const playerName = resolveFullName(j.castaway, nameMap);

    events.push({
      episodeNum: epNum,
      playerName,
      action: "go_on_journey",
      multiplier: null,
    });

    if (isAdvantageReward(j.reward)) {
      events.push({
        episodeNum: epNum,
        playerName,
        action: "win_advantage",
        multiplier: null,
      });
    }
  }

  // Shot in the Dark events (S41+) — from vote_history.vote_event
  for (const v of voteHistory) {
    if (v.vote_event === "Shot in the dark") {
      const epNum = Math.round(v.episode);
      const playerName = resolveFullName(v.castaway, nameMap);
      const success = v.vote_event_outcome === "Safe";

      events.push({
        episodeNum: epNum,
        playerName,
        action: success
          ? "use_shot_in_the_dark_successfully"
          : "use_shot_in_the_dark_unsuccessfully",
        multiplier: null,
      });
    }
  }

  // Merge event — detect from tribe_mapping
  const mergeEp = detectMergeEpisode(tribeMapping);
  if (mergeEp !== null) {
    // All players still in the game at merge — resolve to full names
    // "Mergatory" (S46+) or "Merged" (older seasons) both indicate merged players
    const mergedPlayers = tribeMapping
      .filter(
        (t) =>
          Math.round(t.episode) === mergeEp &&
          (t.tribe_status === "Merged" || t.tribe_status === "Mergatory"),
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
  // "Mergatory" (S46+) marks the actual merge episode
  for (const t of tribeMapping) {
    if (t.tribe_status === "Mergatory") {
      return Math.round(t.episode);
    }
  }
  // Older seasons: first "Merged" status IS the merge episode
  for (const t of tribeMapping) {
    if (t.tribe_status === "Merged") {
      return Math.round(t.episode);
    }
  }
  return null;
}
