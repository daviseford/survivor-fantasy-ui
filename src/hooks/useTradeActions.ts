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
import { getLatestDataEpisode } from "../utils/episodeAirDate";
import { validateTrade } from "../utils/tradeUtils";

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
};

/**
 * Accept a pending trade. Revalidates ownership/alive/deadline at acceptance
 * time and stamps the points cutoff: the new owner earns points from
 * `latestDataEpisode + 1` onward — past points stay with the original owner.
 */
export const acceptTrade = async (
  input: AcceptTradeInput,
): Promise<boolean> => {
  const { trade } = input;

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

  const effectiveEpisode =
    getLatestDataEpisode(input.challenges, input.eliminations, input.events) +
    1;

  try {
    await updateDoc(tradeRef(trade.competition_id, trade.id), {
      status: "accepted",
      effective_episode: effectiveEpisode,
      resolved_at: new Date().toISOString(),
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

export const rejectTrade = async (trade: Trade): Promise<void> => {
  await updateDoc(tradeRef(trade.competition_id, trade.id), {
    status: "rejected",
    resolved_at: new Date().toISOString(),
  });
  notifications.show({ message: "Trade rejected." });
};

export const cancelTrade = async (trade: Trade): Promise<void> => {
  await updateDoc(tradeRef(trade.competition_id, trade.id), {
    status: "canceled",
    resolved_at: new Date().toISOString(),
  });
  notifications.show({ message: "Trade canceled." });
};
