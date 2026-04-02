import { CastawayId, Team, TeamAssignmentSnapshot } from "../types";

export const getPlayersOnTeam = (
  snapshot: TeamAssignmentSnapshot,
  teamId: Team["id"],
): CastawayId[] =>
  (Object.entries(snapshot) as [CastawayId, Team["id"] | null][])
    .filter(([, tid]) => tid === teamId)
    .map(([id]) => id);
