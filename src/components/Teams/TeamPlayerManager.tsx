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
  SimpleGrid,
  Text,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCopy,
  IconDeviceFloppy,
} from "@tabler/icons-react";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { db } from "../../firebase";
import { useEliminations } from "../../hooks/useEliminations";
import { useSeason } from "../../hooks/useSeason";
import { useTeamAssignments } from "../../hooks/useTeamAssignments";
import { useTeams } from "../../hooks/useTeams";
import { Team, TeamAssignmentSnapshot } from "../../types";

const NO_TEAM_ID = "__no_team__";

const DraggablePlayerCard = ({ playerName }: { playerName: string }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: playerName });

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
      <Text size="sm">{playerName}</Text>
    </Paper>
  );
};

const PlayerDragOverlay = ({ playerName }: { playerName: string }) => (
  <Paper p="xs" withBorder shadow="md">
    <Text size="sm" fw={600}>
      {playerName}
    </Text>
  </Paper>
);

type DroppableColumnProps = {
  id: string;
  title: string;
  color: string | null;
  players: string[];
};

const DroppableColumn = ({
  id,
  title,
  color,
  players,
}: DroppableColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <Card
      ref={setNodeRef}
      withBorder
      padding="sm"
      style={{
        borderColor: isOver
          ? "var(--mantine-color-blue-5)"
          : color ?? undefined,
        borderWidth: color ? 2 : 1,
        minHeight: 120,
        backgroundColor: isOver ? "var(--mantine-color-blue-0)" : undefined,
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

      {players.map((name) => (
        <DraggablePlayerCard key={name} playerName={name} />
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
  const [activePlayer, setActivePlayer] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const teamList = Object.values(teams || {});

  // Filter out players eliminated before or during this episode
  const eliminatedBefore = new Set(
    Object.values(eliminations)
      .filter((e) => e.episode_num <= episodeNum)
      .map((e) => e.player_name),
  );
  const playerNames = (season?.players.map((p) => p.name) ?? []).filter(
    (name) => !eliminatedBefore.has(name),
  );

  // Build snapshot: prefer local edits, then saved data, then all null
  const getSnapshot = (): TeamAssignmentSnapshot => {
    if (localAssignments) return localAssignments;

    const saved = assignments[String(episodeNum)];
    if (saved) return saved;

    // Default: all players unassigned
    const snapshot: TeamAssignmentSnapshot = {};
    playerNames.forEach((name) => {
      snapshot[name] = null;
    });
    return snapshot;
  };

  const snapshot = getSnapshot();

  // Group players by team
  const getPlayersByContainer = (): Record<string, string[]> => {
    const groups: Record<string, string[]> = {};

    teamList.forEach((t) => {
      groups[t.id] = [];
    });
    groups[NO_TEAM_ID] = [];

    playerNames.forEach((name) => {
      const teamId = snapshot[name];
      if (teamId && groups[teamId]) {
        groups[teamId].push(name);
      } else {
        groups[NO_TEAM_ID].push(name);
      }
    });

    return groups;
  };

  const playersByContainer = getPlayersByContainer();

  const handleDragStart = (event: DragStartEvent) => {
    setActivePlayer(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActivePlayer(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const targetContainer = over.id as string;

    // over.id is always a droppable container since we only use useDroppable
    if (!playersByContainer[targetContainer]) return;

    const newSnapshot = { ...snapshot };
    newSnapshot[activeId] =
      targetContainer === NO_TEAM_ID
        ? null
        : (targetContainer as Team["id"]);
    setLocalAssignments(newSnapshot);
  };

  const handleSave = async () => {
    if (!season) return;
    setSaving(true);

    const ref = doc(db, `team_assignments/${season.id}`);
    await setDoc(ref, { [String(episodeNum)]: snapshot }, { merge: true });

    setSaving(false);
    setLocalAssignments(null);
  };

  const handleCopyPreviousEpisode = () => {
    const prevEp = episodeNum - 1;
    const prevSnapshot = assignments[String(prevEp)];
    if (prevSnapshot) {
      // Ensure all current players are represented
      const merged: TeamAssignmentSnapshot = {};
      playerNames.forEach((name) => {
        merged[name] = prevSnapshot[name] ?? null;
      });
      setLocalAssignments(merged);
    }
  };

  const handleMoveAllToNoTeam = () => {
    const newSnapshot: TeamAssignmentSnapshot = {};
    playerNames.forEach((name) => {
      newSnapshot[name] = null;
    });
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
              />
            ))}
            <DroppableColumn
              id={NO_TEAM_ID}
              title="No Team"
              color={null}
              players={playersByContainer[NO_TEAM_ID] || []}
            />
          </SimpleGrid>

          <DragOverlay>
            {activePlayer ? (
              <PlayerDragOverlay playerName={activePlayer} />
            ) : null}
          </DragOverlay>
        </DndContext>
      </Card.Section>
    </Card>
  );
};
