import { sum } from "lodash-es";
import { useMemo } from "react";
import {
  EnhancedScores,
  getEnhancedSurvivorPoints,
} from "../utils/scoringUtils";
import { useChallenges } from "./useChallenges";
import { useCompetition } from "./useCompetition";
import { useEliminations } from "./useEliminations";
import { useEvents } from "./useEvents";
import { usePropBetScoring } from "./useGetPropBetScoring";
import { useSeason } from "./useSeason";

export const useScoringCalculations = () => {
  const { data: competition } = useCompetition();
  const { data: season } = useSeason(competition?.season_id);
  const { data: challenges } = useChallenges(competition?.season_id);
  const { data: eliminations } = useEliminations(competition?.season_id);
  const { data: events } = useEvents(season?.id);

  const propBetScores = usePropBetScoring();

  const survivorPointsByEpisode = useMemo(() => {
    if (!season?.players) return {};

    return season?.players.reduce<Record<string, EnhancedScores[]>>(
      (accum, player) => {
        const p = (season?.episodes || []).map((e) =>
          getEnhancedSurvivorPoints(
            Object.values(challenges || {}),
            Object.values(eliminations || {}),
            Object.values(events || {}),
            e.order,
            player.name,
          ),
        );

        accum[player.name] = p;

        return accum;
      },
      {},
    );
  }, [challenges, eliminations, events, season?.episodes, season?.players]);

  const pointsByUserPerEpisode = useMemo(
    () =>
      competition?.participants.reduce<Record<string, number[]>>(
        (accum, participant) => {
          const { uid } = participant;

          const myPlayerNames = competition.draft_picks
            .filter((x) => x.user_uid === uid)
            .map((x) => x.player_name);

          const playerPointsPerEpisode = (season?.episodes || []).map((e) => {
            return sum(
              myPlayerNames.flatMap(
                (p) =>
                  (survivorPointsByEpisode || {})?.[p]?.[e.order - 1]?.total ||
                  0,
              ),
            );
          });

          accum[uid] = playerPointsPerEpisode;

          return accum;
        },
        {},
      ),
    [
      competition?.draft_picks,
      competition?.participants,
      season?.episodes,
      survivorPointsByEpisode,
    ],
  );

  const pointsByUserPerEpisodeWithPropBets = useMemo(
    () =>
      Object.entries(pointsByUserPerEpisode || {}).reduce<
        Record<
          string,
          { episodePoints: number[]; propBetPoints: number; total: number }
        >
      >((accum, [uid, episodePoints]) => {
        const propBets = propBetScores[uid];
        const propBetPoints = propBets?.total || 0;

        accum[uid] = {
          episodePoints,
          propBetPoints,
          total: sum(episodePoints) + propBetPoints,
        };

        return accum;
      }, {}),
    [pointsByUserPerEpisode, propBetScores],
  );

  const survivorPointsTotalSeason = useMemo(
    () =>
      Object.entries(survivorPointsByEpisode).reduce<Record<string, number>>(
        (accum, [key, value]) => {
          accum[key] = sum(value.map((x) => x.total));
          return accum;
        },
        {},
      ),
    [survivorPointsByEpisode],
  );

  return {
    survivorPointsTotalSeason,
    survivorPointsByEpisode,
    pointsByUserPerEpisode,
    pointsByUserPerEpisodeWithPropBets,
  };
};
