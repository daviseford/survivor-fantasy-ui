import { Box, Breadcrumbs, Card, SimpleGrid, Title } from "@mantine/core";
import { PropBetScoring } from "../components/PropBetTables";
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
            {competition.participants
              .map((x) => x.displayName || x.email)
              .join(", ")}
          </h3>
        </Breadcrumbs>

        {slimUser?.isAdmin && (
          <Breadcrumbs separator=" | ">
            {/* <h3>Started: {String(competition.started)}</h3> */}

            {/* <StartCompetitionButton /> */}

            <h3>Current Episode: {season.episodes.length}</h3>
            {/* <h3>Current Episode: {String(competition.current_episode)}</h3> */}
            {/* <h3>Finished: {String(competition.finished)}</h3> */}
          </Breadcrumbs>
        )}
      </Box>

      <SimpleGrid cols={1} p={"lg"}>
        <GridCard title="Season Scores">
          <PerUserPerEpisodeScoringTable />
        </GridCard>

        <GridCard title="Prop Bets">
          <PropBetScoring />
        </GridCard>

        <GridCard title="Survivor Scores">
          <SeasonTotalContestantScoringTable />
        </GridCard>

        <GridCard title="Scoring Values">
          <ScoringLegendTable />
        </GridCard>
      </SimpleGrid>
    </div>
  );
};

const GridCard = ({
  title,
  children,
}: React.PropsWithChildren<{ title: string }>) => {
  return (
    <Card shadow="sm" p="xl">
      <Card.Section mb={"xs"}>
        <Title order={2}>{title}</Title>
      </Card.Section>
      <Card.Section>{children}</Card.Section>
    </Card>
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
