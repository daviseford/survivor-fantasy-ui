import { Season, TeamAssignments } from "../types";
import { useSharedSnapshot } from "./useSharedSnapshot";

export const useTeamAssignments = (seasonId?: Season["id"]) => {
  const { data } = useSharedSnapshot("team_assignments", seasonId);
  return { data: (data ?? {}) as TeamAssignments };
};
