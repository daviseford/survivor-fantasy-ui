import { Season, VoteHistory } from "../types";
import { useSharedSnapshot } from "./useSharedSnapshot";

export const useVoteHistory = (seasonId?: Season["id"]) => {
  const { data } = useSharedSnapshot("vote_history", seasonId);
  return { data: (data ?? {}) as Record<VoteHistory["id"], VoteHistory> };
};
