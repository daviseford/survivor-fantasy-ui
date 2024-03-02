import { Player } from "../types";
import { useCompetition } from "./useCompetition";
import { useEliminations } from "./useEliminations";
import { useSeason } from "./useSeason";
import { useUser } from "./useUser";

export const useCompetitionMeta = () => {
  const { slimUser } = useUser();

  const { data: competition } = useCompetition();
  const { data: season } = useSeason(competition?.season_id);
  const { data: eliminations } = useEliminations(competition?.season_id);

  const survivorsByUserUid = (competition?.participants || []).reduce<
    Record<string, Player[]>
  >((accum, user) => {
    const draftPickNames = (competition?.draft_picks || [])
      .filter((x) => x.user_uid === user?.uid)
      .map((x) => x.player_name);

    accum[user.uid] = draftPickNames.reduce<Player[]>((accum, x) => {
      const _p = season?.players.find((p) => p.name === x);

      if (_p) accum.push(_p);

      return accum;
    }, []);

    return accum;
  }, {});

  const mySurvivors = slimUser?.uid
    ? survivorsByUserUid[slimUser?.uid]?.map((x) => x.name)
    : [];

  const eliminatedSurvivors = Object.values(eliminations).map(
    (x) => x.player_name,
  );

  return {
    mySurvivors,
    eliminatedSurvivors,
    survivorsByUserUid,
  };
};
