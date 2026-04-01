import { useMemo } from "react";
import { CastawayId, Player } from "../types";
import { filterRecordByEpisode } from "../utils/episodeFilter";
import { useCompetition } from "./useCompetition";
import { useEliminations } from "./useEliminations";
import { useSeason } from "./useSeason";
import { useUser } from "./useUser";

export const useCompetitionMeta = () => {
  const { slimUser } = useUser();

  const { data: competition } = useCompetition();
  const { data: season } = useSeason(competition?.season_id);
  const { data: eliminations } = useEliminations(competition?.season_id);

  const maxEpisode = competition?.current_episode ?? null;

  const filteredEliminations = useMemo(
    () => filterRecordByEpisode(eliminations || {}, maxEpisode),
    [eliminations, maxEpisode],
  );

  const survivorsByUserUid = (competition?.participants || []).reduce<
    Record<string, Player[]>
  >((accum, user) => {
    const draftPickCastawayIds = (competition?.draft_picks || [])
      .filter((x) => x.user_uid === user?.uid)
      .map((x) => x.castaway_id);

    accum[user.uid] = draftPickCastawayIds.reduce<Player[]>((accum, id) => {
      const _p = season?.players.find((p) => p.castaway_id === id);

      if (_p) accum.push(_p);

      return accum;
    }, []);

    return accum;
  }, {});

  const mySurvivors: CastawayId[] = slimUser?.uid
    ? survivorsByUserUid[slimUser?.uid]?.map((x) => x.castaway_id)
    : [];

  const eliminatedSurvivors: CastawayId[] = Object.values(
    filteredEliminations,
  ).map((x) => x.castaway_id);

  return {
    mySurvivors,
    eliminatedSurvivors,
    survivorsByUserUid,
  };
};
