import {
  Card,
  Center,
  SimpleGrid,
  Stack,
  StyleProp,
  Title,
} from "@mantine/core";
import { useCompetition } from "../../hooks/useCompetition";
import { PlayerGroup } from "./PlayerGroup";

export const PlayerGroupGrid = () => {
  const { data: competition } = useCompetition();

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
      {competition.participants.map((x) => (
        <Card shadow="md">
          <Center>
            <Stack gap={"xs"}>
              <Title order={4} ta="center">
                {x.displayName}
              </Title>
              <PlayerGroup uid={x.uid} />
            </Stack>
          </Center>
        </Card>
      ))}
    </SimpleGrid>
  );
};
