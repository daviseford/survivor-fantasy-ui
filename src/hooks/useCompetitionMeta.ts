import { useCompetition } from "./useCompetition";
import { useEliminations } from "./useEliminations";
import { useSeason } from "./useSeason";
import { useUser } from "./useUser";

export const useCompetitionMeta = () => {
  const { slimUser } = useUser();

  const { data: competition } = useCompetition();
  const { data: season } = useSeason(competition?.season_id);
  const { data: eliminations } = useEliminations(competition?.season_id);

  const myDraftedPlayers = (competition?.draft_picks || [])
    .filter((x) => x.user_uid === slimUser?.uid)
    .map((x) => x.player_name);

  const myPlayers = (season?.players || []).filter((p) =>
    myDraftedPlayers.includes(p.name),
  );

  const eliminatedPlayers = Object.values(eliminations).map(
    (x) => x.player_name,
  );

  return {
    myPlayers,
    eliminatedPlayers,
  };
};
