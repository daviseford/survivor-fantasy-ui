import { notifications } from "@mantine/notifications";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { v4 } from "uuid";
import { db } from "../firebase";
import {
  CastawayId,
  Challenge,
  Competition,
  Elimination,
  GameEvent,
  Season,
  Trade,
} from "../types";
import { trackEvent } from "../utils/analytics";
import { getEffectiveEpisode, validateTrade } from "../utils/tradeUtils";

const tradeRef = (competitionId: Competition["id"], tradeId: Trade["id"]) =>
  doc(db, "competitions", competitionId, "trades", tradeId);

const showError = (reason: string) =>
  notifications.show({ color: "red", title: "Trade failed", message: reason });

export type ProposeTradeInput = {
  competition: Competition;
  season: Season;
  existingTrades: Trade[];
  eliminatedCastawayIds: CastawayId[];
  offeredByUid: string;
  offeredToUid: string;
  offeredCastawayIds: CastawayId[];
  requestedCastawayIds: CastawayId[];
};

export const proposeTrade = async (
  input: ProposeTradeInput,
): Promise<boolean> => {
  const validation = validateTrade(input);
  if (!validation.valid) {
    showError(validation.reason);
    return false;
  }

  const trade: Trade = {
    id: `trade_${v4()}`,
    competition_id: input.competition.id,
    season_id: input.competition.season_id,
    offered_by_uid: input.offeredByUid,
    offered_to_uid: input.offeredToUid,
    offered_castaway_ids: input.offeredCastawayIds,
    requested_castaway_ids: input.requestedCastawayIds,
    status: "pending",
    created_at: new Date().toISOString(),
  };

  try {
    await setDoc(tradeRef(input.competition.id, trade.id), trade);
    trackEvent("trade_proposed", {
      season_id: trade.season_id,
      offered_count: trade.offered_castaway_ids.length,
      requested_count: trade.requested_castaway_ids.length,
    });
    notifications.show({ color: "green", message: "Trade proposed." });
    return true;
  } catch (err) {
    console.error("proposeTrade failed", err);
    showError("Could not save the trade. Please try again.");
    return false;
  }
};

export type AcceptTradeInput = {
  trade: Trade;
  competition: Competition;
  season: Season;
  existingTrades: Trade[];
  eliminatedCastawayIds: CastawayId[];
  challenges: Record<string, Challenge>;
  eliminations: Record<string, Elimination>;
  events: Record<string, GameEvent>;
  /** Whether challenges/eliminations/events have finished loading. */
  isScoringDataReady: boolean;
};

/**
 * Accept a pending trade. Revalidates ownership/alive/deadline at acceptance
 * time and stamps the points cutoff — past points stay with the original owner.
 */
export const acceptTrade = async (
  input: AcceptTradeInput,
): Promise<boolean> => {
  const { trade } = input;

  // A live competition derives the cutoff from the scoring records, and the
  // cutoff is permanent once written, so never compute it from a half-loaded
  // snapshot: empty records yield episode 1, which would transfer every point
  // already scored. Watch-along competitions read `current_episode` instead and
  // do not need to wait.
  const needsScoringData = input.competition.current_episode === null;
  if (needsScoringData && !input.isScoringDataReady) {
    showError("Still loading this season's scores. Try again in a moment.");
    return false;
  }

  const validation = validateTrade({
    competition: input.competition,
    season: input.season,
    // Exclude this trade itself from the pending-collision check.
    existingTrades: input.existingTrades.filter((t) => t.id !== trade.id),
    eliminatedCastawayIds: input.eliminatedCastawayIds,
    offeredByUid: trade.offered_by_uid,
    offeredToUid: trade.offered_to_uid,
    offeredCastawayIds: trade.offered_castaway_ids,
    requestedCastawayIds: trade.requested_castaway_ids,
  });
  if (!validation.valid) {
    showError(validation.reason);
    return false;
  }

  const effectiveEpisode = getEffectiveEpisode(input);

  try {
    await updateDoc(tradeRef(trade.competition_id, trade.id), {
      status: "accepted",
      effective_episode: effectiveEpisode,
      resolved_at: new Date().toISOString(),
    });
    trackEvent("trade_accepted", {
      season_id: trade.season_id,
      effective_episode: effectiveEpisode,
    });
    notifications.show({
      color: "green",
      message: `Trade accepted. Points transfer from Episode ${effectiveEpisode} onward.`,
    });
    return true;
  } catch (err) {
    console.error("acceptTrade failed", err);
    showError("Could not accept the trade. Please try again.");
    return false;
  }
};

/**
 * Reject and cancel race each other by design: firestore.rules only allows an
 * update while `status == "pending"`, so whichever participant acts second has
 * their write denied. That is a normal outcome here, not an exceptional one, so
 * both paths report it the same way proposeTrade/acceptTrade do.
 */
const resolvePendingTrade = async (
  trade: Trade,
  status: Extract<Trade["status"], "rejected" | "canceled">,
  successMessage: string,
  failureMessage: string,
): Promise<boolean> => {
  try {
    await updateDoc(tradeRef(trade.competition_id, trade.id), {
      status,
      resolved_at: new Date().toISOString(),
    });
    trackEvent(status === "rejected" ? "trade_rejected" : "trade_canceled", {
      season_id: trade.season_id,
    });
    notifications.show({ message: successMessage });
    return true;
  } catch (err) {
    console.error(`${status} trade failed`, err);
    showError(failureMessage);
    return false;
  }
};

export const rejectTrade = async (trade: Trade): Promise<boolean> =>
  resolvePendingTrade(
    trade,
    "rejected",
    "Trade rejected.",
    "Could not reject the trade. It may have already been resolved.",
  );

export const cancelTrade = async (trade: Trade): Promise<boolean> =>
  resolvePendingTrade(
    trade,
    "canceled",
    "Trade canceled.",
    "Could not cancel the trade. It may have already been resolved.",
  );
