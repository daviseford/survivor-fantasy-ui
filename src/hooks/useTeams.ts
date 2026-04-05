import { Season, Team } from "../types";
import { useSharedSnapshot } from "./useSharedSnapshot";

export const useTeams = (seasonId?: Season["id"]) => {
  const { data } = useSharedSnapshot("teams", seasonId);
  return { data: (data ?? {}) as Record<Team["id"], Team> };
};
