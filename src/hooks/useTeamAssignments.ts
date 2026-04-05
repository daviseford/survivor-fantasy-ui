import { Season, TeamAssignments } from "../types";
import { useSharedSnapshot } from "./useSharedSnapshot";

export const useTeamAssignments = (seasonId?: Season["id"]) => {
  return useSharedSnapshot<TeamAssignments>("team_assignments", seasonId);
};
