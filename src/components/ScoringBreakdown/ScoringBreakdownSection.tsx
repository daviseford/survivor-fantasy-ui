import { SegmentedControl, Text } from "@mantine/core";
import { sum } from "lodash-es";
import { useMemo, useState } from "react";
import { useCompetition } from "../../hooks/useCompetition";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useScoringCalculations } from "../../hooks/useScoringCalculations";
import { aggregateByScoringCategory } from "../../utils/scoringCategories";
import { NightingaleRose, RoseDataEntry } from "./NightingaleRose";

type ViewMode = "participant" | "survivor";

export const ScoringBreakdownSection = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("participant");
  const { data: competition } = useCompetition();
  const { survivorPointsByEpisode } = useScoringCalculations();
  const isMobile = useIsMobile();

  const hasData = useMemo(() => {
    return Object.values(survivorPointsByEpisode).some((episodes) =>
      episodes.some((ep) => ep.total > 0),
    );
  }, [survivorPointsByEpisode]);

  const participantData: RoseDataEntry[] = useMemo(() => {
    if (!competition) return [];

    return competition.participants
      .map((participant) => {
        const draftedPlayerNames = competition.draft_picks
          .filter((dp) => dp.user_uid === participant.uid)
          .map((dp) => dp.player_name);

        // Aggregate scoring across all drafted survivors
        const allEpisodeScores = draftedPlayerNames.flatMap(
          (name) => survivorPointsByEpisode[name] || [],
        );

        const categories = aggregateByScoringCategory(allEpisodeScores);

        return {
          name: participant.displayName || "Unknown",
          categories,
        };
      })
      .sort(
        (a, b) =>
          sum(b.categories.map((c) => c.points)) -
          sum(a.categories.map((c) => c.points)),
      );
  }, [competition, survivorPointsByEpisode]);

  const survivorData: RoseDataEntry[] = useMemo(() => {
    return Object.entries(survivorPointsByEpisode)
      .map(([name, episodes]) => ({
        name,
        categories: aggregateByScoringCategory(episodes),
      }))
      .filter((entry) => entry.categories.some((c) => c.points > 0))
      .sort(
        (a, b) =>
          sum(b.categories.map((c) => c.points)) -
          sum(a.categories.map((c) => c.points)),
      );
  }, [survivorPointsByEpisode]);

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
        value={viewMode}
        onChange={(v) => setViewMode(v as ViewMode)}
        data={[
          { label: "By Participant", value: "participant" },
          { label: "By Survivor", value: "survivor" },
        ]}
        mb="md"
      />
      {chartData.length > 0 ? (
        <NightingaleRose data={chartData} size={chartSize} />
      ) : (
        <Text c="dimmed" ta="center" py="xl">
          No data for this view
        </Text>
      )}
    </div>
  );
};
