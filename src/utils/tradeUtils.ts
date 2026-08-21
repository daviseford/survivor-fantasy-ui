import {
  CastawayId,
  Challenge,
  Competition,
  DraftPick,
  Elimination,
  Episode,
  GameEvent,
  Season,
  Trade,
} from "../types";
import { getBroadcastDate, getLatestDataEpisode } from "./episodeAirDate";

/**
 * Trade ownership logic.
 *
 * `Competition.draft_picks` is immutable — trades live in a subcollection and
 * ownership is derived: the drafter owns a castaway from episode 1, and each
 * accepted trade moves ownership starting at its `effective_episode`. Points
 * from episodes before the cutoff stay with the previous owner.
 */

export type OwnershipWindow = {
  uid: string;
  /** First episode (inclusive) this uid owns the castaway. */
  fromEpisode: number;
};

const acceptedTrades = (trades: Trade[]): Trade[] =>
  trades
    .filter((t) => t.status === "accepted" && t.effective_episode !== undefined)
    .sort(
      (a, b) =>
        a.effective_episode! - b.effective_episode! ||
        (a.resolved_at ?? "").localeCompare(b.resolved_at ?? ""),
    );

/**
 * Ownership windows per castaway: an ascending list of segments, each valid
 * from `fromEpisode` until the next segment starts.
 */
export function getOwnershipWindows(
  draftPicks: DraftPick[],
  trades: Trade[],
): Record<CastawayId, OwnershipWindow[]> {
  const windows: Record<CastawayId, OwnershipWindow[]> = {};

  for (const pick of draftPicks) {
    windows[pick.castaway_id] = [{ uid: pick.user_uid, fromEpisode: 1 }];
  }

  for (const trade of acceptedTrades(trades)) {
    const moves: [CastawayId, string][] = [
      ...trade.offered_castaway_ids.map((id): [CastawayId, string] => [
        id,
        trade.offered_to_uid,
      ]),
      ...trade.requested_castaway_ids.map((id): [CastawayId, string] => [
        id,
        trade.offered_by_uid,
      ]),
    ];

    for (const [castawayId, newOwner] of moves) {
      windows[castawayId]?.push({
        uid: newOwner,
        fromEpisode: trade.effective_episode!,
      });
    }
  }

  return windows;
}

/** Who owned `castawayId` during `episode`, or undefined if never drafted. */
export function getOwnerAtEpisode(
  windows: Record<CastawayId, OwnershipWindow[]>,
  castawayId: CastawayId,
  episode: number,
): string | undefined {
  const segments = windows[castawayId];
  if (!segments) return undefined;

  let owner: string | undefined;
  for (const segment of segments) {
    if (segment.fromEpisode <= episode) owner = segment.uid;
    else break;
  }
  return owner;
}

/** Current owner of every drafted castaway (after all accepted trades). */
export function getCurrentOwners(
  draftPicks: DraftPick[],
  trades: Trade[],
): Record<CastawayId, string> {
  const windows = getOwnershipWindows(draftPicks, trades);
  return Object.fromEntries(
    Object.entries(windows).map(([id, segments]) => [
      id,
      segments[segments.length - 1].uid,
    ]),
  ) as Record<CastawayId, string>;
}

/** Castaways owned by `uid` during `episode` — what scoring sums over. */
export function getOwnedCastawaysAtEpisode(
  draftPicks: DraftPick[],
  trades: Trade[],
  uid: string,
  episode: number,
): CastawayId[] {
  const windows = getOwnershipWindows(draftPicks, trades);
  return (Object.keys(windows) as CastawayId[]).filter(
    (id) => getOwnerAtEpisode(windows, id, episode) === uid,
  );
}

/**
 * Trades are allowed up to the day an episode airs. Returns the episode
 * airing today (the lock), or null when trading is open. Seasons without
 * air dates never lock.
 *
 * "Today" is the broadcast day, not the viewer's local day: `air_date` comes
 * from survivoR in broadcast terms, so comparing it against a local date would
 * open and close the lock at different instants for participants in different
 * timezones — in the same league, trading against each other.
 */
export function getTradeLockEpisode(
  season: Season,
  today: Date = new Date(),
): Episode | null {
  const todayISO = getBroadcastDate(today);
  return (
    [...(season.episodes ?? [])]
      .sort((a, b) => a.order - b.order)
      .find((ep) => ep.air_date === todayISO) ?? null
  );
}

/**
 * First episode whose points go to the new owner.
 *
 * A trade takes effect for the next episode the competition has not seen yet,
 * so points already on the board stay with the previous owner:
 *
 * - Watch-along (`current_episode` is a number, and 0 on a brand-new
 *   competition): the next episode to be revealed. Trade before revealing
 *   anything and the cutoff is episode 1; trade while sitting on episode 4 and
 *   the cutoff is episode 5.
 * - Live (`current_episode` is null): nothing is revealed on a schedule, so the
 *   same idea against the only clock available -- the first episode that has no
 *   scoring data yet.
 */
export function getEffectiveEpisode(input: {
  competition: Competition;
  challenges: Record<string, Challenge>;
  eliminations: Record<string, Elimination>;
  events: Record<string, GameEvent>;
}): number {
  return (
    (input.competition.current_episode ??
      getLatestDataEpisode(
        input.challenges,
        input.eliminations,
        input.events,
      )) + 1
  );
}

export type TradeValidationInput = {
  competition: Competition;
  season: Season;
  /** All trades in the competition (any status). */
  existingTrades: Trade[];
  /** Castaway IDs eliminated within the competition's visible episodes. */
  eliminatedCastawayIds: CastawayId[];
  offeredByUid: string;
  offeredToUid: string;
  offeredCastawayIds: CastawayId[];
  requestedCastawayIds: CastawayId[];
  today?: Date;
};

export type TradeValidation =
  | { valid: true }
  | { valid: false; reason: string };

/** Client-side validation shared by the proposal form and acceptance. */
export function validateTrade(input: TradeValidationInput): TradeValidation {
  const {
    competition,
    season,
    existingTrades,
    eliminatedCastawayIds,
    offeredByUid,
    offeredToUid,
    offeredCastawayIds,
    requestedCastawayIds,
    today,
  } = input;

  if (competition.finished) {
    return { valid: false, reason: "This competition has finished." };
  }

  const lockEpisode = getTradeLockEpisode(season, today);
  if (lockEpisode) {
    return {
      valid: false,
      reason: `Trades are locked — Episode ${lockEpisode.order} airs today.`,
    };
  }

  const participantUids = competition.participant_uids;
  if (
    !participantUids.includes(offeredByUid) ||
    !participantUids.includes(offeredToUid)
  ) {
    return { valid: false, reason: "Both users must be participants." };
  }

  if (offeredByUid === offeredToUid) {
    return { valid: false, reason: "You cannot trade with yourself." };
  }

  if (offeredCastawayIds.length === 0 || requestedCastawayIds.length === 0) {
    return {
      valid: false,
      reason: "Each side must include at least one player.",
    };
  }

  const allIds = [...offeredCastawayIds, ...requestedCastawayIds];
  if (new Set(allIds).size !== allIds.length) {
    return { valid: false, reason: "A player cannot appear on both sides." };
  }

  const owners = getCurrentOwners(competition.draft_picks, existingTrades);
  for (const id of offeredCastawayIds) {
    if (owners[id] !== offeredByUid) {
      return { valid: false, reason: "You no longer own an offered player." };
    }
  }
  for (const id of requestedCastawayIds) {
    if (owners[id] !== offeredToUid) {
      return {
        valid: false,
        reason: "Your trade partner no longer owns a requested player.",
      };
    }
  }

  const eliminated = new Set(eliminatedCastawayIds);
  if (allIds.some((id) => eliminated.has(id))) {
    return {
      valid: false,
      reason: "Eliminated players cannot be traded.",
    };
  }

  const pendingIds = new Set(
    existingTrades
      .filter((t) => t.status === "pending")
      .flatMap((t) => [...t.offered_castaway_ids, ...t.requested_castaway_ids]),
  );
  if (allIds.some((id) => pendingIds.has(id))) {
    return {
      valid: false,
      reason: "A player in this trade is part of another pending trade.",
    };
  }

  return { valid: true };
}
