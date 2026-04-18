import {
  Badge,
  Button,
  Card,
  Collapse,
  Group,
  SimpleGrid,
  Stack,
  StyleProp,
  Text,
  Title,
} from "@mantine/core";
import { IconChevronDown, IconChevronUp, IconFlame } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useCompetition } from "../../hooks/useCompetition";
import { useCompetitionMeta } from "../../hooks/useCompetitionMeta";
import { useEvents } from "../../hooks/useEvents";
import { CastawayId, Player, SlimUser } from "../../types";
import { PlayerGroup } from "./PlayerGroup";

export const PlayerGroupGrid = () => {
  const { data: competition } = useCompetition();

  const { survivorsByUserUid, eliminatedSurvivors } = useCompetitionMeta();
  const { data: events } = useEvents(competition?.season_id);

  const [openUids, setOpenUids] = useState<ReadonlySet<string>>(new Set());

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
  const participantsWithTeams = competition.participants.filter(
    (p) => (survivorsByUserUid[p.uid]?.length ?? 0) > 0,
  );
  const allOpen =
    participantsWithTeams.length > 0 &&
    participantsWithTeams.every((p) => openUids.has(p.uid));

  const toggleAll = () => {
    setOpenUids(
      allOpen ? new Set() : new Set(participantsWithTeams.map((p) => p.uid)),
    );
  };

  const toggleCard = (uid: string) => {
    setOpenUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

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
    <Stack gap="sm">
      {participantsWithTeams.length > 1 && (
        <Group justify="flex-end">
          <Button
            variant="subtle"
            size="compact-sm"
            color="gray"
            onClick={toggleAll}
            aria-expanded={allOpen}
            rightSection={
              allOpen ? (
                <IconChevronUp size={14} />
              ) : (
                <IconChevronDown size={14} />
              )
            }
          >
            {allOpen ? "Hide all names" : "Show all names"}
          </Button>
        </Group>
      )}
      <SimpleGrid cols={cols}>
        {competition.participants.map((x) => (
          <TeamCard
            key={x.uid}
            participant={x}
            userSurvivors={survivorsByUserUid[x.uid] ?? []}
            eliminatedSurvivors={eliminatedSurvivors}
            winnerCastawayId={winnerCastawayId}
            isFinished={isFinished}
            isOpen={openUids.has(x.uid)}
            onToggle={() => toggleCard(x.uid)}
          />
        ))}
      </SimpleGrid>
    </Stack>
  );
};

const TeamCard = ({
  participant,
  userSurvivors,
  eliminatedSurvivors,
  winnerCastawayId,
  isFinished,
  isOpen,
  onToggle,
}: {
  participant: SlimUser;
  userSurvivors: Player[];
  eliminatedSurvivors: CastawayId[];
  winnerCastawayId: CastawayId | null;
  isFinished: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) => {
  const numDrafted = userSurvivors.length;
  const numEliminated = userSurvivors.filter((s) =>
    eliminatedSurvivors.includes(s.castaway_id),
  ).length;
  const numActive = numDrafted - numEliminated;

  const areAllEliminated = numDrafted > 0 && numEliminated === numDrafted;
  const draftedWinner =
    winnerCastawayId != null &&
    userSurvivors.some((s) => s.castaway_id === winnerCastawayId);

  return (
    <Card
      shadow="sm"
      padding="md"
      radius="md"
      withBorder
      style={{
        opacity: areAllEliminated && !isFinished ? 0.6 : 1,
      }}
    >
      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Title order={4}>{participant.displayName}</Title>
          {isFinished ? (
            draftedWinner ? (
              <Badge
                variant="light"
                color="orange"
                size="sm"
                leftSection={<IconFlame size={12} />}
              >
                Sole Survivor
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

        <PlayerGroup uid={participant.uid} />

        {userSurvivors.length > 0 && (
          <>
            <Button
              variant="subtle"
              size="sm"
              color="gray"
              fullWidth
              px="xs"
              onClick={onToggle}
              aria-expanded={isOpen}
              styles={{ label: { overflow: "visible" } }}
              rightSection={
                isOpen ? (
                  <IconChevronUp size={16} />
                ) : (
                  <IconChevronDown size={16} />
                )
              }
            >
              {isOpen ? "Hide names" : "Show names"}
            </Button>
            <Collapse expanded={isOpen}>
              <Stack gap={4}>
                {userSurvivors.map((p) => {
                  const isEliminated = eliminatedSurvivors.includes(
                    p.castaway_id,
                  );
                  return (
                    <Text
                      key={p.castaway_id}
                      fz={{ base: "xs", sm: "sm" }}
                      truncate
                      c={isEliminated ? "dimmed" : undefined}
                      td={isEliminated ? "line-through" : undefined}
                      title={p.full_name}
                    >
                      {p.full_name}
                    </Text>
                  );
                })}
              </Stack>
            </Collapse>
          </>
        )}
      </Stack>
    </Card>
  );
};
