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
  Tooltip,
} from "@mantine/core";
import {
  IconArrowsExchange,
  IconChevronDown,
  IconChevronUp,
  IconFlame,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useCompetition } from "../../hooks/useCompetition";
import { useCompetitionMeta } from "../../hooks/useCompetitionMeta";
import { useEvents } from "../../hooks/useEvents";
import { CastawayId, Player, SlimUser } from "../../types";
import { Acquisition, getAcquisitionLabel } from "../../utils/tradeUtils";
import { PlayerGroup } from "./PlayerGroup";

export const PlayerGroupGrid = () => {
  const { data: competition } = useCompetition();

  const { survivorsByUserUid, eliminatedSurvivors, drafters, acquisitions } =
    useCompetitionMeta();
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
            participants={competition.participants}
            drafters={drafters}
            acquisitions={acquisitions}
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
  participants,
  drafters,
  acquisitions,
  winnerCastawayId,
  isFinished,
  isOpen,
  onToggle,
}: {
  participant: SlimUser;
  userSurvivors: Player[];
  eliminatedSurvivors: CastawayId[];
  participants: SlimUser[];
  drafters: Record<CastawayId, string>;
  acquisitions: Record<CastawayId, Acquisition>;
  winnerCastawayId: CastawayId | null;
  isFinished: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) => {
  // Everything on this card is about the roster as it stands now, so a
  // castaway received in a trade counts here and not on the drafter's card.
  const numOnRoster = userSurvivors.length;
  const numEliminated = userSurvivors.filter((s) =>
    eliminatedSurvivors.includes(s.castaway_id),
  ).length;
  const numActive = numOnRoster - numEliminated;
  const numAcquired = userSurvivors.filter(
    (s) => acquisitions[s.castaway_id],
  ).length;

  const areAllEliminated = numOnRoster > 0 && numEliminated === numOnRoster;
  const ownsWinner =
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
            ownsWinner ? (
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
          {numOnRoster} on roster
          {numAcquired > 0 ? ` · ${numAcquired} via trade` : ""} ·{" "}
          {numEliminated} eliminated
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
                  const acquisition = acquisitions[p.castaway_id];
                  const acquisitionLabel = acquisition
                    ? getAcquisitionLabel(
                        acquisition,
                        drafters[p.castaway_id],
                        participants,
                      )
                    : null;
                  return (
                    <Group key={p.castaway_id} gap={4} wrap="nowrap">
                      <Text
                        fz={{ base: "xs", sm: "sm" }}
                        truncate
                        c={isEliminated ? "dimmed" : undefined}
                        td={isEliminated ? "line-through" : undefined}
                        title={p.full_name}
                      >
                        {p.full_name}
                      </Text>
                      {acquisitionLabel && (
                        <Tooltip label={acquisitionLabel}>
                          <IconArrowsExchange
                            size={13}
                            role="img"
                            aria-label={acquisitionLabel}
                            color="var(--mantine-color-dimmed)"
                            style={{ flexShrink: 0 }}
                          />
                        </Tooltip>
                      )}
                    </Group>
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
