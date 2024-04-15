import {
  Card,
  Center,
  SimpleGrid,
  Stack,
  StyleProp,
  Text,
  Title,
} from "@mantine/core";
import { useCompetition } from "../../hooks/useCompetition";
import { useCompetitionMeta } from "../../hooks/useCompetitionMeta";
import { PlayerGroup } from "./PlayerGroup";

export const PlayerGroupGrid = () => {
  const { data: competition } = useCompetition();

  const { survivorsByUserUid, eliminatedSurvivors } = useCompetitionMeta();

  if (!competition) return null;

  const numParticipants = competition.participant_uids.length;

  const cols = (
    numParticipants === 3 || numParticipants === 2
      ? {
          base: 1,
          lg: 2,
        }
      : {
          base: 2,
          md: 3,
          lg: 4,
          xl: 6,
        }
  ) satisfies StyleProp<number>;

  return (
    <SimpleGrid cols={cols}>
      {competition.participants.map((x) => {
        const userSurvivors = survivorsByUserUid[x.uid];

        const numDrafted = userSurvivors.length;
        const numEliminated = userSurvivors.filter((s) =>
          eliminatedSurvivors.includes(s.name),
        ).length;

        const areAllEliminated = numEliminated === numDrafted;
        const isOne = numDrafted - numEliminated === 1;

        return (
          <Card shadow="md">
            <Center>
              <Stack gap={"xs"}>
                <Title order={4} ta="center">
                  {x.displayName}
                </Title>
                <Text
                  c={areAllEliminated ? "dimmed" : undefined}
                  size="sm"
                  ta="center"
                >
                  {numDrafted - numEliminated}{" "}
                  {isOne ? "active player" : "active players"}
                </Text>
                <PlayerGroup uid={x.uid} />
              </Stack>
            </Center>
          </Card>
        );
      })}
    </SimpleGrid>
  );
};
