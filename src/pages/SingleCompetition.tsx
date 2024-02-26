import { SimpleGrid, Title } from "@mantine/core";
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

      <SimpleGrid cols={1} p={"lg"}>
        <>
          <Title order={2}>Season Scores</Title>
          <PerPlayerPerEpisodeScoringTable />
        </>

        <>
          <Title order={2}>Survivor Individual Scores</Title>
          <SeasonTotalContestantScoringTable />
        </>

        <>
          <Title order={2}>Scoring Values</Title>
          <ScoringLegendTable />
        </>
      </SimpleGrid>
    </div>
  );
};
