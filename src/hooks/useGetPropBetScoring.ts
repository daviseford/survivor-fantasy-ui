import { useMemo } from "react";
import { getActivePropBetKeys } from "../data/propbets";
import { Competition } from "../types";
import { filterRecordByEpisode } from "../utils/episodeFilter";
import {
  getPropBetScoresByUser,
  PropBetScoresByUser,
} from "../utils/propBetUtils";
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

  const hasFinaleOccurred = useMemo(
    () =>
      Object.values(filteredEvents).some((e) => e.action === "win_survivor"),
    [filteredEvents],
  );

  const postMergeEpisodeNumbers = useMemo(
    () =>
      new Set(
        (season?.episodes || [])
          .filter((episode) => episode.post_merge)
          .map((episode) => episode.order),
      ),
    [season?.episodes],
  );

  const activeKeys = useMemo(
    () => getActivePropBetKeys(competition?.prop_bets),
    [competition?.prop_bets],
  );

  const data: PropBetScoresByUser = useMemo(
    () =>
      getPropBetScoresByUser(
        filteredEvents,
        filteredEliminations,
        filteredChallenges,
        postMergeEpisodeNumbers,
        hasFinaleOccurred,
        competition,
      ),
    [
      filteredChallenges,
      filteredEliminations,
      filteredEvents,
      postMergeEpisodeNumbers,
      hasFinaleOccurred,
      competition,
    ],
  );

  return { data, activeKeys };
};
