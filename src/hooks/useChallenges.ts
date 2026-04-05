import { Challenge, Season } from "../types";
import { useSharedSnapshot } from "./useSharedSnapshot";

export const useChallenges = (seasonId?: Season["id"]) => {
  const { data } = useSharedSnapshot("challenges", seasonId);
  return { data: (data ?? {}) as Record<Challenge["id"], Challenge> };
};
