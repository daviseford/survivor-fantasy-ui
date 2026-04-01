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
 * Build a lookup map from castaway short name / full_name → castaway_id.
 * Used to resolve short names in tribe_mapping back to castaway_id.
 */
function buildCastawayIdMap(
  castaways: SurvivorCastaway[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of castaways) {
    map.set(c.castaway, c.castaway_id);
    map.set(c.full_name, c.castaway_id);
    map.set(c.castaway_id, c.castaway_id);
  }
  return map;
}

/** Resolve a short name or full_name to castaway_id, falling back to the input. */
function resolveCastawayId(
  nameOrId: string,
  idMap: Map<string, string>,
): string {
  return idMap.get(nameOrId) ?? nameOrId;
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
      castawayId: c.castaway_id,
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
  const idMap = buildCastawayIdMap(data.castaways);

  const episodes = transformEpisodes(data.episodes, data.tribeMapping);
  const challenges = transformChallenges(data.challengeResults);
  const eliminations = transformEliminations(data.castaways);
  const events = transformEvents(
    data.advantageMovement,
    data.advantageDetails,
    data.voteHistory,
    data.journeys,
    data.castaways,
    data.tribeMapping,
    idMap,
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
      emitChallengeEntries(winners, first, epNum, variant, challenges, order);
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
        winnerCastawayIds: tribeWinners.map((w) => w.castaway_id),
        winnerTribe: tribe,
        order: startOrder + idx,
      });
      idx++;
    }
  } else {
    challenges.push({
      episodeNum: epNum,
      variant,
      winnerCastawayIds: winners.map((w) => w.castaway_id),
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
      castawayId: c.castaway_id,
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

/** Map advantage_details.advantage_type → specific find action. */
const ADVANTAGE_TYPE_TO_FIND: Record<string, string> = {
  "Hidden Immunity Idol": "find_idol",
  "Hidden Immunity Idol Half": "find_idol",
  "Preventative Hidden Immunity Idol": "find_idol",
  "Super Idol": "find_idol",
  "Extra Vote": "find_extra_vote",
  "Steal a Vote": "find_steal_a_vote",
  "Block a Vote": "find_block_a_vote",
  "Vote Blocker": "find_block_a_vote",
  "Bank your Vote": "find_bank_your_vote",
  "Idol Nullifier": "find_idol_nullifier",
  "Knowledge is Power": "find_knowledge_is_power",
  "Safety without Power": "find_safety_without_power",
  "Control the Vote": "find_control_the_vote",
  Amulet: "find_amulet",
  "Challenge Advantage": "find_challenge_advantage",
};

/** Map advantage_details.advantage_type → specific use action. */
const ADVANTAGE_TYPE_TO_USE: Record<string, string> = {
  "Hidden Immunity Idol": "use_idol",
  "Hidden Immunity Idol Half": "use_idol",
  "Preventative Hidden Immunity Idol": "use_idol",
  "Super Idol": "use_idol",
  "Extra Vote": "use_extra_vote",
  "Steal a Vote": "use_steal_a_vote",
  "Block a Vote": "use_block_a_vote",
  "Vote Blocker": "use_block_a_vote",
  "Bank your Vote": "use_bank_your_vote",
  "Idol Nullifier": "use_idol_nullifier",
  "Knowledge is Power": "use_knowledge_is_power",
  "Safety without Power": "use_safety_without_power",
  "Control the Vote": "use_control_the_vote",
};

/** Map vote_history.vote_event → specific use action. */
const VOTE_EVENT_TO_USE: Record<string, string> = {
  "Extra vote": "use_extra_vote",
  "Steal a vote": "use_steal_a_vote",
  "Block a vote": "use_block_a_vote",
  "Played block a vote": "use_block_a_vote",
  "Vote blocker": "use_block_a_vote",
  "Bank your vote": "use_bank_your_vote",
  "Played bank your vote": "use_bank_your_vote",
  "Played banked vote": "use_bank_your_vote",
  "Safety without power": "use_safety_without_power",
  "Control the vote": "use_control_the_vote",
};

/** Map journeys.reward → specific win action. */
const JOURNEY_REWARD_TO_WIN: Record<string, string> = {
  "Extra vote": "win_extra_vote",
  "Block a Vote": "win_block_a_vote",
  "Steal a Vote": "win_steal_a_vote",
  Idol: "win_idol",
  "Hidden Immunity Idol": "win_idol",
};

/** Idol advantage types (for beware lifecycle detection). */
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
  idMap: Map<string, string>,
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
    const castawayId = adv.castaway_id;
    const event = adv.event;
    const detail = detailById.get(adv.advantage_id);
    const advType = detail?.advantage_type ?? "";

    if (event === "Found (beware)") {
      bewareFoundIds.add(adv.advantage_id);
      events.push({
        episodeNum: epNum,
        castawayId,
        action: "find_beware_advantage",
        multiplier: null,
      });
      events.push({
        episodeNum: epNum,
        castawayId,
        action: "accept_beware_advantage",
        multiplier: null,
      });
    } else if (event.startsWith("Found")) {
      if (bewareFoundIds.has(adv.advantage_id)) {
        events.push({
          episodeNum: epNum,
          castawayId,
          action: "fulfill_beware_advantage",
          multiplier: null,
        });
      }
      const findAction =
        ADVANTAGE_TYPE_TO_FIND[advType] ?? "find_other_advantage";
      events.push({
        episodeNum: epNum,
        castawayId,
        action: findAction,
        multiplier: null,
      });
    } else if (event === "Played") {
      const useAction = ADVANTAGE_TYPE_TO_USE[advType] ?? "use_idol";
      events.push({
        episodeNum: epNum,
        castawayId,
        action: useAction,
        multiplier: null,
      });
    } else if (event === "Received" || event === "Recieved") {
      const winAction = IDOL_TYPES.has(advType)
        ? "win_idol"
        : "win_other_advantage";
      events.push({
        episodeNum: epNum,
        castawayId,
        action: winAction,
        multiplier: null,
      });
    }
  }

  // Journey events (S41+)
  for (const j of journeys) {
    const epNum = Math.round(j.episode);
    const castawayId = j.castaway_id;

    events.push({
      episodeNum: epNum,
      castawayId,
      action: "go_on_journey",
      multiplier: null,
    });

    if (j.reward) {
      const winAction =
        JOURNEY_REWARD_TO_WIN[j.reward] ?? "win_other_advantage";
      if (
        winAction !== "win_other_advantage" ||
        !j.reward.toLowerCase().includes("lost")
      ) {
        events.push({
          episodeNum: epNum,
          castawayId,
          action: winAction,
          multiplier: null,
        });
      }
    }
  }

  // Vote history events (S41+) — SITD and advantage plays from vote_event
  for (const v of voteHistory) {
    if (!v.vote_event) continue;
    const epNum = Math.round(v.episode);
    const castawayId = v.castaway_id;

    if (v.vote_event === "Shot in the dark") {
      const success = v.vote_event_outcome === "Safe";
      events.push({
        episodeNum: epNum,
        castawayId,
        action: success
          ? "use_shot_in_the_dark_successfully"
          : "use_shot_in_the_dark_unsuccessfully",
        multiplier: null,
      });
    } else if (VOTE_EVENT_TO_USE[v.vote_event]) {
      events.push({
        episodeNum: epNum,
        castawayId,
        action: VOTE_EVENT_TO_USE[v.vote_event],
        multiplier: null,
      });
    }
  }

  // Merge event — detect from tribe_mapping
  const mergeEp = detectMergeEpisode(tribeMapping);
  if (mergeEp !== null) {
    const mergedIds = tribeMapping
      .filter(
        (t) =>
          Math.round(t.episode) === mergeEp &&
          (t.tribe_status === "Merged" || t.tribe_status === "Mergatory"),
      )
      .map((t) => resolveCastawayId(t.castaway, idMap));

    const uniqueMerged = [...new Set(mergedIds)];
    for (const castawayId of uniqueMerged) {
      events.push({
        episodeNum: mergeEp,
        castawayId,
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
      castawayId: winner.castaway_id,
      action: "win_survivor",
      multiplier: null,
    });

    // FTC participants
    const finalists = castaways.filter((c) => c.finalist || c.winner);
    for (const f of finalists) {
      events.push({
        episodeNum: lastEp,
        castawayId: f.castaway_id,
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
