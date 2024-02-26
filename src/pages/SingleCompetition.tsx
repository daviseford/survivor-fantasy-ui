import { SimpleGrid } from "@mantine/core";
import { DraftTable } from "../components/DraftTable";
import {
  PerPlayerPerEpisodeScoringTable,
  ScoringLegendTable,
  SeasonTotalContestantScoringTable,
} from "../components/ScoringTables";
import { useCompetition } from "../hooks/useCompetition";
import { useSeason } from "../hooks/useSeason";

export const SingleCompetition = () => {
  const { data: competition } = useCompetition();
  const { data: season } = useSeason(competition?.season_id);

  if (!competition) return <div>Missing competition!</div>;
  if (!season) return <div>Missing season!</div>;

  return (
    <div>
      <h1>Competition ..{competition.id.slice(-4)}</h1>

      <h3>Season: {competition.season_id}</h3>
      <h3>
        Participants:{" "}
        {competition.participants.map((x) => x.displayName).join(", ")}
      </h3>

      <h3>Finished: {competition.finished ? "True" : "False"}</h3>

      <h1>Scoring</h1>

      <PerPlayerPerEpisodeScoringTable />

      <SimpleGrid cols={2}>
        <SeasonTotalContestantScoringTable />
        <ScoringLegendTable />
      </SimpleGrid>

      <h1>Initial Draft</h1>
      <DraftTable
        draft_picks={competition.draft_picks}
        players={season?.players}
        participants={competition.participants}
      />
    </div>
  );
};
