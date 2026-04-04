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
  ScrapedChallengeVariant,
  ScrapedElimination,
  ScrapedEpisode,
  ScrapedGameEvent,
  ScrapedPlayer,
  ScrapeResult,
  ScrapeResultsOutput,
} from "./types.js";

/** Group an array into a Map keyed by a derived value. */
function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const group = map.get(key);
    if (group) {
      group.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

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

  const hasWinner = data.castaways.some((c) => c.winner);
  const episodes = transformEpisodes(
    data.episodes,
    data.tribeMapping,
    hasWinner,
  );
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
  hasWinner: boolean,
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

  const maxEpNum = Math.max(...episodes.map((e) => Math.round(e.episode)));

  return episodes.map((ep) => {
    const epNum = Math.round(ep.episode);

    return {
      order: epNum,
      title: ep.episode_title || `Episode ${epNum}`,
      airDate: new Date(ep.episode_date).toISOString().split("T")[0],
      isCombinedChallenge: false,
      isFinale: hasWinner && epNum === maxEpNum,
      postMerge: postMergeEpisodes.has(epNum),
      mergeOccurs: mergeEpisodes.has(epNum),
    };
  });
}

// --- Challenge transformation ---

/** Determine whether a reward challenge is individual or team/tribal. */
function getRewardVariant(
  first: SurvivorChallengeResult,
  winners: SurvivorChallengeResult[],
): "reward" | "team_reward" {
  const ot = first.outcome_type;
  if (ot === "Individual") return "reward";
  if (ot === "Tribal" || ot === "Team") return "team_reward";
  // Fallback for null/empty outcome_type on early seasons
  if (winners.some((w) => w.won_individual_reward === 1)) return "reward";
  return "team_reward";
}

/** Determine whether an immunity challenge is individual or team/tribal. */
function getImmunityVariant(
  first: SurvivorChallengeResult,
  winners: SurvivorChallengeResult[],
): "immunity" | "team_immunity" {
  const ot = first.outcome_type;
  if (ot === "Individual") return "immunity";
  if (ot === "Tribal" || ot === "Team") return "team_immunity";
  // Fallback for null/empty outcome_type on early seasons
  if (winners.some((w) => w.won_individual_immunity === 1)) return "immunity";
  return "team_immunity";
}

function transformChallenges(
  results: SurvivorChallengeResult[],
): ScrapedChallenge[] {
  const byChallenge = groupBy(results, (r) => Math.round(r.challenge_id));

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
    const type = first.challenge_type.toLowerCase();
    const isCombined = type.includes("immunity") && type.includes("reward");

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

      order += emitChallengeEntries(
        immunityWinners,
        first,
        epNum,
        getImmunityVariant(first, immunityWinners),
        challenges,
        order,
      );
      order += emitChallengeEntries(
        rewardWinners,
        first,
        epNum,
        getRewardVariant(first, rewardWinners),
        challenges,
        order,
      );
    } else {
      const winners = entries.filter((e) => e.result.startsWith("Won"));
      const variant = type.includes("immunity")
        ? getImmunityVariant(first, winners)
        : getRewardVariant(first, winners);
      order += emitChallengeEntries(
        winners,
        first,
        epNum,
        variant,
        challenges,
        order,
      );
    }
  }

  return challenges;
}

/** Emit challenge entries, splitting tribal challenges by tribe. Returns the order increment. */
function emitChallengeEntries(
  winners: SurvivorChallengeResult[],
  first: SurvivorChallengeResult,
  epNum: number,
  variant: ScrapedChallengeVariant,
  challenges: ScrapedChallenge[],
  startOrder: number,
): number {
  if (first.outcome_type === "Tribal" && winners.length > 0) {
    const winnersByTribe = groupBy(winners, (w) => w.tribe);

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
    return winnersByTribe.size;
  }

  challenges.push({
    episodeNum: epNum,
    variant,
    winnerCastawayIds: winners.map((w) => w.castaway_id),
    winnerTribe: null,
    order: startOrder,
  });
  return 1;
}

// --- Elimination transformation ---

function transformEliminations(
  castaways: SurvivorCastaway[],
): ScrapedElimination[] {
  // Filter to eliminated players — exclude the winner (they were never eliminated)
  // Sort by order (elimination order)
  const eliminated = castaways
    .filter((c) => c.result != null && c.result !== "" && !c.winner)
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
  // Covers "voted out", "Xth voted out", "eliminated", and fire-making
  if (
    lower.includes("voted out") ||
    lower.includes("eliminated") ||
    lower.includes("fire")
  )
    return "tribal";
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
  "Choose your Champion": "find_other_advantage",
  "Goodwill Advantage": "find_other_advantage",
  "Inheritance Advantage": "find_other_advantage",
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
  Amulet: "use_amulet",
  "Challenge Advantage": "use_challenge_advantage",
  "Choose your Champion": "use_other_advantage",
  "Goodwill Advantage": "use_other_advantage",
  "Inheritance Advantage": "use_other_advantage",
};

/** Non-scoring vote events — explicitly skipped. */
const IGNORED_VOTE_EVENTS = new Set([
  "Beware advantage",
  "Deadlock",
  "Do or die",
  "Final 3 tribal",
  "Fire challenge (f4)",
  "First out in challenge",
  "Journey challenge",
  "Lost vote at survivor auction",
  "Lost vote on journey",
  "Player quit",
  "Sacrificed vote to extend idol",
  "Sacrificed vote to extend idol; goodwill advantage",
  "Summit",
  "Vote blocked",
]);

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

/** Journey rewards that don't grant a new advantage — explicitly skipped. */
const IGNORED_JOURNEY_REWARDS = new Set([
  "Regained vote",
  "Returned to camp",
  "Sanctuary feast",
]);

/** Map journeys.reward → specific win action. */
const JOURNEY_REWARD_TO_WIN: Record<string, string> = {
  "Extra vote": "win_extra_vote",
  "Extra Vote": "win_extra_vote",
  "Block a Vote": "win_block_a_vote",
  "Block a vote": "win_block_a_vote",
  "Steal a Vote": "win_steal_a_vote",
  "Bank your vote": "win_other_advantage",
  "Safety Without Power": "win_other_advantage",
  Idol: "win_idol",
  "Hidden Immunity Idol": "win_idol",
  "Knowledge is Power": "win_other_advantage",
  Amulet: "win_other_advantage",
  "Challenge advantage": "win_other_advantage",
};

/** Non-scoring advantage lifecycle events — explicitly skipped. */
const IGNORED_ADVANTAGE_EVENTS = new Set([
  "Banked",
  "Became hidden immunity idol",
  "Became steal a vote",
  "Expired",
  "Left game with advantage",
]);

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
    const event = adv.event;

    // Skip multi-player advantage records (e.g., team idols with comma-separated IDs)
    if (adv.castaway_id.includes(",")) {
      warnings.push(
        `Episode ${epNum}: skipping multi-player advantage (${event}) for "${adv.castaway_id}" — individual player events should exist separately`,
      );
      continue;
    }

    const castawayId = adv.castaway_id;
    const detail = detailById.get(adv.advantage_id);
    if (!detail) {
      throw new Error(
        `No advantage_details entry for advantage_id ${adv.advantage_id} (${event} by ${castawayId} in episode ${epNum}). Check survivoR data.`,
      );
    }
    const advType = detail.advantage_type;

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
      const findAction = ADVANTAGE_TYPE_TO_FIND[advType];
      if (!findAction) {
        throw new Error(
          `Unknown advantage type "${advType}" found by ${castawayId} in episode ${epNum}. Add it to ADVANTAGE_TYPE_TO_FIND.`,
        );
      }
      events.push({
        episodeNum: epNum,
        castawayId,
        action: findAction,
        multiplier: null,
      });
    } else if (event === "Played") {
      const useAction = ADVANTAGE_TYPE_TO_USE[advType];
      if (!useAction) {
        throw new Error(
          `Unknown advantage type "${advType}" played by ${castawayId} in episode ${epNum}. Add it to ADVANTAGE_TYPE_TO_USE.`,
        );
      }
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
    } else if (event === "Voted out with advantage") {
      events.push({
        episodeNum: epNum,
        castawayId,
        action: IDOL_TYPES.has(advType)
          ? "voted_out_with_idol"
          : "voted_out_with_advantage",
        multiplier: null,
      });
    } else if (IGNORED_ADVANTAGE_EVENTS.has(event)) {
      // Non-scoring lifecycle events — skip silently
    } else {
      throw new Error(
        `Unknown advantage event "${event}" for ${advType} by ${castawayId} in episode ${epNum}. Add handling for this event type.`,
      );
    }
  }

  // Derive votes_negated_by_idol from nullified votes + idol plays
  // Group nullified votes by (episode, target castaway_id)
  const nullifiedByEp = new Map<number, Map<string, number>>();
  for (const v of voteHistory) {
    if (!v.nullified) continue;
    const epNum = Math.round(v.episode);
    if (!nullifiedByEp.has(epNum)) nullifiedByEp.set(epNum, new Map());
    const targets = nullifiedByEp.get(epNum)!;
    targets.set(v.vote_id, (targets.get(v.vote_id) ?? 0) + 1);
  }

  // Collect idol plays from advantage_movement
  const idolPlays = advantageMovement
    .filter(
      (a) =>
        a.event === "Played" &&
        IDOL_TYPES.has(detailById.get(a.advantage_id)?.advantage_type ?? ""),
    )
    .map((a) => ({
      epNum: Math.round(a.episode),
      castawayId: a.castaway_id,
    }));

  for (const play of idolPlays) {
    const targets = nullifiedByEp.get(play.epNum);
    if (!targets || targets.size === 0) continue;

    // Prefer self-play (idol player is the target), else single remaining target
    let matchedTarget: string | undefined;
    if (targets.has(play.castawayId)) {
      matchedTarget = play.castawayId;
    } else if (targets.size === 1) {
      matchedTarget = targets.keys().next().value;
    }

    if (matchedTarget) {
      const negatedCount = targets.get(matchedTarget)!;
      targets.delete(matchedTarget);

      events.push({
        episodeNum: play.epNum,
        castawayId: play.castawayId,
        action: "votes_negated_by_idol",
        multiplier: negatedCount,
      });
    } else {
      warnings.push(
        `Episode ${play.epNum}: could not match idol play by ${play.castawayId} to nullified votes (${targets.size} unmatched targets)`,
      );
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
      const winAction = JOURNEY_REWARD_TO_WIN[j.reward];
      const isLoss = j.reward.toLowerCase().includes("lost");
      const isIgnored = IGNORED_JOURNEY_REWARDS.has(j.reward);
      if (!winAction && !isLoss && !isIgnored) {
        throw new Error(
          `Unknown journey reward "${j.reward}" for ${castawayId} in episode ${epNum}. Add it to JOURNEY_REWARD_TO_WIN or IGNORED_JOURNEY_REWARDS.`,
        );
      }
      if (winAction) {
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
    } else if (!IGNORED_VOTE_EVENTS.has(v.vote_event)) {
      throw new Error(
        `Unknown vote_event "${v.vote_event}" for ${castawayId} in episode ${epNum}. Add it to VOTE_EVENT_TO_USE or IGNORED_VOTE_EVENTS.`,
      );
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
