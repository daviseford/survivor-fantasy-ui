import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  Alert,
  Box,
  Button,
  Card,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCheck,
  IconCopy,
  IconDeviceFloppy,
  IconX,
} from "@tabler/icons-react";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { db } from "../../firebase";
import { useEliminations } from "../../hooks/useEliminations";
import { useSeason } from "../../hooks/useSeason";
import { useTeamAssignments } from "../../hooks/useTeamAssignments";
import { useTeams } from "../../hooks/useTeams";
import { CastawayId, Team, TeamAssignmentSnapshot } from "../../types";

const NO_TEAM_ID = "__no_team__";

const DraggablePlayerCard = ({
  castawayId,
  displayName,
}: {
  castawayId: CastawayId;
  displayName: string;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: castawayId });

  const style = {
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      p="xs"
      mb={4}
      withBorder
      shadow="xs"
      styles={{
        root: { cursor: "grab", userSelect: "none" },
      }}
    >
      <Text size="sm">{displayName}</Text>
    </Paper>
  );
};

const PlayerDragOverlay = ({ displayName }: { displayName: string }) => (
  <Paper p="xs" withBorder shadow="md">
    <Text size="sm" fw={600}>
      {displayName}
    </Text>
  </Paper>
);

type DroppableColumnProps = {
  id: string;
  title: string;
  color: string | null;
  players: CastawayId[];
  resolveName: (id: CastawayId) => string;
};

const DroppableColumn = ({
  id,
  title,
  color,
  players,
  resolveName,
}: DroppableColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <Card
      ref={setNodeRef}
      withBorder
      padding="sm"
      style={{
        borderColor: isOver
          ? "var(--mantine-color-blue-light-color)"
          : (color ?? undefined),
        borderWidth: color ? 2 : 1,
        minHeight: 120,
        backgroundColor: isOver ? "var(--mantine-color-blue-light)" : undefined,
      }}
    >
      <Group gap="xs" mb="sm">
        {color && (
          <Box
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              backgroundColor: color,
            }}
          />
        )}
        <Text fw={600} size="sm">
          {title}
        </Text>
        <Text size="xs" c="dimmed">
          ({players.length})
        </Text>
      </Group>

      {players.map((cid) => (
        <DraggablePlayerCard
          key={cid}
          castawayId={cid}
          displayName={resolveName(cid)}
        />
      ))}

      {players.length === 0 && (
        <Text size="xs" c="dimmed" ta="center" py="md">
          Drop players here
        </Text>
      )}
    </Card>
  );
};

export const TeamPlayerManager = () => {
  const { data: season } = useSeason();
  const { data: teams } = useTeams(season?.id);
  const { data: assignments } = useTeamAssignments(season?.id);
  const { data: eliminations } = useEliminations(season?.id);

  const [episodeNum, setEpisodeNum] = useState<number>(1);
  const [localAssignments, setLocalAssignments] =
    useState<TeamAssignmentSnapshot | null>(null);
  const [activePlayer, setActivePlayer] = useState<CastawayId | null>(null);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const teamList = Object.values(teams || {});

  // Filter out players eliminated before this episode (players eliminated
  // during this episode were still on a team at the start of the episode)
  const eliminatedBefore = new Set(
    Object.values(eliminations)
      .filter((e) => e.episode_num < episodeNum)
      .map((e) => e.castaway_id),
  );
  const castawayIds = (season?.players.map((p) => p.castaway_id) ?? []).filter(
    (cid) => !eliminatedBefore.has(cid),
  );

  const resolveName = (cid: CastawayId): string =>
    season?.castawayLookup?.[cid]?.full_name ?? cid;

  // Build snapshot: prefer local edits, then saved data, then all null
  const getSnapshot = (): TeamAssignmentSnapshot => {
    if (localAssignments) return localAssignments;

    const saved = assignments[String(episodeNum)];
    if (saved) return saved;

    // Default: all players unassigned
    const snapshot: TeamAssignmentSnapshot = {};
    castawayIds.forEach((cid) => {
      snapshot[cid] = null;
    });
    return snapshot;
  };

  const snapshot = getSnapshot();

  // Group players by team
  const getPlayersByContainer = (): Record<string, CastawayId[]> => {
    const groups: Record<string, CastawayId[]> = {};

    teamList.forEach((t) => {
      groups[t.id] = [];
    });
    groups[NO_TEAM_ID] = [];

    castawayIds.forEach((cid) => {
      const teamId = snapshot[cid];
      if (teamId && groups[teamId]) {
        groups[teamId].push(cid);
      } else {
        groups[NO_TEAM_ID].push(cid);
      }
    });

    return groups;
  };

  const playersByContainer = getPlayersByContainer();

  const handleDragStart = (event: DragStartEvent) => {
    setActivePlayer(event.active.id as CastawayId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActivePlayer(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as CastawayId;
    const targetContainer = over.id as string;

    // over.id is always a droppable container since we only use useDroppable
    if (!playersByContainer[targetContainer]) return;

    const newSnapshot = { ...snapshot };
    newSnapshot[activeId] =
      targetContainer === NO_TEAM_ID ? null : (targetContainer as Team["id"]);
    setLocalAssignments(newSnapshot);
  };

  const handleSave = async () => {
    if (!season) return;
    setSaving(true);

    try {
      const ref = doc(db, `team_assignments/${season.id}`);
      await setDoc(ref, { [String(episodeNum)]: snapshot }, { merge: true });

      notifications.show({
        title: "Team assignments saved",
        message: `Episode ${episodeNum} assignments updated`,
        color: "green",
        icon: <IconCheck size={16} />,
      });

      setLocalAssignments(null);
    } catch (err) {
      notifications.show({
        title: "Failed to save team assignments",
        message: err instanceof Error ? err.message : "Unknown error",
        color: "red",
        icon: <IconX size={16} />,
      });
    }

    setSaving(false);
  };

  const handleCopyPreviousEpisode = () => {
    const prevEp = episodeNum - 1;
    const prevSnapshot = assignments[String(prevEp)];
    if (prevSnapshot) {
      // Ensure all current players are represented
      const merged: TeamAssignmentSnapshot = {};
      castawayIds.forEach((cid) => {
        merged[cid] = prevSnapshot[cid] ?? null;
      });
      setLocalAssignments(merged);
    }
  };

  const handleMoveAllToNoTeam = () => {
    const newSnapshot: TeamAssignmentSnapshot = {};
    castawayIds.forEach((cid) => {
      newSnapshot[cid] = null;
    });
    setLocalAssignments(newSnapshot);
  };

  const handleManualAssignmentChange = (
    castawayId: CastawayId,
    value: string | null,
  ) => {
    const newSnapshot = { ...snapshot };
    newSnapshot[castawayId] =
      value && value !== NO_TEAM_ID ? (value as Team["id"]) : null;
    setLocalAssignments(newSnapshot);
  };

  const handleEpisodeChange = (val: string | number) => {
    setEpisodeNum(Number(val));
    setLocalAssignments(null);
  };

  if (!season) return null;

  if (teamList.length === 0) {
    return (
      <Alert icon={<IconAlertCircle />} title="No Teams" color="blue">
        Create teams above before assigning players.
      </Alert>
    );
  }

  const currentEpisode = season.episodes.find((e) => e.order === episodeNum);
  const isMergeEpisode =
    currentEpisode?.merge_occurs || currentEpisode?.post_merge;

  return (
    <Card withBorder>
      <Card.Section p="md">
        <Title order={4}>Team Assignments by Episode</Title>
        <Text size="sm" c="dimmed" mt="xs">
          Drag players between columns or use the manual assignment list below,
          then save when done.
        </Text>
      </Card.Section>

      <Card.Section p="md">
        <Group mb="md" align="flex-end">
          <NumberInput
            label="Episode #"
            min={1}
            max={season.episodes.length || undefined}
            value={episodeNum}
            onChange={handleEpisodeChange}
            w={120}
          />
          <Button
            variant="light"
            leftSection={<IconCopy size={16} />}
            onClick={handleCopyPreviousEpisode}
            disabled={episodeNum <= 1 || !assignments[String(episodeNum - 1)]}
          >
            Copy from Ep {episodeNum - 1}
          </Button>
          <Button
            variant="filled"
            leftSection={<IconDeviceFloppy size={16} />}
            onClick={handleSave}
            loading={saving}
          >
            Save
          </Button>
        </Group>

        {isMergeEpisode && (
          <Alert
            icon={<IconAlertCircle />}
            title="Merge Episode"
            color="orange"
            mb="md"
          >
            <Group>
              <Text size="sm">
                This is a merge/post-merge episode. Players typically have no
                team.
              </Text>
              <Button
                size="xs"
                variant="light"
                color="orange"
                onClick={handleMoveAllToNoTeam}
              >
                Move all to No Team
              </Button>
            </Group>
          </Alert>
        )}

        {assignments[String(episodeNum)] && !localAssignments && (
          <Alert color="green" mb="md">
            <Text size="sm">
              Saved assignments loaded for episode {episodeNum}.
            </Text>
          </Alert>
        )}

        {localAssignments && (
          <Alert color="yellow" mb="md">
            <Text size="sm">You have unsaved changes.</Text>
          </Alert>
        )}

        <Alert color="blue" variant="light" mb="md">
          <Text size="sm">
            Drag-and-drop is fastest on desktop. The manual assignment controls
            below are the fallback for touch devices, keyboard users, or quick
            spot fixes.
          </Text>
        </Alert>

        <DndContext
          sensors={sensors}
          collisionDetection={rectIntersection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SimpleGrid cols={{ base: 1, sm: 2, md: teamList.length + 1 }}>
            {teamList.map((team) => (
              <DroppableColumn
                key={team.id}
                id={team.id}
                title={team.name}
                color={team.color}
                players={playersByContainer[team.id] || []}
                resolveName={resolveName}
              />
            ))}
            <DroppableColumn
              id={NO_TEAM_ID}
              title="No Team"
              color={null}
              players={playersByContainer[NO_TEAM_ID] || []}
              resolveName={resolveName}
            />
          </SimpleGrid>

          <DragOverlay>
            {activePlayer ? (
              <PlayerDragOverlay displayName={resolveName(activePlayer)} />
            ) : null}
          </DragOverlay>
        </DndContext>

        <Paper withBorder radius="md" p="md" mt="md">
          <Stack gap="md">
            <div>
              <Title order={5}>Manual Assignment</Title>
              <Text size="sm" c="dimmed" mt={4}>
                Assign players one by one without dragging.
              </Text>
            </div>

            <SimpleGrid cols={{ base: 1, md: 2 }}>
              {castawayIds.map((cid) => (
                <Select
                  key={cid}
                  label={resolveName(cid)}
                  data={[
                    ...teamList.map((team) => ({
                      value: team.id,
                      label: team.name,
                    })),
                    { value: NO_TEAM_ID, label: "No Team" },
                  ]}
                  value={snapshot[cid] ?? NO_TEAM_ID}
                  onChange={(value) => handleManualAssignmentChange(cid, value)}
                  searchable
                  clearable={false}
                />
              ))}
            </SimpleGrid>
          </Stack>
        </Paper>
      </Card.Section>
    </Card>
  );
};
