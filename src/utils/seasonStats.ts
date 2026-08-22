/**
 * Season stats aggregation engine.
 *
 * Computes card-ready stat models from competition-scoped, spoiler-filtered data.
 * Returns grouped card descriptors for the SeasonStatsSection UI.
 */

import { BASE_PLAYER_SCORING } from "../data/scoring";
import {
  CastawayId,
  Challenge,
  Competition,
  Elimination,
  GameEvent,
  PlayerAction,
  Trade,
  VoteHistory,
} from "../types";
import { EnhancedScores } from "./scoringUtils";
import { getOwnerAtEpisode, getOwnershipWindows } from "./tradeUtils";

const IDOL_ADVANTAGE_ACTIONS = new Set<PlayerAction>(
  BASE_PLAYER_SCORING.filter(
    (s) => s.category === "Idols" || s.category === "Advantages",
  ).map((s) => s.action as PlayerAction),
);

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
  /** Accepted trades move roster ownership from their effective_episode on. */
  trades: Trade[];
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

/**
 * Every castaway in the competition, whoever owns them now.
 *
 * Drawn from draft_picks because that is the immutable record of which
 * castaways are in play -- a trade moves a castaway between rosters but never
 * adds or removes one from this set. Anything asking "whose roster is this on"
 * wants getOwnerResolver instead.
 */
function getCompetitionCastawayIds(competition: Competition): Set<CastawayId> {
  return new Set(competition.draft_picks.map((p) => p.castaway_id));
}

/**
 * Resolve who owned a castaway during a given episode.
 *
 * Roster stats must match the Standings table, which credits an episode's
 * points to whoever held the castaway *that* episode (see
 * useScoringCalculations). Attributing everything to the original drafter
 * would make the two halves of the competition page disagree after a trade.
 */
function getOwnerResolver(
  input: SeasonStatsInput,
): (id: CastawayId, episode: number) => string | undefined {
  const windows = getOwnershipWindows(
    input.competition.draft_picks,
    input.trades,
  );
  return (id, episode) => getOwnerAtEpisode(windows, id, episode);
}

function getParticipantName(competition: Competition, uid: string): string {
  return (
    competition.team_names?.[uid] ??
    competition.participants.find((p) => p.uid === uid)?.displayName ??
    uid
  );
}

/** Castaways in the competition who made the merge. */
function getPostMergeIds(
  events: Record<string, GameEvent>,
  castawayIds: Set<CastawayId>,
): Set<CastawayId> {
  const ids = new Set<CastawayId>();
  for (const ev of Object.values(events)) {
    if (ev.action === "make_merge" && castawayIds.has(ev.castaway_id)) {
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
  castawayIds: Set<CastawayId>,
): StatCard | null {
  const entries: [string, number][] = [];
  for (const id of castawayIds) {
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
  castawayIds: Set<CastawayId>,
): StatCard | null {
  const postMergeIds = getPostMergeIds(input.filteredEvents, castawayIds);
  const pool = postMergeIds.size >= 3 ? postMergeIds : castawayIds;
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
  castawayIds: Set<CastawayId>,
): StatCard | null {
  let best: { id: string; value: number; ep: number }[] = [];
  let bestVal = -Infinity;
  for (const id of castawayIds) {
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
  castawayIds: Set<CastawayId>,
): StatCard | null {
  const postMergeIds = getPostMergeIds(input.filteredEvents, castawayIds);
  const pool = postMergeIds.size >= 3 ? postMergeIds : castawayIds;
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
  castawayIds: Set<CastawayId>,
  variant: "immunity" | "reward",
): StatCard | null {
  const challengeList = Object.values(input.filteredChallenges);
  const counts = new Map<string, number>();
  for (const ch of challengeList) {
    if (ch.variant !== variant) continue;
    for (const id of ch.winning_castaways) {
      if (!castawayIds.has(id)) continue;
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
  castawayIds: Set<CastawayId>,
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
    if (!castawayIds.has(ev.castaway_id)) continue;
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
  castawayIds: Set<CastawayId>,
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
    if (!castawayIds.has(ev.castaway_id)) continue;
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
  castawayIds: Set<CastawayId>,
): StatCard | null {
  const counts = new Map<string, number>();
  for (const ev of Object.values(input.filteredEvents)) {
    if (ev.action !== "find_idol") continue;
    if (!castawayIds.has(ev.castaway_id)) continue;
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
 * Count total votes received per competition castaway from filtered vote rows.
 * Returns { total, nullified } per castaway.
 */
function countVotesReceived(
  votes: VoteHistory[],
  castawayIds: Set<CastawayId>,
): Map<CastawayId, { total: number; nullified: number }> {
  const counts = new Map<CastawayId, { total: number; nullified: number }>();
  for (const v of votes) {
    if (!castawayIds.has(v.target_castaway_id)) continue;
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
  castawayIds: Set<CastawayId>,
): Set<CastawayId> {
  const attendees = new Set<CastawayId>();
  for (const v of votes) {
    if (castawayIds.has(v.voter_castaway_id))
      attendees.add(v.voter_castaway_id);
    if (castawayIds.has(v.target_castaway_id))
      attendees.add(v.target_castaway_id);
  }
  return attendees;
}

function mostVotesReceived(
  input: SeasonStatsInput,
  castawayIds: Set<CastawayId>,
): StatCard | null {
  const votes = Object.values(input.filteredVoteHistory);
  if (votes.length === 0) return null;

  const counts = countVotesReceived(votes, castawayIds);
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
  castawayIds: Set<CastawayId>,
): StatCard | null {
  const votes = Object.values(input.filteredVoteHistory);
  if (votes.length === 0) return null;

  // Only qualify post-merge castaways
  const postMergeIds = getPostMergeIds(input.filteredEvents, castawayIds);
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
  description: string;
  unit: string;
  /** "high" = higher value is better (green), "low" = lower is better */
  direction: "high" | "low";
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
  castawayIds: Set<CastawayId>,
): RosterStat[] {
  const ownerAt = getOwnerResolver(input);
  const uids = input.competition.participant_uids;
  const getName = (uid: string) => getParticipantName(input.competition, uid);
  const stats: RosterStat[] = [];

  // Challenge points
  const challengePts = new Map<string, number>();
  for (const uid of uids) challengePts.set(uid, 0);
  for (const ch of Object.values(input.filteredChallenges)) {
    const pts = CHALLENGE_POINTS[ch.variant] ?? 0;
    for (const id of ch.winning_castaways) {
      if (!castawayIds.has(id)) continue;
      const owner = ownerAt(id, ch.episode_num);
      if (owner) challengePts.set(owner, (challengePts.get(owner) ?? 0) + pts);
    }
  }
  stats.push({
    key: "challenge_pts",
    title: "Challenge Points",
    description: "Total points earned from challenge wins across roster",
    unit: "pts",
    direction: "high",
    rows: uids.map((uid) => ({
      uid,
      label: getName(uid),
      value: challengePts.get(uid) ?? 0,
    })),
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
      description: "Highest single-episode score across all roster players",
      unit: "pts",
      direction: "high",
      rows: uids.map((uid) => {
        const d = bestEp.get(uid) ?? { value: 0, ep: 0 };
        return {
          uid,
          label: getName(uid),
          value: d.value,
          detail: d.value > 0 ? `Ep ${d.ep}` : undefined,
        };
      }),
    });
  }

  // Best draft pick (highest-scoring single castaway per roster)
  const bestPick = new Map<string, { value: number; castaway: string }>();
  for (const uid of uids) bestPick.set(uid, { value: 0, castaway: "" });
  for (const id of castawayIds) {
    const episodes = input.survivorPointsByEpisode[id];
    if (!episodes) continue;
    // A traded castaway counts toward each owner only for the episodes that
    // owner actually held them.
    const totalByOwner = new Map<string, number>();
    for (const ep of episodes) {
      const owner = ownerAt(id, ep.episode_num);
      if (!owner) continue;
      totalByOwner.set(owner, (totalByOwner.get(owner) ?? 0) + ep.total);
    }
    for (const [owner, total] of totalByOwner) {
      const cur = bestPick.get(owner);
      if (!cur || total > cur.value) {
        bestPick.set(owner, {
          value: total,
          castaway: input.resolveName(id),
        });
      }
    }
  }
  stats.push({
    key: "best_pick",
    title: "Best Draft Pick",
    description: "Highest-scoring individual castaway on each roster",
    unit: "pts",
    direction: "high",
    rows: uids.map((uid) => {
      const d = bestPick.get(uid) ?? { value: 0, castaway: "" };
      return {
        uid,
        label: getName(uid),
        value: d.value,
        detail: d.castaway || undefined,
      };
    }),
  });

  // Idols & Advantages points
  const advPts = new Map<string, number>();
  for (const uid of uids) advPts.set(uid, 0);
  for (const id of castawayIds) {
    const episodes = input.survivorPointsByEpisode[id];
    if (!episodes) continue;
    for (const ep of episodes) {
      const owner = ownerAt(id, ep.episode_num);
      if (!owner) continue;
      const pts = ep.actions
        .filter((a) => IDOL_ADVANTAGE_ACTIONS.has(a.action))
        .reduce((s, a) => s + a.points_awarded, 0);
      if (pts !== 0) advPts.set(owner, (advPts.get(owner) ?? 0) + pts);
    }
  }
  stats.push({
    key: "idol_advantage_pts",
    title: "Idol & Advantage Points",
    description: "Points from finding and playing idols and advantages",
    unit: "pts",
    direction: "high",
    rows: uids.map((uid) => ({
      uid,
      label: getName(uid),
      value: advPts.get(uid) ?? 0,
    })),
  });

  // Votes against roster
  const votes = Object.values(input.filteredVoteHistory);
  if (votes.length > 0) {
    const voteCounts = new Map<string, number>();
    for (const uid of uids) voteCounts.set(uid, 0);
    for (const v of votes) {
      if (!castawayIds.has(v.target_castaway_id)) continue;
      const owner = ownerAt(v.target_castaway_id, v.episode_num);
      if (owner) voteCounts.set(owner, (voteCounts.get(owner) ?? 0) + 1);
    }
    stats.push({
      key: "votes_against",
      title: "Votes Against Roster",
      description: "Total tribal council votes targeting roster players",
      unit: "votes",
      direction: "low",
      rows: uids.map((uid) => ({
        uid,
        label: getName(uid),
        value: voteCounts.get(uid) ?? 0,
      })),
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
  const castawayIds = getCompetitionCastawayIds(input.competition);

  const castawayCards: StatCard[] = [];

  // Castaway score/challenge/advantage cards
  const cardFns: (() => StatCard | null)[] = [
    () => highestScoringCastaway(input, castawayIds),
    () => challengeBeast(input, castawayIds, "immunity"),
    () => challengeBeast(input, castawayIds, "reward"),
    () => advantagesFound(input, castawayIds),
    () => advantagesPlayed(input, castawayIds),
    () => mostIdolsFound(input, castawayIds),
    () => bestSingleEpisodeCastaway(input, castawayIds),
    () => mostConsistentCastaway(input, castawayIds),
    // Vote cards
    () => mostVotesReceived(input, castawayIds),
    () => leastVotesReceived(input, castawayIds),
    // Negative cards
    () => lowestScoringCastaway(input, castawayIds),
  ];

  for (const fn of cardFns) {
    const card = fn();
    if (card) castawayCards.push(card);
  }

  const rosterStats = computeRosterStats(input, castawayIds);

  return { castawayCards, rosterStats };
}
