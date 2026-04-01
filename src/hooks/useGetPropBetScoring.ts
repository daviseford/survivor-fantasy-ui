import { useMemo } from "react";
import { Competition } from "../types";
import { filterEpisodesByMax, filterRecordByEpisode } from "../utils/episodeFilter";
import { getPropBetScoresByUser, PropBetScoresByUser } from "../utils/propBetUtils";
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

  const maxEpisode = competition?.current_episode ?? null;

  const filteredChallenges = useMemo(
    () => filterRecordByEpisode(challenges || {}, maxEpisode),
    [challenges, maxEpisode],
  );

  const filteredEliminations = useMemo(
    () => filterRecordByEpisode(eliminations || {}, maxEpisode),
    [eliminations, maxEpisode],
  );

  const filteredEvents = useMemo(
    () => filterRecordByEpisode(events || {}, maxEpisode),
    [events, maxEpisode],
  );

  const hasFinaleOccurred = useMemo(() => {
    const filteredEpisodes = filterEpisodesByMax(
      season?.episodes || [],
      maxEpisode,
    );
    return filteredEpisodes.some((e) => e.finale);
  }, [season?.episodes, maxEpisode]);

  const data: PropBetScoresByUser = useMemo(
    () =>
      getPropBetScoresByUser(
        filteredEvents,
        filteredEliminations,
        filteredChallenges,
        hasFinaleOccurred,
        competition,
        season,
      ),
    [
      filteredChallenges,
      filteredEliminations,
      filteredEvents,
      hasFinaleOccurred,
      competition,
      season,
    ],
  );

  return { data };
};
