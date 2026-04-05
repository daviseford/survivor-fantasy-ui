import { Season, Team } from "../types";
import { useSharedSnapshot } from "./useSharedSnapshot";

export const useTeams = (seasonId?: Season["id"]) => {
  return useSharedSnapshot<Record<Team["id"], Team>>("teams", seasonId);
};
