import { CastawayId, Team, TeamAssignmentSnapshot } from "../types";

export const getPlayersOnTeam = (
  snapshot: TeamAssignmentSnapshot,
  teamId: Team["id"],
): CastawayId[] =>
  (Object.entries(snapshot) as [CastawayId, Team["id"] | null][])
    .filter(([, tid]) => tid === teamId)
    .map(([id]) => id);

export const getUnassignedPlayers = (
  snapshot: TeamAssignmentSnapshot,
): CastawayId[] =>
  (Object.entries(snapshot) as [CastawayId, Team["id"] | null][])
    .filter(([, tid]) => tid === null)
    .map(([id]) => id);
