import { Box, Breadcrumbs, SimpleGrid, Title } from "@mantine/core";
import {
  PerUserPerEpisodeScoringTable,
  ScoringLegendTable,
  SeasonTotalContestantScoringTable,
} from "../components/ScoringTables";
import { useCompetition } from "../hooks/useCompetition";
import { useSeason } from "../hooks/useSeason";
import { useUser } from "../hooks/useUser";

export const SingleCompetition = () => {
  const { slimUser } = useUser();
  const { data: competition } = useCompetition();

  const { data: season } = useSeason(competition?.season_id);

  if (!competition || !season) return null;

  return (
    <div>
      <Box p="lg">
        <Title order={2}>{competition.competition_name}</Title>

        <Breadcrumbs separator={" | "}>
          <h3>Season: {competition.season_num}</h3>
          <h3>
            Participants:{" "}
            {competition.participants.map((x) => x.displayName).join(", ")}
          </h3>
        </Breadcrumbs>

        {slimUser?.isAdmin && (
          <Breadcrumbs separator=" | ">
            <h3>Started: {String(competition.started)}</h3>

            {/* <StartCompetitionButton /> */}

            <h3>Current Episode: {String(competition.current_episode)}</h3>
            <h3>Finished: {String(competition.finished)}</h3>
          </Breadcrumbs>
        )}
      </Box>

      <SimpleGrid cols={1} p={"lg"}>
        <>
          <Title order={2}>Season Scores</Title>
          <PerUserPerEpisodeScoringTable />
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

// TODO
// const StartCompetitionButton = () => {
//   const { slimUser } = useUser();
//   const { data: competition } = useCompetition();

//   const ref = doc(db, "competitions", competition?.id || "");
//   // https://github.com/invertase/react-query-firebase/blob/main/docs/firestore/data-mutation.mdx
//   const { mutateAsync, isLoading } = useFirestoreDocumentMutation(ref, {});

//   const isCreator = slimUser?.uid === competition?.creator_uid;

//   if (!isCreator || !competition || competition?.started) return null;

//   const handleClick = async () => {
//     await mutateAsync({ ...competition, started: true });
//   };

//   return (
//     <Button onClick={handleClick} disabled={isLoading}>
//       Start Competition
//     </Button>
//   );
// };
