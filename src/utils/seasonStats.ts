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
  const entries: [string, number][] = [];
  for (const id of draftedIds) {
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
    subtitle: "The tribe has spoken",
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

function worstSingleEpisodeCastaway(
  input: SeasonStatsInput,
  draftedIds: Set<CastawayId>,
): StatCard | null {
  let worst: { id: string; value: number; ep: number }[] = [];
  let worstVal = Infinity;
  for (const id of draftedIds) {
    const episodes = input.survivorPointsByEpisode[id];
    if (!episodes) continue;
    for (let i = 0; i < episodes.length; i++) {
      const val = episodes[i].total;
      if (val < worstVal) {
        worstVal = val;
        worst = [{ id, value: val, ep: i + 1 }];
      } else if (val === worstVal) {
        worst.push({ id, value: val, ep: i + 1 });
      }
    }
  }
  if (worst.length === 0) return null;
  return {
    key: "worst_single_episode",
    group: "castaway",
    tone: "negative",
    title: "Worst Single Episode",
    subtitle: "Rough night at tribal",
    winners: worst.map((w) => ({
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
  // Require at least 3 episodes for average to be meaningful
  const entries: [string, number][] = [];
  for (const id of draftedIds) {
    const episodes = input.survivorPointsByEpisode[id];
    if (!episodes || episodes.length < 3) continue;
    const avg = episodes.reduce((s, e) => s + e.total, 0) / episodes.length;
    entries.push([id, Math.round(avg * 10) / 10]);
  }
  const winners = topN(entries, "max");
  if (winners.length === 0 || winners[0].value === 0) return null;
  return {
    key: "most_consistent",
    group: "castaway",
    tone: "positive",
    title: "Most Consistent",
    subtitle: "Steady as she goes",
    winners: winners.map((w) => ({
      id: w.id,
      label: input.resolveName(w.id as CastawayId),
      value: w.value,
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

  // Only qualify castaways with Tribal attendance
  const attendees = getTribalAttendees(votes, draftedIds);
  if (attendees.size < 3) return null; // Suppress if too few qualified

  const counts = countVotesReceived(votes, draftedIds);

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
    subtitle: "Fewest votes received at tribal",
    winners: winners.map((w) => ({
      id: w.id,
      label: input.resolveName(w.id as CastawayId),
      value: w.value,
    })),
    unit: "votes",
  };
}

// ---------------------------------------------------------------------------
// Roster cards
// ---------------------------------------------------------------------------

function bestSingleTeamEpisode(input: SeasonStatsInput): StatCard | null {
  if (!input.pointsByUserPerEpisode) return null;
  let best: { uid: string; value: number; ep: number }[] = [];
  let bestVal = -Infinity;

  for (const [uid, episodes] of Object.entries(input.pointsByUserPerEpisode)) {
    for (let i = 0; i < episodes.length; i++) {
      const val = episodes[i];
      if (val > bestVal) {
        bestVal = val;
        best = [{ uid, value: val, ep: i + 1 }];
      } else if (val === bestVal) {
        best.push({ uid, value: val, ep: i + 1 });
      }
    }
  }
  if (best.length === 0 || bestVal <= 0) return null;
  return {
    key: "best_team_episode",
    group: "roster",
    tone: "positive",
    title: "Best Team Night",
    subtitle: "Highest single-episode roster score",
    winners: best.map((w) => ({
      id: w.uid,
      label: getParticipantName(input.competition, w.uid),
      value: w.value,
      detail: `Episode ${w.ep}`,
    })),
    unit: "pts",
  };
}

function heroCard(
  input: SeasonStatsInput,
  draftedIds: Set<CastawayId>,
): StatCard | null {
  // Find the highest-scoring castaway and attribute to their drafter
  const ownership = getDraftOwnership(input.competition.draft_picks);
  let best: {
    castawayId: CastawayId;
    uid: string;
    name: string;
    value: number;
  }[] = [];
  let bestVal = -Infinity;

  for (const id of draftedIds) {
    const episodes = input.survivorPointsByEpisode[id];
    if (!episodes) continue;
    const total = episodes.reduce((s, e) => s + e.total, 0);
    const owner = ownership.get(id);
    if (!owner) continue;
    if (total > bestVal) {
      bestVal = total;
      best = [
        { castawayId: id, uid: owner.uid, name: owner.name, value: total },
      ];
    } else if (total === bestVal) {
      best.push({
        castawayId: id,
        uid: owner.uid,
        name: owner.name,
        value: total,
      });
    }
  }
  if (best.length === 0 || bestVal <= 0) return null;

  return {
    key: "hero_drafter",
    group: "roster",
    tone: "positive",
    title: "Best Draft Pick",
    subtitle: "Rostered the highest-scoring castaway",
    winners: best.map((w) => ({
      id: w.uid,
      label: getParticipantName(input.competition, w.uid),
      value: w.value,
      detail: input.resolveName(w.castawayId),
    })),
    unit: "pts",
  };
}

function rosterVotePressure(
  input: SeasonStatsInput,
  draftedIds: Set<CastawayId>,
  direction: "most" | "least",
): StatCard | null {
  const votes = Object.values(input.filteredVoteHistory);
  if (votes.length === 0) return null;

  const ownership = getDraftOwnership(input.competition.draft_picks);
  const rosterVotes = new Map<string, number>();

  for (const v of votes) {
    if (!draftedIds.has(v.target_castaway_id)) continue;
    const owner = ownership.get(v.target_castaway_id);
    if (!owner) continue;
    rosterVotes.set(owner.uid, (rosterVotes.get(owner.uid) ?? 0) + 1);
  }

  // For "least", only include rosters with at least one castaway who attended tribal
  if (direction === "least") {
    const attendees = getTribalAttendees(votes, draftedIds);
    const qualifiedUids = new Set<string>();
    for (const id of attendees) {
      const owner = ownership.get(id);
      if (owner) qualifiedUids.add(owner.uid);
    }
    // Include qualified uids with 0 votes
    for (const uid of qualifiedUids) {
      if (!rosterVotes.has(uid)) rosterVotes.set(uid, 0);
    }
    // Remove non-qualified
    for (const uid of rosterVotes.keys()) {
      if (!qualifiedUids.has(uid)) rosterVotes.delete(uid);
    }
    if (rosterVotes.size < 2) return null;
  }

  const entries: [string, number][] = [...rosterVotes.entries()];
  const winners = topN(entries, direction === "most" ? "max" : "min");
  if (winners.length === 0) return null;

  const isMost = direction === "most";
  return {
    key: isMost ? "roster_most_heat" : "roster_safest",
    group: "roster",
    tone: isMost ? "negative" : "positive",
    title: isMost ? "Most Heat on a Team" : "Safest Roster",
    subtitle: isMost
      ? "Most tribal votes across roster"
      : "Fewest tribal votes across roster",
    winners: winners.map((w) => ({
      id: w.id,
      label: getParticipantName(input.competition, w.id),
      value: w.value,
    })),
    unit: "votes",
  };
}

// ---------------------------------------------------------------------------
// Main aggregator
// ---------------------------------------------------------------------------

export interface SeasonStatsResult {
  castawayCards: StatCard[];
  rosterCards: StatCard[];
}

export function computeSeasonStats(input: SeasonStatsInput): SeasonStatsResult {
  const draftedIds = getDraftedCastawayIds(input.competition);

  const castawayCards: StatCard[] = [];
  const rosterCards: StatCard[] = [];

  // Castaway score/challenge/advantage cards
  const cardFns: (() => StatCard | null)[] = [
    () => highestScoringCastaway(input, draftedIds),
    () => challengeBeast(input, draftedIds, "immunity"),
    () => challengeBeast(input, draftedIds, "reward"),
    () => advantagesFound(input, draftedIds),
    () => advantagesPlayed(input, draftedIds),
    () => bestSingleEpisodeCastaway(input, draftedIds),
    () => mostConsistentCastaway(input, draftedIds),
    // Vote cards
    () => mostVotesReceived(input, draftedIds),
    () => leastVotesReceived(input, draftedIds),
    // Negative cards
    () => lowestScoringCastaway(input, draftedIds),
    () => worstSingleEpisodeCastaway(input, draftedIds),
  ];

  for (const fn of cardFns) {
    const card = fn();
    if (card) castawayCards.push(card);
  }

  // Roster cards
  const rosterFns: (() => StatCard | null)[] = [
    () => bestSingleTeamEpisode(input),
    () => heroCard(input, draftedIds),
    () => rosterVotePressure(input, draftedIds, "most"),
    () => rosterVotePressure(input, draftedIds, "least"),
  ];

  for (const fn of rosterFns) {
    const card = fn();
    if (card) rosterCards.push(card);
  }

  return { castawayCards, rosterCards };
}
