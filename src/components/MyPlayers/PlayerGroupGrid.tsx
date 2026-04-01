import {
  Badge,
  Card,
  Group,
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
          eliminatedSurvivors.includes(s.castaway_id),
        ).length;
        const numActive = numDrafted - numEliminated;

        const areAllEliminated = numEliminated === numDrafted;

        return (
          <Card
            shadow="sm"
            padding="md"
            radius="md"
            withBorder
            key={x.uid}
            style={{
              opacity: areAllEliminated ? 0.6 : 1,
            }}
          >
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <Title order={4}>{x.displayName}</Title>
                <Badge
                  variant="light"
                  color={areAllEliminated ? "red" : "green"}
                  size="sm"
                >
                  {numActive} active
                </Badge>
              </Group>

              <Text size="xs" c="dimmed">
                {numDrafted} drafted · {numEliminated} eliminated
              </Text>

              <PlayerGroup uid={x.uid} />
            </Stack>
          </Card>
        );
      })}
    </SimpleGrid>
  );
};
