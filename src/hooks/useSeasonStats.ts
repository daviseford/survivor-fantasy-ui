import { useMemo } from "react";
import { CastawayId } from "../types";
import { filterRecordByEpisode } from "../utils/episodeFilter";
import { computeSeasonStats, SeasonStatsResult } from "../utils/seasonStats";
import { useCompetition } from "./useCompetition";
import { useScoringCalculations } from "./useScoringCalculations";
import { useSeason } from "./useSeason";
import { useTrades } from "./useTrades";
import { useVoteHistory } from "./useVoteHistory";

export const useSeasonStats = (): SeasonStatsResult | null => {
  const { data: competition } = useCompetition();
  const { data: season } = useSeason(competition?.season_id);
  const { data: voteHistoryAll } = useVoteHistory(competition?.season_id);
  const { data: trades } = useTrades(competition?.id);

  const {
    filteredChallenges,
    filteredEliminations,
    filteredEvents,
    survivorPointsByEpisode,
    pointsByUserPerEpisode,
  } = useScoringCalculations();

  const maxEpisode = competition?.current_episode ?? null;

  const filteredVoteHistory = useMemo(
    () => filterRecordByEpisode(voteHistoryAll || {}, maxEpisode),
    [voteHistoryAll, maxEpisode],
  );

  const resolveName = useMemo(() => {
    const lookup = season?.castawayLookup ?? {};
    return (id: CastawayId) =>
      lookup[id]?.castaway ?? lookup[id]?.full_name ?? id;
  }, [season?.castawayLookup]);

  return useMemo(() => {
    if (!competition) return null;

    return computeSeasonStats({
      competition,
      trades,
      filteredChallenges,
      filteredEliminations,
      filteredEvents,
      filteredVoteHistory,
      survivorPointsByEpisode,
      pointsByUserPerEpisode,
      resolveName,
    });
  }, [
    competition,
    trades,
    filteredChallenges,
    filteredEliminations,
    filteredEvents,
    filteredVoteHistory,
    survivorPointsByEpisode,
    pointsByUserPerEpisode,
    resolveName,
  ]);
};
