import { SegmentedControl, Text } from "@mantine/core";
import { sum } from "lodash-es";
import { useMemo, useState } from "react";
import { useCompetition } from "../../hooks/useCompetition";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useScoringCalculations } from "../../hooks/useScoringCalculations";
import { useSeason } from "../../hooks/useSeason";
import type { CastawayId } from "../../types";
import { aggregateByScoringCategory } from "../../utils/scoringCategories";
import { NightingaleRose, RoseDataEntry } from "./NightingaleRose";

type ViewMode = "participant" | "survivor";

const totalPoints = (entry: RoseDataEntry) =>
  sum(entry.categories.map((c) => c.points));

const filterAndSort = (entries: RoseDataEntry[]): RoseDataEntry[] =>
  entries
    .filter((entry) => entry.categories.some((c) => c.points > 0))
    .sort((a, b) => totalPoints(b) - totalPoints(a));

export const ScoringBreakdownSection = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("participant");
  const { data: competition } = useCompetition();
  const { data: season } = useSeason(competition?.season_id);
  const { survivorPointsByEpisode } = useScoringCalculations();
  const isMobile = useIsMobile();

  const hasData = useMemo(() => {
    return Object.values(survivorPointsByEpisode).some((episodes) =>
      episodes.some((ep) => ep.total > 0),
    );
  }, [survivorPointsByEpisode]);

  const participantData: RoseDataEntry[] = useMemo(() => {
    if (!competition) return [];

    const entries = competition.participants.map((participant) => {
      const draftedCastawayIds = competition.draft_picks
        .filter((dp) => dp.user_uid === participant.uid)
        .map((dp) => dp.castaway_id);

      const allEpisodeScores = draftedCastawayIds.flatMap(
        (id) => survivorPointsByEpisode[id] || [],
      );

      const categories = aggregateByScoringCategory(allEpisodeScores);

      return {
        name: participant.displayName || "Unknown",
        categories,
      };
    });

    return filterAndSort(entries);
  }, [competition, survivorPointsByEpisode]);

  const survivorData: RoseDataEntry[] = useMemo(() => {
    const entries = Object.entries(survivorPointsByEpisode).map(
      ([castawayId, episodes]) => ({
        name:
          season?.castawayLookup[castawayId as CastawayId]?.full_name ??
          castawayId,
        categories: aggregateByScoringCategory(episodes),
      }),
    );

    return filterAndSort(entries);
  }, [survivorPointsByEpisode, season?.castawayLookup]);

  if (!hasData) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No scoring data yet
      </Text>
    );
  }

  const chartData = viewMode === "participant" ? participantData : survivorData;
  const chartSize = isMobile ? 280 : 420;

  return (
    <div>
      <SegmentedControl
        aria-label="Scoring breakdown view"
        value={viewMode}
        onChange={(v) => setViewMode(v as ViewMode)}
        data={[
          { label: "By Participant", value: "participant" },
          { label: "By Survivor", value: "survivor" },
        ]}
        mb="md"
      />
      {chartData.length > 0 ? (
        <NightingaleRose key={viewMode} data={chartData} size={chartSize} />
      ) : (
        <Text c="dimmed" ta="center" py="xl">
          No data for this view
        </Text>
      )}
    </div>
  );
};
