import { useMemo } from "react";
import { Competition } from "../types";
import { getPropBetScoresByUser } from "../utils/propBetUtils";
import { useChallenges } from "./useChallenges";
import { useCompetition } from "./useCompetition";
import { useEliminations } from "./useEliminations";
import { useEvents } from "./useEvents";
import { useSeason } from "./useSeason";

export const usePropBetScoring = (competition_id?: Competition["id"]) => {
  const { data: competition } = useCompetition(competition_id);
  const { data: season } = useSeason(competition?.season_id);
  const { data: challenges } = useChallenges(competition?.season_id);
  const { data: eliminations } = useEliminations(competition?.season_id);
  const { data: events } = useEvents(season?.id);

  const scores = useMemo(
    () =>
      getPropBetScoresByUser(
        events,
        eliminations,
        challenges,
        competition,
        season,
      ),
    [challenges, competition, eliminations, events, season],
  );

  return scores;
};
