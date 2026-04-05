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
import { IconTrophy } from "@tabler/icons-react";
import { useMemo } from "react";
import { useCompetition } from "../../hooks/useCompetition";
import { useCompetitionMeta } from "../../hooks/useCompetitionMeta";
import { useEvents } from "../../hooks/useEvents";
import { PlayerGroup } from "./PlayerGroup";

export const PlayerGroupGrid = () => {
  const { data: competition } = useCompetition();

  const { survivorsByUserUid, eliminatedSurvivors } = useCompetitionMeta();
  const { data: events } = useEvents(competition?.season_id);

  const isFinished = competition?.finished ?? false;

  const winnerCastawayId = useMemo(() => {
    if (!isFinished) return null;
    return (
      Object.values(events).find((e) => e.action === "win_survivor")
        ?.castaway_id ?? null
    );
  }, [isFinished, events]);

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
        const draftedWinner =
          winnerCastawayId != null &&
          userSurvivors.some((s) => s.castaway_id === winnerCastawayId);

        return (
          <Card
            shadow="sm"
            padding="md"
            radius="md"
            withBorder
            key={x.uid}
            style={{
              opacity: areAllEliminated && !isFinished ? 0.6 : 1,
            }}
          >
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <Title order={4}>{x.displayName}</Title>
                {isFinished ? (
                  draftedWinner ? (
                    <Badge
                      variant="light"
                      color="yellow"
                      size="sm"
                      leftSection={<IconTrophy size={12} />}
                    >
                      Winner
                    </Badge>
                  ) : (
                    <Badge variant="light" color="gray" size="sm">
                      Season over
                    </Badge>
                  )
                ) : (
                  <Badge
                    variant="light"
                    color={areAllEliminated ? "red" : "green"}
                    size="sm"
                  >
                    {numActive} active
                  </Badge>
                )}
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
