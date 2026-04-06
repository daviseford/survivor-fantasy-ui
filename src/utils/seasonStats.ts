/**
 * Season stats aggregation engine.
 *
 * Computes card-ready stat models from competition-scoped, spoiler-filtered data.
 * Returns grouped card descriptors for the SeasonStatsSection UI.
 */

import {
  CastawayId,
  Challenge,
  Competition,
  DraftPick,
  Elimination,
  GameEvent,
  VoteHistory,
} from "../types";
import { EnhancedScores } from "./scoringUtils";

// ---------------------------------------------------------------------------
// Card types
// ---------------------------------------------------------------------------

export type StatCardGroup = "castaway" | "roster";

export type StatCardTone = "positive" | "negative";

export interface StatCardWinner {
  id: string; // castaway_id for castaway cards, user uid for roster cards
  label: string; // display name
  value: number;
  detail?: string; // e.g. "(3 nullified by idol)"
}

export interface StatCard {
  key: string;
  group: StatCardGroup;
  tone: StatCardTone;
  title: string;
  subtitle?: string;
  winners: StatCardWinner[];
  unit?: string; // e.g. "pts", "wins", "votes"
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface SeasonStatsInput {
  competition: Competition;
  filteredChallenges: Record<string, Challenge>;
  filteredEliminations: Record<string, Elimination>;
  filteredEvents: Record<string, GameEvent>;
  filteredVoteHistory: Record<string, VoteHistory>;
  /** Per-castaway per-episode scoring from useScoringCalculations */
  survivorPointsByEpisode: Record<string, EnhancedScores[]>;
  /** Per-user per-episode totals from useScoringCalculations */
  pointsByUserPerEpisode: Record<string, number[]> | undefined;
  /** Display name resolver: castaway_id → display name */
  resolveName: (id: CastawayId) => string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDraftedCastawayIds(competition: Competition): Set<CastawayId> {
  return new Set(competition.draft_picks.map((p) => p.castaway_id));
}

function getDraftOwnership(
  picks: DraftPick[],
): Map<CastawayId, { uid: string; name: string }> {
  const map = new Map<CastawayId, { uid: string; name: string }>();
  for (const p of picks) {
    map.set(p.castaway_id, { uid: p.user_uid, name: p.user_name });
  }
  return map;
}

function getParticipantName(competition: Competition, uid: string): string {
  return (
    competition.participants.find((p) => p.uid === uid)?.displayName ?? uid
  );
}

/** Get drafted castaways who made the merge. */
function getPostMergeIds(
  events: Record<string, GameEvent>,
  draftedIds: Set<CastawayId>,
): Set<CastawayId> {
  const ids = new Set<CastawayId>();
  for (const ev of Object.values(events)) {
    if (ev.action === "make_merge" && draftedIds.has(ev.castaway_id)) {
      ids.add(ev.castaway_id);
    }
  }
  return ids;
}

/** Return all IDs tied for the top value (max or min). */
function topN(
  items: [string, number][],
  direction: "max" | "min",
): { id: string; value: number }[] {
  if (items.length === 0) return [];
  const sorted = [...items].sort((a, b) =>
    direction === "max" ? b[1] - a[1] : a[1] - b[1],
  );
  const topVal = sorted[0][1];
  return sorted
    .filter(([, v]) => v === topVal)
    .map(([id, value]) => ({ id, value }));
}

// ---------------------------------------------------------------------------
// Card computations
// ---------------------------------------------------------------------------

function highestScoringCastaway(
  input: SeasonStatsInput,
  draftedIds: Set<CastawayId>,
): StatCard | null {
  const entries: [string, number][] = [];
  for (const id of draftedIds) {
    const episodes = input.survivorPointsByEpisode[id];
    if (!episodes) continue;
    const total = episodes.reduce((s, e) => s + e.total, 0);
    entries.push([id, total]);
  }
  const winners = topN(entries, "max");
  if (winners.length === 0 || winners[0].value === 0) return null;
  return {
    key: "highest_scoring",
    group: "castaway",
    tone: "positive",
    title: "Highest Scoring Survivor",
    subtitle: "Outwit, outplay, outscore",
    winners: winners.map((w) => ({
      id: w.id,
      label: input.resolveName(w.id as CastawayId),
      value: w.value,
    })),
    unit: "pts",
  };
}

function lowestScoringCastaway(
  input: SeasonStatsInput,
  draftedIds: Set<CastawayId>,
): StatCard | null {
  const postMergeIds = getPostMergeIds(input.filteredEvents, draftedIds);
  const pool = postMergeIds.size >= 3 ? postMergeIds : draftedIds;
  const entries: [string, number][] = [];
  for (const id of pool) {
    const episodes = input.survivorPointsByEpisode[id];
    if (!episodes) continue;
    const total = episodes.reduce((s, e) => s + e.total, 0);
    entries.push([id, total]);
  }
  const winners = topN(entries, "min");
  if (winners.length === 0) return null;
  return {
    key: "lowest_scoring",
    group: "castaway",
    tone: "negative",
    title: "Lowest Scoring Survivor",
    subtitle:
      postMergeIds.size >= 3
        ? "The tribe has spoken (post-merge players)"
        : "The tribe has spoken",
    winners: winners.map((w) => ({
      id: w.id,
      label: input.resolveName(w.id as CastawayId),
      value: w.value,
    })),
    unit: "pts",
  };
}

function bestSingleEpisodeCastaway(
  input: SeasonStatsInput,
  draftedIds: Set<CastawayId>,
): StatCard | null {
  let best: { id: string; value: number; ep: number }[] = [];
  let bestVal = -Infinity;
  for (const id of draftedIds) {
    const episodes = input.survivorPointsByEpisode[id];
    if (!episodes) continue;
    for (let i = 0; i < episodes.length; i++) {
      const val = episodes[i].total;
      if (val > bestVal) {
        bestVal = val;
        best = [{ id, value: val, ep: i + 1 }];
      } else if (val === bestVal) {
        best.push({ id, value: val, ep: i + 1 });
      }
    }
  }
  if (best.length === 0 || bestVal <= 0) return null;
  return {
    key: "best_single_episode",
    group: "castaway",
    tone: "positive",
    title: "Best Single Episode",
    subtitle: "One hell of a night",
    winners: best.map((w) => ({
      id: w.id,
      label: input.resolveName(w.id as CastawayId),
      value: w.value,
      detail: `Episode ${w.ep}`,
    })),
    unit: "pts",
  };
}

function mostConsistentCastaway(
  input: SeasonStatsInput,
  draftedIds: Set<CastawayId>,
): StatCard | null {
  const postMergeIds = getPostMergeIds(input.filteredEvents, draftedIds);
  const pool = postMergeIds.size >= 3 ? postMergeIds : draftedIds;
  // Require at least 3 episodes for consistency to be meaningful
  const candidates: { id: string; stddev: number; avg: number }[] = [];
  for (const id of pool) {
    const episodes = input.survivorPointsByEpisode[id];
    if (!episodes || episodes.length < 3) continue;
    const totals = episodes.map((e) => e.total);
    const avg = totals.reduce((s, v) => s + v, 0) / totals.length;
    const variance =
      totals.reduce((s, v) => s + (v - avg) ** 2, 0) / totals.length;
    candidates.push({
      id,
      stddev: Math.round(Math.sqrt(variance) * 10) / 10,
      avg: Math.round(avg * 10) / 10,
    });
  }
  if (candidates.length === 0) return null;

  // Lowest stddev wins; tiebreak by highest average
  candidates.sort((a, b) => a.stddev - b.stddev || b.avg - a.avg);
  const bestStddev = candidates[0].stddev;
  const tied = candidates.filter((c) => c.stddev === bestStddev);

  return {
    key: "most_consistent",
    group: "castaway",
    tone: "positive",
    title: "Most Consistent",
    subtitle:
      postMergeIds.size >= 3
        ? "Lowest variance (post-merge players)"
        : "Lowest variance across episodes",
    winners: tied.map((w) => ({
      id: w.id,
      label: input.resolveName(w.id as CastawayId),
      value: w.avg,
    })),
    unit: "avg pts/ep",
  };
}

function challengeBeast(
  input: SeasonStatsInput,
  draftedIds: Set<CastawayId>,
  variant: "immunity" | "reward",
): StatCard | null {
  const challengeList = Object.values(input.filteredChallenges);
  const counts = new Map<string, number>();
  for (const ch of challengeList) {
    if (ch.variant !== variant) continue;
    for (const id of ch.winning_castaways) {
      if (!draftedIds.has(id)) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  const entries: [string, number][] = [...counts.entries()];
  const winners = topN(entries, "max");
  if (winners.length === 0 || winners[0].value === 0) return null;
  if (winners.length >= 3) return null; // Suppress noisy 3+ way ties

  const isImmunity = variant === "immunity";
  return {
    key: isImmunity ? "immunity_beast" : "reward_king",
    group: "castaway",
    tone: "positive",
    title: isImmunity ? "Challenge Beast" : "Reward King",
    subtitle: isImmunity
      ? "Individual immunity wins"
      : "Individual reward wins",
    winners: winners.map((w) => ({
      id: w.id,
      label: input.resolveName(w.id as CastawayId),
      value: w.value,
    })),
    unit: "wins",
  };
}

function advantagesFound(
  input: SeasonStatsInput,
  draftedIds: Set<CastawayId>,
): StatCard | null {
  const findActions = new Set([
    "find_idol",
    "find_extra_vote",
    "find_steal_a_vote",
    "find_block_a_vote",
    "find_bank_your_vote",
    "find_idol_nullifier",
    "find_knowledge_is_power",
    "find_safety_without_power",
    "find_control_the_vote",
    "find_amulet",
    "find_challenge_advantage",
    "find_other_advantage",
  ]);
  const counts = new Map<string, number>();
  for (const ev of Object.values(input.filteredEvents)) {
    if (!findActions.has(ev.action)) continue;
    if (!draftedIds.has(ev.castaway_id)) continue;
    counts.set(ev.castaway_id, (counts.get(ev.castaway_id) ?? 0) + 1);
  }
  const entries: [string, number][] = [...counts.entries()];
  const winners = topN(entries, "max");
  if (winners.length === 0 || winners[0].value === 0) return null;
  if (winners.length >= 3) return null; // Suppress noisy 3+ way ties
  return {
    key: "advantages_found",
    group: "castaway",
    tone: "positive",
    title: "Advantage Collector",
    subtitle: "Idols and advantages found",
    winners: winners.map((w) => ({
      id: w.id,
      label: input.resolveName(w.id as CastawayId),
      value: w.value,
    })),
    unit: "found",
  };
}

function advantagesPlayed(
  input: SeasonStatsInput,
  draftedIds: Set<CastawayId>,
): StatCard | null {
  const useActions = new Set([
    "use_idol",
    "use_extra_vote",
    "use_steal_a_vote",
    "use_block_a_vote",
    "use_bank_your_vote",
    "use_idol_nullifier",
    "use_knowledge_is_power",
    "use_safety_without_power",
    "use_control_the_vote",
    "use_amulet",
    "use_challenge_advantage",
    "use_other_advantage",
  ]);
  const counts = new Map<string, number>();
  for (const ev of Object.values(input.filteredEvents)) {
    if (!useActions.has(ev.action)) continue;
    if (!draftedIds.has(ev.castaway_id)) continue;
    counts.set(ev.castaway_id, (counts.get(ev.castaway_id) ?? 0) + 1);
  }
  const entries: [string, number][] = [...counts.entries()];
  const winners = topN(entries, "max");
  if (winners.length === 0 || winners[0].value === 0) return null;
  if (winners.length >= 3) return null; // Suppress noisy 3+ way ties
  return {
    key: "advantages_played",
    group: "castaway",
    tone: "positive",
    title: "Power Player",
    subtitle: "Idols and advantages played",
    winners: winners.map((w) => ({
      id: w.id,
      label: input.resolveName(w.id as CastawayId),
      value: w.value,
    })),
    unit: "played",
  };
}

function mostIdolsFound(
  input: SeasonStatsInput,
  draftedIds: Set<CastawayId>,
): StatCard | null {
  const counts = new Map<string, number>();
  for (const ev of Object.values(input.filteredEvents)) {
    if (ev.action !== "find_idol") continue;
    if (!draftedIds.has(ev.castaway_id)) continue;
    counts.set(ev.castaway_id, (counts.get(ev.castaway_id) ?? 0) + 1);
  }
  const entries: [string, number][] = [...counts.entries()];
  const winners = topN(entries, "max");
  if (winners.length === 0 || winners[0].value === 0) return null;
  if (winners.length >= 3) return null;
  return {
    key: "most_idols_found",
    group: "castaway",
    tone: "positive",
    title: "Idol Finder",
    subtitle: "Hidden immunity idols found",
    winners: winners.map((w) => ({
      id: w.id,
      label: input.resolveName(w.id as CastawayId),
      value: w.value,
    })),
    unit: "idols",
  };
}

// ---------------------------------------------------------------------------
// Vote-history cards
// ---------------------------------------------------------------------------

/**
 * Count total votes received per drafted castaway from filtered vote rows.
 * Returns { total, nullified } per castaway.
 */
function countVotesReceived(
  votes: VoteHistory[],
  draftedIds: Set<CastawayId>,
): Map<CastawayId, { total: number; nullified: number }> {
  const counts = new Map<CastawayId, { total: number; nullified: number }>();
  for (const v of votes) {
    if (!draftedIds.has(v.target_castaway_id)) continue;
    const existing = counts.get(v.target_castaway_id) ?? {
      total: 0,
      nullified: 0,
    };
    existing.total++;
    if (v.nullified) existing.nullified++;
    counts.set(v.target_castaway_id, existing);
  }
  return counts;
}

/**
 * Build set of castaways with Tribal attendance from vote rows.
 * A castaway qualifies if they appear as voter or target in at least one vote.
 */
function getTribalAttendees(
  votes: VoteHistory[],
  draftedIds: Set<CastawayId>,
): Set<CastawayId> {
  const attendees = new Set<CastawayId>();
  for (const v of votes) {
    if (draftedIds.has(v.voter_castaway_id)) attendees.add(v.voter_castaway_id);
    if (draftedIds.has(v.target_castaway_id))
      attendees.add(v.target_castaway_id);
  }
  return attendees;
}

function mostVotesReceived(
  input: SeasonStatsInput,
  draftedIds: Set<CastawayId>,
): StatCard | null {
  const votes = Object.values(input.filteredVoteHistory);
  if (votes.length === 0) return null;

  const counts = countVotesReceived(votes, draftedIds);
  const entries: [string, number][] = [...counts.entries()].map(([id, c]) => [
    id,
    c.total,
  ]);
  const winners = topN(entries, "max");
  if (winners.length === 0 || winners[0].value === 0) return null;

  return {
    key: "most_votes_received",
    group: "castaway",
    tone: "negative",
    title: "Biggest Target",
    subtitle: "Most votes received at tribal",
    winners: winners.map((w) => {
      const detail = counts.get(w.id as CastawayId);
      const nullNote =
        detail && detail.nullified > 0
          ? `(${detail.nullified} nullified by idol)`
          : undefined;
      return {
        id: w.id,
        label: input.resolveName(w.id as CastawayId),
        value: w.value,
        detail: nullNote,
      };
    }),
    unit: "votes",
  };
}

function leastVotesReceived(
  input: SeasonStatsInput,
  draftedIds: Set<CastawayId>,
): StatCard | null {
  const votes = Object.values(input.filteredVoteHistory);
  if (votes.length === 0) return null;

  // Only qualify post-merge castaways
  const postMergeIds = getPostMergeIds(input.filteredEvents, draftedIds);
  if (postMergeIds.size < 3) return null; // Suppress pre-merge or too few

  // Further restrict to post-merge castaways with Tribal attendance
  const attendees = getTribalAttendees(votes, postMergeIds);
  if (attendees.size < 3) return null;

  const counts = countVotesReceived(votes, postMergeIds);

  // Include qualified attendees with 0 votes
  const entries: [string, number][] = [...attendees].map((id) => [
    id,
    counts.get(id)?.total ?? 0,
  ]);
  const winners = topN(entries, "min");
  if (winners.length === 0) return null;

  return {
    key: "least_votes_received",
    group: "castaway",
    tone: "positive",
    title: "Under the Radar",
    subtitle: "Fewest votes received (post-merge players)",
    winners: winners.map((w) => ({
      id: w.id,
      label: input.resolveName(w.id as CastawayId),
      value: w.value,
    })),
    unit: "votes",
  };
}

// ---------------------------------------------------------------------------
// Roster stats (table format — all participants ranked)
// ---------------------------------------------------------------------------

export interface RosterStatRow {
  uid: string;
  label: string;
  value: number;
  detail?: string;
}

export interface RosterStat {
  key: string;
  title: string;
  unit: string;
  rows: RosterStatRow[];
}

const CHALLENGE_POINTS: Record<string, number> = {
  duel: 2,
  reward: 2,
  team_reward: 1,
  immunity: 3,
  team_immunity: 2,
};

function computeRosterStats(
  input: SeasonStatsInput,
  draftedIds: Set<CastawayId>,
): RosterStat[] {
  const ownership = getDraftOwnership(input.competition.draft_picks);
  const uids = input.competition.participant_uids;
  const getName = (uid: string) => getParticipantName(input.competition, uid);
  const stats: RosterStat[] = [];

  // Challenge points
  const challengePts = new Map<string, number>();
  for (const uid of uids) challengePts.set(uid, 0);
  for (const ch of Object.values(input.filteredChallenges)) {
    const pts = CHALLENGE_POINTS[ch.variant] ?? 0;
    for (const id of ch.winning_castaways) {
      if (!draftedIds.has(id)) continue;
      const owner = ownership.get(id);
      if (owner)
        challengePts.set(owner.uid, (challengePts.get(owner.uid) ?? 0) + pts);
    }
  }
  stats.push({
    key: "challenge_pts",
    title: "Challenge Points",
    unit: "pts",
    rows: [...challengePts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([uid, v]) => ({ uid, label: getName(uid), value: v })),
  });

  // Best single team episode
  if (input.pointsByUserPerEpisode) {
    const bestEp = new Map<string, { value: number; ep: number }>();
    for (const uid of uids) bestEp.set(uid, { value: 0, ep: 0 });
    for (const [uid, episodes] of Object.entries(
      input.pointsByUserPerEpisode,
    )) {
      for (let i = 0; i < episodes.length; i++) {
        const cur = bestEp.get(uid);
        if (!cur || episodes[i] > cur.value) {
          bestEp.set(uid, { value: episodes[i], ep: i + 1 });
        }
      }
    }
    stats.push({
      key: "best_night",
      title: "Best Team Night",
      unit: "pts",
      rows: [...bestEp.entries()]
        .sort((a, b) => b[1].value - a[1].value)
        .map(([uid, d]) => ({
          uid,
          label: getName(uid),
          value: d.value,
          detail: d.value > 0 ? `Ep ${d.ep}` : undefined,
        })),
    });
  }

  // Best draft pick (highest-scoring single castaway per roster)
  const bestPick = new Map<string, { value: number; castaway: string }>();
  for (const uid of uids) bestPick.set(uid, { value: 0, castaway: "" });
  for (const id of draftedIds) {
    const episodes = input.survivorPointsByEpisode[id];
    if (!episodes) continue;
    const total = episodes.reduce((s, e) => s + e.total, 0);
    const owner = ownership.get(id);
    if (!owner) continue;
    const cur = bestPick.get(owner.uid);
    if (!cur || total > cur.value) {
      bestPick.set(owner.uid, {
        value: total,
        castaway: input.resolveName(id),
      });
    }
  }
  stats.push({
    key: "best_pick",
    title: "Best Draft Pick",
    unit: "pts",
    rows: [...bestPick.entries()]
      .sort((a, b) => b[1].value - a[1].value)
      .map(([uid, d]) => ({
        uid,
        label: getName(uid),
        value: d.value,
        detail: d.castaway || undefined,
      })),
  });

  // Votes against roster
  const votes = Object.values(input.filteredVoteHistory);
  if (votes.length > 0) {
    const voteCounts = new Map<string, number>();
    for (const uid of uids) voteCounts.set(uid, 0);
    for (const v of votes) {
      if (!draftedIds.has(v.target_castaway_id)) continue;
      const owner = ownership.get(v.target_castaway_id);
      if (owner)
        voteCounts.set(owner.uid, (voteCounts.get(owner.uid) ?? 0) + 1);
    }
    stats.push({
      key: "votes_against",
      title: "Votes Against Roster",
      unit: "votes",
      rows: [...voteCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([uid, v]) => ({ uid, label: getName(uid), value: v })),
    });
  }

  return stats;
}

// ---------------------------------------------------------------------------
// Main aggregator
// ---------------------------------------------------------------------------

export interface SeasonStatsResult {
  castawayCards: StatCard[];
  rosterStats: RosterStat[];
}

export function computeSeasonStats(input: SeasonStatsInput): SeasonStatsResult {
  const draftedIds = getDraftedCastawayIds(input.competition);

  const castawayCards: StatCard[] = [];

  // Castaway score/challenge/advantage cards
  const cardFns: (() => StatCard | null)[] = [
    () => highestScoringCastaway(input, draftedIds),
    () => challengeBeast(input, draftedIds, "immunity"),
    () => challengeBeast(input, draftedIds, "reward"),
    () => advantagesFound(input, draftedIds),
    () => advantagesPlayed(input, draftedIds),
    () => mostIdolsFound(input, draftedIds),
    () => bestSingleEpisodeCastaway(input, draftedIds),
    () => mostConsistentCastaway(input, draftedIds),
    // Vote cards
    () => mostVotesReceived(input, draftedIds),
    () => leastVotesReceived(input, draftedIds),
    // Negative cards
    () => lowestScoringCastaway(input, draftedIds),
  ];

  for (const fn of cardFns) {
    const card = fn();
    if (card) castawayCards.push(card);
  }

  const rosterStats = computeRosterStats(input, draftedIds);

  return { castawayCards, rosterStats };
}
