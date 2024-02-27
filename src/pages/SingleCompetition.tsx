import { Button, SimpleGrid, Title } from "@mantine/core";
import { useFirestoreDocumentMutation } from "@react-query-firebase/firestore";
import { doc } from "firebase/firestore";
import {
  PerPlayerPerEpisodeScoringTable,
  ScoringLegendTable,
  SeasonTotalContestantScoringTable,
} from "../components/ScoringTables";
import { db } from "../firebase";
import { useCompetition } from "../hooks/useCompetition";
import { useSeason } from "../hooks/useSeason";
import { useUser } from "../hooks/useUser";

export const SingleCompetition = () => {
  const { data: competition } = useCompetition();

  const { data: season } = useSeason(competition?.season_id);

  if (!competition || !season) return null;

  return (
    <div>
      <h1>Competition ..{competition.id.slice(-4)}</h1>

      <h3>Season: {competition.season_id}</h3>
      <h3>
        Participants:{" "}
        {competition.participants.map((x) => x.displayName).join(", ")}
      </h3>

      <h3>Started: {String(competition.started)}</h3>

      <StartCompetitionButton />

      <h3>Current Episode: {String(competition.current_episode)}</h3>
      <h3>Finished: {String(competition.finished)}</h3>

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

const StartCompetitionButton = () => {
  const { slimUser } = useUser();
  const { data: competition, refetch } = useCompetition();

  const ref = doc(db, "competitions", competition?.id || "");
  // https://github.com/invertase/react-query-firebase/blob/main/docs/firestore/data-mutation.mdx
  const { mutateAsync, isLoading } = useFirestoreDocumentMutation(
    ref,
    {},
    {
      onSuccess: () => {
        refetch();
      },
    },
  );

  const isCreator = slimUser?.uid === competition?.creator;

  if (!isCreator || !competition || competition?.started) return null;

  const handleClick = async () => {
    await mutateAsync({ ...competition, started: true });
  };

  return (
    <Button onClick={handleClick} disabled={isLoading}>
      Start Competition
    </Button>
  );
};
