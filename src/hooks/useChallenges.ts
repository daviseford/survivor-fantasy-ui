import { Challenge, Season } from "../types";
import { useSharedSnapshot } from "./useSharedSnapshot";

export const useChallenges = (seasonId?: Season["id"]) => {
  return useSharedSnapshot<Record<Challenge["id"], Challenge>>(
    "challenges",
    seasonId,
  );
};
