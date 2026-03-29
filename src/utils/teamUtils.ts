import { Team, TeamAssignmentSnapshot } from "../types";

export const getPlayersOnTeam = (
  snapshot: TeamAssignmentSnapshot,
  teamId: Team["id"],
): string[] =>
  Object.entries(snapshot)
    .filter(([, tid]) => tid === teamId)
    .map(([name]) => name);

export const getUnassignedPlayers = (
  snapshot: TeamAssignmentSnapshot,
): string[] =>
  Object.entries(snapshot)
    .filter(([, tid]) => tid === null)
    .map(([name]) => name);
