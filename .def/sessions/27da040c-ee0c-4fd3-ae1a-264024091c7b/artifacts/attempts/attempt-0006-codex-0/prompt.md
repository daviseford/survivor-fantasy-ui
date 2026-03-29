You are Codex, reviewing an implementation by Claude for: I want to have the ability to add players to teams. There are often two to three teams in play in Survivor, and later in the season there are no teams. I think a drag-and-drop interface would be best. I'd like to have an admin panel to manage teams. I should be able to create teams. I should have a CRUD panel for teams and then a drag-and-drop interface to move players from team to team. Keep in mind there needs to be a 'no team' option for when the tribes emerge. I'd like the ability for events, challenges, et cetera to be able to select a winning team, which would automatically give the correct points to each player on that team.

## Debate Decisions
1. Store tribes in a separate Firestore doc per season (tribes/{seasonId}) matching the challenges/eliminations/events pattern
2. Tribe assignments are episode-scoped -- a player's tribe can change per episode (swaps, merge, etc)
3. Use @dnd-kit/core + @dnd-kit/sortable for drag-and-drop (modern, well-maintained, React 18 compatible)
4. Add a 'winning_tribe' optional field to Challenge rather than creating a new entity
5. Add a Tribes tab to the existing SeasonAdmin page following the established tab pattern
6. Keep `Challenge.winning_players` as the scoring source of truth and derive it from team membership at admin write time
7. Add a new season-scoped team assignments document, but model assignments as episode snapshots rather than open-ended effective ranges
8. Add a `teams` tab to `SeasonAdmin` instead of a separate admin route
9. Episode snapshot model wins over effective-range transitions -- simpler admin UX, no resolution logic
10. No Team is null, not a synthetic team record
11. winning_players remains the scoring source of truth, populated at write time from team membership
12. winning_team_id is optional audit metadata on Challenge
13. Teams tab in SeasonAdmin, not a separate route
14. Use @dnd-kit/core + @dnd-kit/sortable for drag-and-drop
15. Team color is a free-form ColorInput (hex) -- admins know Survivor tribe colors
16. Teams are episode-scoped snapshots stored per season (teams/{seasonId} + team_assignments/{seasonId})
17. Winning_team_id is optional metadata; scoring still relies on winning_players populated at write time
18. No Team is represented as null and rendered as a dedicated column

## Implementation Diff
```diff
diff --git a/README.md b/README.md
index fd34860..1f3fa44 100644
--- a/README.md
+++ b/README.md
@@ -3,4 +3,3 @@
 Hosted with firebase
 
 [Deployed link](https://survivor-fantasy-51c4b.web.app/)
-
diff --git a/docs/new-season-setup.md b/docs/new-season-setup.md
index fd0872e..bf75349 100644
--- a/docs/new-season-setup.md
+++ b/docs/new-season-setup.md
@@ -74,7 +74,8 @@ const uploadSXX = async () => {
 In `src/pages/Seasons.tsx`, update the visibility filter to include the new season:
 
 ` ` `ts
-if (x.name !== "Survivor 46" && x.name !== "Survivor XX" && !slimUser?.isAdmin) return null;
+if (x.name !== "Survivor 46" && x.name !== "Survivor XX" && !slimUser?.isAdmin)
+  return null;
 ` ` `
 
 ## 7. Upload to Firestore
diff --git a/package.json b/package.json
index 3c3e83b..b2e5c51 100644
--- a/package.json
+++ b/package.json
@@ -17,6 +17,9 @@
     "up": "yarn upgrade-interactive --latest"
   },
   "dependencies": {
+    "@dnd-kit/core": "^6.3.1",
+    "@dnd-kit/sortable": "^10.0.0",
+    "@dnd-kit/utilities": "^3.2.2",
     "@mantine/charts": "^7.8.0",
     "@mantine/core": "^7.8.0",
     "@mantine/form": "^7.8.0",
diff --git a/src/components/Challenges/CreateChallenge.tsx b/src/components/Challenges/CreateChallenge.tsx
index 7dd4e23..335e163 100644
--- a/src/components/Challenges/CreateChallenge.tsx
+++ b/src/components/Challenges/CreateChallenge.tsx
@@ -23,12 +23,17 @@ import { db } from "../../firebase";
 import { useChallenges } from "../../hooks/useChallenges";
 import { useEliminations } from "../../hooks/useEliminations";
 import { useSeason } from "../../hooks/useSeason";
-import { Challenge, ChallengeWinActions } from "../../types";
+import { useTeamAssignments } from "../../hooks/useTeamAssignments";
+import { useTeams } from "../../hooks/useTeams";
+import { Challenge, ChallengeWinActions, Team } from "../../types";
+import { getPlayersOnTeam } from "../../utils/teamUtils";
 
 export const CreateChallenge = () => {
   const { data: season, isLoading } = useSeason();
   const { data: eliminations } = useEliminations(season?.id);
   const { data: challenges } = useChallenges(season?.id);
+  const { data: teams } = useTeams(season?.id);
+  const { data: teamAssignments } = useTeamAssignments(season?.id);
 
   const form = useForm<Challenge>({
     initialValues: {
@@ -97,7 +102,36 @@ export const CreateChallenge = () => {
     await setDoc(ref, { [values.id]: values }, { merge: true });
 
     // reset id and important form values
-    form.setValues({ id: `challenge_${v4()}`, winning_players: [] });
+    form.setValues({
+      id: `challenge_${v4()}`,
+      winning_players: [],
+      winning_team_id: null,
+    });
+  };
+
+  const teamList = Object.values(teams || {});
+  const teamSelectData = teamList.map((t) => ({
+    value: t.id,
+    label: t.name,
+  }));
+
+  const handleWinningTeamChange = (teamId: string | null) => {
+    if (!teamId) {
+      form.setFieldValue("winning_team_id", null);
+      return;
+    }
+
+    const episodeSnapshot =
+      teamAssignments[String(form.values.episode_num)] ?? {};
+    const playersOnTeam = getPlayersOnTeam(
+      episodeSnapshot,
+      teamId as Team["id"],
+    );
+
+    form.setFieldValue("winning_team_id", teamId as Team["id"]);
+    if (playersOnTeam.length > 0) {
+      form.setFieldValue("winning_players", playersOnTeam);
+    }
   };
 
   const eliminatedPlayers = Object.values(eliminations).map(
@@ -139,6 +173,18 @@ export const CreateChallenge = () => {
                 {...form.getInputProps("order")}
               />
 
+              {teamSelectData.length > 0 && (
+                <Select
+                  label="Winning Team (optional)"
+                  placeholder="Select a team to auto-fill winners"
+                  data={teamSelectData}
+                  clearable
+                  searchable
+                  value={form.values.winning_team_id ?? null}
+                  onChange={handleWinningTeamChange}
+                />
+              )}
+
               <MultiSelect
                 withAsterisk
                 label="Winning Players"
diff --git a/src/components/Teams/CreateTeam.tsx b/src/components/Teams/CreateTeam.tsx
new file mode 100644
index 0000000..eaca740
--- /dev/null
+++ b/src/components/Teams/CreateTeam.tsx
@@ -0,0 +1,133 @@
+import {
+  Box,
+  Button,
+  Card,
+  Center,
+  Code,
+  ColorInput,
+  Group,
+  Loader,
+  SimpleGrid,
+  TextInput,
+  Title,
+} from "@mantine/core";
+import { useForm } from "@mantine/form";
+import { doc, setDoc } from "firebase/firestore";
+import { v4 } from "uuid";
+import { db } from "../../firebase";
+import { useSeason } from "../../hooks/useSeason";
+import { Team } from "../../types";
+
+const SURVIVOR_SWATCHES = [
+  "#3B82F6", // blue
+  "#EF4444", // red
+  "#22C55E", // green
+  "#EAB308", // yellow
+  "#A855F7", // purple
+  "#F97316", // orange
+  "#EC4899", // pink
+  "#14B8A6", // teal
+  "#000000", // black
+];
+
+export const CreateTeam = () => {
+  const { data: season, isLoading } = useSeason();
+
+  const form = useForm<Team>({
+    initialValues: {
+      id: `team_${v4()}`,
+      season_id: "season_1",
+      season_num: 1,
+      name: "",
+      color: "#3B82F6",
+    },
+
+    validate: {
+      name: (value) => (value.trim().length > 0 ? null : "Team name required"),
+      color: (value) =>
+        /^#[0-9a-fA-F]{6}$/.test(value) ? null : "Valid hex color required",
+    },
+  });
+
+  if (isLoading) {
+    return (
+      <Center>
+        <Loader size="xl" />
+      </Center>
+    );
+  }
+
+  if (!season) return null;
+
+  const handleSubmit = async (values: Team) => {
+    const _validate = form.validate();
+    if (_validate.hasErrors) return;
+
+    const payload: Team = {
+      ...values,
+      season_id: season.id,
+      season_num: season.order,
+    };
+
+    const ref = doc(db, `teams/${season.id}`);
+    await setDoc(ref, { [payload.id]: payload }, { merge: true });
+
+    form.setValues({ id: `team_${v4()}`, name: "", color: "#3B82F6" });
+  };
+
+  return (
+    <Card withBorder>
+      <Card.Section p="md">
+        <Title order={4}>Create a new Team</Title>
+      </Card.Section>
+
+      <Card.Section p="md">
+        <SimpleGrid cols={{ base: 1, md: 2 }}>
+          <Box maw={340} mx="auto">
+            <form onSubmit={form.onSubmit((values) => handleSubmit(values))}>
+              <TextInput
+                withAsterisk
+                readOnly
+                label="Season"
+                value={`${season.name} (${season.id})`}
+              />
+
+              <TextInput
+                withAsterisk
+                label="Team Name"
+                placeholder="e.g. Luvu"
+                {...form.getInputProps("name")}
+              />
+
+              <ColorInput
+                withAsterisk
+                label="Team Color"
+                format="hex"
+                swatches={SURVIVOR_SWATCHES}
+                {...form.getInputProps("color")}
+              />
+
+              <Group justify="flex-end" mt="md">
+                <Button type="submit">Submit</Button>
+              </Group>
+            </form>
+          </Box>
+          <Box>
+            Generated Payload:
+            <Code block>
+              {JSON.stringify(
+                {
+                  ...form.values,
+                  season_id: season.id,
+                  season_num: season.order,
+                },
+                null,
+                2,
+              )}
+            </Code>
+          </Box>
+        </SimpleGrid>
+      </Card.Section>
+    </Card>
+  );
+};
diff --git a/src/components/Teams/TeamCRUDTable.tsx b/src/components/Teams/TeamCRUDTable.tsx
new file mode 100644
index 0000000..a4bcd48
--- /dev/null
+++ b/src/components/Teams/TeamCRUDTable.tsx
@@ -0,0 +1,78 @@
+import {
+  ActionIcon,
+  Box,
+  Code,
+  Table,
+  TableScrollContainer,
+} from "@mantine/core";
+import { modals } from "@mantine/modals";
+import { IconTrash } from "@tabler/icons-react";
+import { doc, setDoc } from "firebase/firestore";
+import { db } from "../../firebase";
+import { useSeason } from "../../hooks/useSeason";
+import { useTeams } from "../../hooks/useTeams";
+import { useUser } from "../../hooks/useUser";
+import { Team } from "../../types";
+
+export const TeamCRUDTable = () => {
+  const { data: season } = useSeason();
+  const { data: teams } = useTeams(season?.id);
+  const { slimUser } = useUser();
+
+  const handleDelete = async (team: Team) => {
+    if (!slimUser?.isAdmin) return;
+
+    modals.openConfirmModal({
+      title: "Do you want to delete this team?",
+      children: <Code block>{JSON.stringify(team, null, 2)}</Code>,
+      labels: { confirm: "Delete", cancel: "Cancel" },
+      onConfirm: async () => {
+        const ref = doc(db, `teams/${season?.id}`);
+        const newTeams = { ...teams };
+        delete newTeams[team.id];
+        await setDoc(ref, newTeams);
+      },
+    });
+  };
+
+  const rows = Object.values(teams || {}).map((team) => (
+    <Table.Tr key={team.id}>
+      <Table.Td>{team.name}</Table.Td>
+      <Table.Td>
+        <Box
+          style={{
+            width: 24,
+            height: 24,
+            borderRadius: 4,
+            backgroundColor: team.color,
+            border: "1px solid var(--mantine-color-default-border)",
+          }}
+        />
+      </Table.Td>
+      <Table.Td>{team.id}</Table.Td>
+      {slimUser?.isAdmin && (
+        <Table.Td>
+          <ActionIcon color="red" onClick={() => handleDelete(team)}>
+            <IconTrash />
+          </ActionIcon>
+        </Table.Td>
+      )}
+    </Table.Tr>
+  ));
+
+  return (
+    <TableScrollContainer minWidth={300}>
+      <Table>
+        <Table.Thead>
+          <Table.Tr>
+            <Table.Th>Name</Table.Th>
+            <Table.Th>Color</Table.Th>
+            <Table.Th>ID</Table.Th>
+            {slimUser?.isAdmin && <Table.Th>Delete</Table.Th>}
+          </Table.Tr>
+        </Table.Thead>
+        <Table.Tbody>{rows}</Table.Tbody>
+      </Table>
+    </TableScrollContainer>
+  );
+};
diff --git a/src/components/Teams/TeamPlayerManager.tsx b/src/components/Teams/TeamPlayerManager.tsx
new file mode 100644
index 0000000..85e9650
--- /dev/null
+++ b/src/components/Teams/TeamPlayerManager.tsx
@@ -0,0 +1,429 @@
+import {
+  DndContext,
+  DragEndEvent,
+  DragOverEvent,
+  DragOverlay,
+  DragStartEvent,
+  PointerSensor,
+  closestCenter,
+  useDroppable,
+  useSensor,
+  useSensors,
+} from "@dnd-kit/core";
+import {
+  SortableContext,
+  useSortable,
+  verticalListSortingStrategy,
+} from "@dnd-kit/sortable";
+import { CSS } from "@dnd-kit/utilities";
+import {
+  Alert,
+  Box,
+  Button,
+  Card,
+  Group,
+  NumberInput,
+  Paper,
+  SimpleGrid,
+  Text,
+  Title,
+} from "@mantine/core";
+import {
+  IconAlertCircle,
+  IconCopy,
+  IconDeviceFloppy,
+} from "@tabler/icons-react";
+import { doc, setDoc } from "firebase/firestore";
+import { useState } from "react";
+import { db } from "../../firebase";
+import { useSeason } from "../../hooks/useSeason";
+import { useTeamAssignments } from "../../hooks/useTeamAssignments";
+import { useTeams } from "../../hooks/useTeams";
+import { Team, TeamAssignmentSnapshot } from "../../types";
+
+const NO_TEAM_ID = "__no_team__";
+
+type PlayerCardProps = {
+  playerName: string;
+  isDragOverlay?: boolean;
+};
+
+const SortablePlayerCard = ({ playerName }: PlayerCardProps) => {
+  const {
+    attributes,
+    listeners,
+    setNodeRef,
+    transform,
+    transition,
+    isDragging,
+  } = useSortable({ id: playerName });
+
+  const style = {
+    transform: CSS.Transform.toString(transform),
+    transition,
+    opacity: isDragging ? 0.4 : 1,
+  };
+
+  return (
+    <Paper
+      ref={setNodeRef}
+      style={style}
+      {...attributes}
+      {...listeners}
+      p="xs"
+      mb={4}
+      withBorder
+      shadow="xs"
+      styles={{
+        root: { cursor: "grab", userSelect: "none" },
+      }}
+    >
+      <Text size="sm">{playerName}</Text>
+    </Paper>
+  );
+};
+
+const PlayerDragOverlay = ({ playerName }: PlayerCardProps) => (
+  <Paper p="xs" withBorder shadow="md">
+    <Text size="sm" fw={600}>
+      {playerName}
+    </Text>
+  </Paper>
+);
+
+type DroppableColumnProps = {
+  id: string;
+  title: string;
+  color: string | null;
+  players: string[];
+};
+
+const DroppableColumn = ({
+  id,
+  title,
+  color,
+  players,
+}: DroppableColumnProps) => {
+  const { setNodeRef, isOver } = useDroppable({ id });
+
+  return (
+    <Card
+      ref={setNodeRef}
+      withBorder
+      padding="sm"
+      style={{
+        borderColor: isOver
+          ? "var(--mantine-color-blue-5)"
+          : color ?? undefined,
+        borderWidth: color ? 2 : 1,
+        minHeight: 120,
+        backgroundColor: isOver ? "var(--mantine-color-blue-0)" : undefined,
+      }}
+    >
+      <Group gap="xs" mb="sm">
+        {color && (
+          <Box
+            style={{
+              width: 14,
+              height: 14,
+              borderRadius: 3,
+              backgroundColor: color,
+            }}
+          />
+        )}
+        <Text fw={600} size="sm">
+          {title}
+        </Text>
+        <Text size="xs" c="dimmed">
+          ({players.length})
+        </Text>
+      </Group>
+
+      <SortableContext
+        items={players}
+        strategy={verticalListSortingStrategy}
+        id={id}
+      >
+        {players.map((name) => (
+          <SortablePlayerCard key={name} playerName={name} />
+        ))}
+      </SortableContext>
+
+      {players.length === 0 && (
+        <Text size="xs" c="dimmed" ta="center" py="md">
+          Drop players here
+        </Text>
+      )}
+    </Card>
+  );
+};
+
+export const TeamPlayerManager = () => {
+  const { data: season } = useSeason();
+  const { data: teams } = useTeams(season?.id);
+  const { data: assignments } = useTeamAssignments(season?.id);
+
+  const [episodeNum, setEpisodeNum] = useState<number>(1);
+  const [localAssignments, setLocalAssignments] =
+    useState<TeamAssignmentSnapshot | null>(null);
+  const [activePlayer, setActivePlayer] = useState<string | null>(null);
+  const [saving, setSaving] = useState(false);
+
+  const sensors = useSensors(
+    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
+  );
+
+  const teamList = Object.values(teams || {});
+  const playerNames = season?.players.map((p) => p.name) ?? [];
+
+  // Build snapshot: prefer local edits, then saved data, then all null
+  const getSnapshot = (): TeamAssignmentSnapshot => {
+    if (localAssignments) return localAssignments;
+
+    const saved = assignments[String(episodeNum)];
+    if (saved) return saved;
+
+    // Default: all players unassigned
+    const snapshot: TeamAssignmentSnapshot = {};
+    playerNames.forEach((name) => {
+      snapshot[name] = null;
+    });
+    return snapshot;
+  };
+
+  const snapshot = getSnapshot();
+
+  // Group players by team
+  const getPlayersByContainer = (): Record<string, string[]> => {
+    const groups: Record<string, string[]> = {};
+
+    teamList.forEach((t) => {
+      groups[t.id] = [];
+    });
+    groups[NO_TEAM_ID] = [];
+
+    playerNames.forEach((name) => {
+      const teamId = snapshot[name];
+      if (teamId && groups[teamId]) {
+        groups[teamId].push(name);
+      } else {
+        groups[NO_TEAM_ID].push(name);
+      }
+    });
+
+    return groups;
+  };
+
+  const playersByContainer = getPlayersByContainer();
+
+  const findContainerForPlayer = (playerName: string): string | undefined => {
+    for (const [containerId, players] of Object.entries(playersByContainer)) {
+      if (players.includes(playerName)) return containerId;
+    }
+    return undefined;
+  };
+
+  const handleDragStart = (event: DragStartEvent) => {
+    setActivePlayer(event.active.id as string);
+  };
+
+  const handleDragOver = (event: DragOverEvent) => {
+    const { active, over } = event;
+    if (!over) return;
+
+    const activeId = active.id as string;
+    const overId = over.id as string;
+
+    const activeContainer = findContainerForPlayer(activeId);
+    // overId could be a container or another player
+    const overContainer = playersByContainer[overId]
+      ? overId
+      : findContainerForPlayer(overId);
+
+    if (!activeContainer || !overContainer || activeContainer === overContainer)
+      return;
+
+    // Move player to new container
+    const newSnapshot = { ...snapshot };
+    newSnapshot[activeId] =
+      overContainer === NO_TEAM_ID ? null : (overContainer as Team["id"]);
+
+    setLocalAssignments(newSnapshot);
+  };
+
+  const handleDragEnd = (event: DragEndEvent) => {
+    const { active, over } = event;
+    setActivePlayer(null);
+
+    if (!over) return;
+
+    const activeId = active.id as string;
+    const overId = over.id as string;
+
+    // If dropped on a container directly
+    if (playersByContainer[overId]) {
+      const newSnapshot = { ...snapshot };
+      newSnapshot[activeId] =
+        overId === NO_TEAM_ID ? null : (overId as Team["id"]);
+      setLocalAssignments(newSnapshot);
+    }
+  };
+
+  const handleSave = async () => {
+    if (!season) return;
+    setSaving(true);
+
+    const ref = doc(db, `team_assignments/${season.id}`);
+    await setDoc(ref, { [String(episodeNum)]: snapshot }, { merge: true });
+
+    setSaving(false);
+    setLocalAssignments(null);
+  };
+
+  const handleCopyPreviousEpisode = () => {
+    const prevEp = episodeNum - 1;
+    const prevSnapshot = assignments[String(prevEp)];
+    if (prevSnapshot) {
+      // Ensure all current players are represented
+      const merged: TeamAssignmentSnapshot = {};
+      playerNames.forEach((name) => {
+        merged[name] = prevSnapshot[name] ?? null;
+      });
+      setLocalAssignments(merged);
+    }
+  };
+
+  const handleMoveAllToNoTeam = () => {
+    const newSnapshot: TeamAssignmentSnapshot = {};
+    playerNames.forEach((name) => {
+      newSnapshot[name] = null;
+    });
+    setLocalAssignments(newSnapshot);
+  };
+
+  const handleEpisodeChange = (val: string | number) => {
+    setEpisodeNum(Number(val));
+    setLocalAssignments(null);
+  };
+
+  if (!season) return null;
+
+  if (teamList.length === 0) {
+    return (
+      <Alert icon={<IconAlertCircle />} title="No Teams" color="blue">
+        Create teams above before assigning players.
+      </Alert>
+    );
+  }
+
+  const currentEpisode = season.episodes.find((e) => e.order === episodeNum);
+  const isMergeEpisode =
+    currentEpisode?.merge_occurs || currentEpisode?.post_merge;
+
+  return (
+    <Card withBorder>
+      <Card.Section p="md">
+        <Title order={4}>Team Assignments by Episode</Title>
+      </Card.Section>
+
+      <Card.Section p="md">
+        <Group mb="md" align="flex-end">
+          <NumberInput
+            label="Episode #"
+            min={1}
+            max={season.episodes.length || undefined}
+            value={episodeNum}
+            onChange={handleEpisodeChange}
+            w={120}
+          />
+          <Button
+            variant="light"
+            leftSection={<IconCopy size={16} />}
+            onClick={handleCopyPreviousEpisode}
+            disabled={episodeNum <= 1 || !assignments[String(episodeNum - 1)]}
+          >
+            Copy from Ep {episodeNum - 1}
+          </Button>
+          <Button
+            variant="filled"
+            leftSection={<IconDeviceFloppy size={16} />}
+            onClick={handleSave}
+            loading={saving}
+          >
+            Save
+          </Button>
+        </Group>
+
+        {isMergeEpisode && (
+          <Alert
+            icon={<IconAlertCircle />}
+            title="Merge Episode"
+            color="orange"
+            mb="md"
+          >
+            <Group>
+              <Text size="sm">
+                This is a merge/post-merge episode. Players typically have no
+                team.
+              </Text>
+              <Button
+                size="xs"
+                variant="light"
+                color="orange"
+                onClick={handleMoveAllToNoTeam}
+              >
+                Move all to No Team
+              </Button>
+            </Group>
+          </Alert>
+        )}
+
+        {assignments[String(episodeNum)] && !localAssignments && (
+          <Alert color="green" mb="md">
+            <Text size="sm">
+              Saved assignments loaded for episode {episodeNum}.
+            </Text>
+          </Alert>
+        )}
+
+        {localAssignments && (
+          <Alert color="yellow" mb="md">
+            <Text size="sm">You have unsaved changes.</Text>
+          </Alert>
+        )}
+
+        <DndContext
+          sensors={sensors}
+          collisionDetection={closestCenter}
+          onDragStart={handleDragStart}
+          onDragOver={handleDragOver}
+          onDragEnd={handleDragEnd}
+        >
+          <SimpleGrid cols={{ base: 1, sm: 2, md: teamList.length + 1 }}>
+            {teamList.map((team) => (
+              <DroppableColumn
+                key={team.id}
+                id={team.id}
+                title={team.name}
+                color={team.color}
+                players={playersByContainer[team.id] || []}
+              />
+            ))}
+            <DroppableColumn
+              id={NO_TEAM_ID}
+              title="No Team"
+              color={null}
+              players={playersByContainer[NO_TEAM_ID] || []}
+            />
+          </SimpleGrid>
+
+          <DragOverlay>
+            {activePlayer ? (
+              <PlayerDragOverlay playerName={activePlayer} />
+            ) : null}
+          </DragOverlay>
+        </DndContext>
+      </Card.Section>
+    </Card>
+  );
+};
diff --git a/src/components/Teams/index.ts b/src/components/Teams/index.ts
new file mode 100644
index 0000000..5fb9d56
--- /dev/null
+++ b/src/components/Teams/index.ts
@@ -0,0 +1,3 @@
+export * from "./CreateTeam";
+export * from "./TeamCRUDTable";
+export * from "./TeamPlayerManager";
diff --git a/src/data/season_50/index.ts b/src/data/season_50/index.ts
index 5919331..86813e0 100644
--- a/src/data/season_50/index.ts
+++ b/src/data/season_50/index.ts
@@ -52,28 +52,49 @@ const buildPlayer = <T extends PlayerName>(
 const IMG = "/images/season_50";
 
 export const SEASON_50_PLAYERS = [
-  buildPlayer("Jenna Lewis-Dougherty", `${IMG}/Survivor-50-Cast-Jenna-Lewis-Dougherty.jpg`),
+  buildPlayer(
+    "Jenna Lewis-Dougherty",
+    `${IMG}/Survivor-50-Cast-Jenna-Lewis-Dougherty.jpg`,
+  ),
   buildPlayer("Colby Donaldson", `${IMG}/Survivor-50-Cast-Colby-Donaldson.jpg`),
-  buildPlayer("Stephenie LaGrossa Kendrick", `${IMG}/Survivor-50-Cast-Stephenie-Lagrossa-Kendrick.jpg`),
+  buildPlayer(
+    "Stephenie LaGrossa Kendrick",
+    `${IMG}/Survivor-50-Cast-Stephenie-Lagrossa-Kendrick.jpg`,
+  ),
   buildPlayer("Cirie Fields", `${IMG}/Survivor-50-Cast-Cirie-Fields.jpg`),
   buildPlayer("Ozzy Lusth", `${IMG}/Survivor-50-Cast-Ozzy-Lusth.jpg`),
-  buildPlayer('Benjamin "Coach" Wade', `${IMG}/Survivor-50-Cast-Benjamin-Coach-Wade.jpg`),
+  buildPlayer(
+    'Benjamin "Coach" Wade',
+    `${IMG}/Survivor-50-Cast-Benjamin-Coach-Wade.jpg`,
+  ),
   buildPlayer("Aubry Bracco", `${IMG}/Survivor-50-Cast-Aubry-Bracco.jpg`),
   buildPlayer("Chrissy Hofbeck", `${IMG}/Survivor-50-Cast-Chrissy-Hofbeck.jpg`),
-  buildPlayer("Christian Hubicki", `${IMG}/Survivor-50-Cast-Christian-Hubicki.jpg`),
+  buildPlayer(
+    "Christian Hubicki",
+    `${IMG}/Survivor-50-Cast-Christian-Hubicki.jpg`,
+  ),
   buildPlayer("Angelina Keeley", `${IMG}/Survivor-50-Cast-Angelina-Keeley.jpg`),
   buildPlayer("Mike White", `${IMG}/Survivor-50-Cast-Mike-White.jpg`),
   buildPlayer("Rick Devens", `${IMG}/Survivor-50-Cast-Rick-Devens.jpg`),
   buildPlayer("Jonathan Young", `${IMG}/Survivor-50-Cast-Jonathan-Young.jpg`),
   buildPlayer("Emily Flippen", `${IMG}/Survivor-50-Cast-Emily-Flippen.jpg`),
   buildPlayer("Dee Valladares", `${IMG}/Survivor-50-Cast-Dee-Valladres.jpg`),
-  buildPlayer('Quintavius "Q" Burdette', `${IMG}/Survivor-50-Cast-Q-Burdette.jpg`),
+  buildPlayer(
+    'Quintavius "Q" Burdette',
+    `${IMG}/Survivor-50-Cast-Q-Burdette.jpg`,
+  ),
   buildPlayer("Charlie Davis", `${IMG}/Survivor-50-Cast-Charlie-Davis.jpg`),
   buildPlayer("Tiffany Ervin", `${IMG}/Survivor-50-Cast-Tiffany-Ervin.jpg`),
-  buildPlayer("Genevieve Mushaluk", `${IMG}/Survivor-50-Cast-Genevieve-Mushaluk.jpg`),
+  buildPlayer(
+    "Genevieve Mushaluk",
+    `${IMG}/Survivor-50-Cast-Genevieve-Mushaluk.jpg`,
+  ),
   buildPlayer("Kyle Fraser", `${IMG}/Survivor-50-Cast-Kyle-Fraser.jpg`),
   buildPlayer("Joe Hunter", `${IMG}/Survivor-50-Cast-Joe-Hunter.jpg`),
-  buildPlayer("Kamilla Karthigesu", `${IMG}/Survivor-50-Cast-Kamilla-Karthigesu.jpg`),
+  buildPlayer(
+    "Kamilla Karthigesu",
+    `${IMG}/Survivor-50-Cast-Kamilla-Karthigesu.jpg`,
+  ),
   buildPlayer("Savannah Louie", `${IMG}/Survivor-50-Cast-Savannah-Louie.jpg`),
   buildPlayer("Rizo Velovic", `${IMG}/Survivor-50-Cast-Rizo-Velovic.jpg`),
 ] satisfies Player<PlayerName, SeasonNumber>[];
diff --git a/src/hooks/useTeamAssignments.ts b/src/hooks/useTeamAssignments.ts
new file mode 100644
index 0000000..362a022
--- /dev/null
+++ b/src/hooks/useTeamAssignments.ts
@@ -0,0 +1,23 @@
+import { doc, onSnapshot } from "firebase/firestore";
+import { useEffect, useState } from "react";
+import { db } from "../firebase";
+import { Season, TeamAssignments } from "../types";
+
+export const useTeamAssignments = (seasonId?: Season["id"]) => {
+  const [data, setData] = useState<TeamAssignments>({});
+
+  useEffect(() => {
+    if (!seasonId) return;
+
+    const ref = doc(db, "team_assignments", seasonId);
+
+    const unsub = onSnapshot(ref, (doc) => {
+      const _data = doc.data() ?? {};
+      setData(_data);
+    });
+
+    return () => unsub();
+  }, [seasonId]);
+
+  return { data };
+};
diff --git a/src/hooks/useTeams.ts b/src/hooks/useTeams.ts
new file mode 100644
index 0000000..c67a628
--- /dev/null
+++ b/src/hooks/useTeams.ts
@@ -0,0 +1,23 @@
+import { doc, onSnapshot } from "firebase/firestore";
+import { useEffect, useState } from "react";
+import { db } from "../firebase";
+import { Season, Team } from "../types";
+
+export const useTeams = (seasonId?: Season["id"]) => {
+  const [data, setData] = useState<Record<Team["id"], Team>>({});
+
+  useEffect(() => {
+    if (!seasonId) return;
+
+    const ref = doc(db, "teams", seasonId);
+
+    const unsub = onSnapshot(ref, (doc) => {
+      const _data = doc.data() ?? {};
+      setData(_data);
+    });
+
+    return () => unsub();
+  }, [seasonId]);
+
+  return { data };
+};
diff --git a/src/pages/SeasonAdmin.tsx b/src/pages/SeasonAdmin.tsx
index 15101d0..0045abc 100644
--- a/src/pages/SeasonAdmin.tsx
+++ b/src/pages/SeasonAdmin.tsx
@@ -4,6 +4,7 @@ import {
   IconKarate,
   IconList,
   IconUserX,
+  IconUsersGroup,
 } from "@tabler/icons-react";
 import { ChallengeCRUDTable, CreateChallenge } from "../components/Challenges";
 import {
@@ -12,6 +13,11 @@ import {
 } from "../components/Eliminations";
 import { CreateEpisode, EpisodeCRUDTable } from "../components/Episodes";
 import { CreateGameEvent, GameEventsCRUDTable } from "../components/GameEvents";
+import {
+  CreateTeam,
+  TeamCRUDTable,
+  TeamPlayerManager,
+} from "../components/Teams";
 import { useUser } from "../hooks/useUser";
 
 export const SeasonAdmin = () => {
@@ -52,6 +58,12 @@ export const SeasonAdmin = () => {
           >
             Eliminations
           </Tabs.Tab>
+          <Tabs.Tab
+            value="teams"
+            leftSection={<IconUsersGroup style={iconStyle} />}
+          >
+            Teams
+          </Tabs.Tab>
         </Tabs.List>
 
         <Tabs.Panel value="episodes" pt={"lg"}>
@@ -84,6 +96,14 @@ export const SeasonAdmin = () => {
             <EliminationCRUDTable />
           </Stack>
         </Tabs.Panel>
+
+        <Tabs.Panel value="teams" pt={"lg"}>
+          <Stack gap={"xl"}>
+            <CreateTeam />
+            <TeamCRUDTable />
+            <TeamPlayerManager />
+          </Stack>
+        </Tabs.Panel>
       </Tabs>
     </div>
   );
diff --git a/src/pages/Seasons.tsx b/src/pages/Seasons.tsx
index 5506f55..49336ff 100644
--- a/src/pages/Seasons.tsx
+++ b/src/pages/Seasons.tsx
@@ -37,7 +37,12 @@ export const Seasons = () => {
       <SimpleGrid cols={3}>
         {seasons?.map((x) => {
           console.log(x.name);
-          if (x.name !== "Survivor 46" && x.name !== "Survivor 50" && !slimUser?.isAdmin) return null;
+          if (
+            x.name !== "Survivor 46" &&
+            x.name !== "Survivor 50" &&
+            !slimUser?.isAdmin
+          )
+            return null;
 
           return (
             <div key={x.id}>
diff --git a/src/types/index.ts b/src/types/index.ts
index 4d2d52b..6070caf 100644
--- a/src/types/index.ts
+++ b/src/types/index.ts
@@ -59,6 +59,26 @@ export type Player<PlayerName = string, SeasonNumber = number> = {
   description?: string;
 };
 
+export type Team = {
+  id: `team_${string}`;
+  season_id: Season["id"];
+  season_num: number;
+  name: string;
+  color: string;
+};
+
+/**
+ * A snapshot of player-to-team assignments for a single episode.
+ * Keys are player names, values are team IDs or null (no team).
+ */
+export type TeamAssignmentSnapshot = Record<string, Team["id"] | null>;
+
+/**
+ * All team assignment snapshots for a season.
+ * Keys are episode numbers (as strings, since Firestore keys are strings).
+ */
+export type TeamAssignments = Record<string, TeamAssignmentSnapshot>;
+
 export type Challenge<PlayerNames = string, SeasonNumber = number> = {
   id: `challenge_${string}`;
 
@@ -75,6 +95,12 @@ export type Challenge<PlayerNames = string, SeasonNumber = number> = {
    * List of player names who won
    */
   winning_players: PlayerNames[];
+
+  /**
+   * Optional: the team that won this challenge.
+   * Audit/display metadata only -- winning_players is the scoring source of truth.
+   */
+  winning_team_id?: Team["id"] | null;
 };
 
 export type SlimUser = Pick<User, "email" | "uid" | "displayName"> & {
diff --git a/src/utils/teamUtils.ts b/src/utils/teamUtils.ts
new file mode 100644
index 0000000..af12796
--- /dev/null
+++ b/src/utils/teamUtils.ts
@@ -0,0 +1,16 @@
+import { Team, TeamAssignmentSnapshot } from "../types";
+
+export const getPlayersOnTeam = (
+  snapshot: TeamAssignmentSnapshot,
+  teamId: Team["id"],
+): string[] =>
+  Object.entries(snapshot)
+    .filter(([, tid]) => tid === teamId)
+    .map(([name]) => name);
+
+export const getUnassignedPlayers = (
+  snapshot: TeamAssignmentSnapshot,
+): string[] =>
+  Object.entries(snapshot)
+    .filter(([, tid]) => tid === null)
+    .map(([name]) => name);
diff --git a/yarn.lock b/yarn.lock
index 868174d..6b7f696 100644
--- a/yarn.lock
+++ b/yarn.lock
@@ -227,6 +227,37 @@
     "@babel/helper-validator-identifier" "^7.22.20"
     to-fast-properties "^2.0.0"
 
+"@dnd-kit/accessibility@^3.1.1":
+  version "3.1.1"
+  resolved "https://registry.yarnpkg.com/@dnd-kit/accessibility/-/accessibility-3.1.1.tgz#3b4202bd6bb370a0730f6734867785919beac6af"
+  integrity sha512-2P+YgaXF+gRsIihwwY1gCsQSYnu9Zyj2py8kY5fFvUM1qm2WA2u639R6YNVfU4GWr+ZM5mqEsfHZZLoRONbemw==
+  dependencies:
+    tslib "^2.0.0"
+
+"@dnd-kit/core@^6.3.1":
+  version "6.3.1"
+  resolved "https://registry.yarnpkg.com/@dnd-kit/core/-/core-6.3.1.tgz#4c36406a62c7baac499726f899935f93f0e6d003"
+  integrity sha512-xkGBRQQab4RLwgXxoqETICr6S5JlogafbhNsidmrkVv2YRs5MLwpjoF2qpiGjQt8S9AoxtIV603s0GIUpY5eYQ==
+  dependencies:
+    "@dnd-kit/accessibility" "^3.1.1"
+    "@dnd-kit/utilities" "^3.2.2"
+    tslib "^2.0.0"
+
+"@dnd-kit/sortable@^10.0.0":
+  version "10.0.0"
+  resolved "https://registry.yarnpkg.com/@dnd-kit/sortable/-/sortable-10.0.0.tgz#1f9382b90d835cd5c65d92824fa9dafb78c4c3e8"
+  integrity sha512-+xqhmIIzvAYMGfBYYnbKuNicfSsk4RksY2XdmJhT+HAC01nix6fHCztU68jooFiMUB01Ky3F0FyOvhG/BZrWkg==
+  dependencies:
+    "@dnd-kit/utilities" "^3.2.2"
+    tslib "^2.0.0"
+
+"@dnd-kit/utilities@^3.2.2":
+  version "3.2.2"
+  resolved "https://registry.yarnpkg.com/@dnd-kit/utilities/-/utilities-3.2.2.tgz#5a32b6af356dc5f74d61b37d6f7129a4040ced7b"
+  integrity sha512-+MKAJEOfaBe5SmV6t34p80MMKhjvUz0vRrvVJbPT0WElzaOJ/1xs+D+KDv+tD/NE5ujfrChEcshd4fLn0wpiqg==
+  dependencies:
+    tslib "^2.0.0"
+
 "@esbuild/aix-ppc64@0.19.12":
   version "0.19.12"
   resolved "https://registry.yarnpkg.com/@esbuild/aix-ppc64/-/aix-ppc64-0.19.12.tgz#d1bc06aedb6936b3b6d313bf809a5a40387d2b7f"

```

## Your Task
Review the implementation diff against the debate decisions. Check:
1. Were all decisions faithfully implemented?
2. Are there any bugs, errors, or missing pieces?
3. Does the code follow project conventions?

## Rules
- Respond with YAML frontmatter followed by your review.
- Required frontmatter fields: id, turn, from (must be "codex"), timestamp (ISO-8601), status.
- If the implementation is correct and complete, set status: decided and verdict: approve.
- If fixes are needed, set status: decided and verdict: fix, then describe what needs to change. The implementing agent will get another turn.
- The verdict field is REQUIRED when status is decided. Must be either "approve" or "fix".
- Be specific about what's wrong and how to fix it.
- Do NOT include anything before the opening --- of the frontmatter.
- Use ASCII-safe punctuation only. Use - or -- instead of em-dashes or en-dashes. Do not use Unicode special characters.
- Paths under `.def/` (sessions, worktrees, artifacts) and gitignored `docs/` directories are ephemeral session artifacts -- not authoritative project source. The canonical codebase is the tracked files in the working directory. When referencing code, use repo-relative paths, not absolute `.def/worktrees/...` paths.

## Session Brief
**Topic:** I want to have the ability to add players to teams. There are often two to three teams in play in Survivor, and later in the season there are no teams. I think a drag-and-drop interface would be best. I'd like to have an admin panel to manage teams. I should be able to create teams. I should have a CRUD panel for teams and then a drag-and-drop interface to move players from team to team. Keep in mind there needs to be a 'no team' option for when the tribes emerge. I'd like the ability for events, challenges, et cetera to be able to select a winning team, which would automatically give the correct points to each player on that team.
**Mode:** edit
**Phase:** review


## Prior Turns
---
id: turn-0001-claude
turn: 1
from: claude
timestamp: '2026-03-29T20:54:36.123Z'
status: complete
phase: plan
duration_ms: 193363
decisions:
  - 'Store tribes in a separate Firestore doc per season (tribes/{seasonId}) matching the challenges/eliminations/events pattern'
  - 'Tribe assignments are episode-scoped -- a player''s tribe can change per episode (swaps, merge, etc)'
  - 'Use @dnd-kit/core + @dnd-kit/sortable for drag-and-drop (modern, well-maintained, React 18 compatible)'
  - Add a 'winning_tribe' optional field to Challenge rather than creating a new entity
  - Add a Tribes tab to the existing SeasonAdmin page following the established tab pattern
model_tier: full
model_name: opus
---
# Teams/Tribes Feature -- Implementation Plan

## 1. Data Model

### New Type: `Tribe`

```typescript
// src/types/index.ts

export type Tribe = {
  id: `tribe_${string}`;
  season_id: Season["id"];
  season_num: number;
  name: string;        // e.g. "Luvu", "Yase"
  color: string;       // hex color for UI display
};

export type TribeAssignment = {
  id: `tribe_assignment_${string}`;
  season_id: Season["id"];
  tribe_id: Tribe["id"] | null;  // null = no tribe (post-merge or unassigned)
  player_name: string;
  effective_episode: number;      // assignment takes effect from this episode onward
};
```

**Why episode-scoped assignments instead of a flat player-to-tribe map:**
In Survivor, tribe swaps happen mid-season (sometimes multiple times). A player might be on Luvu in episodes 1-4, swapped to Yase in episodes 5-8, then merged (no tribe) from episode 9 onward. The `effective_episode` pattern means you only store the *transitions* -- a player stays on their tribe until a new assignment overrides it. This is simpler than storing a full matrix of player x episode.

### Storage: `tribes/{seasonId}` and `tribe_assignments/{seasonId}`

Following the existing pattern where `challenges/{seasonId}`, `eliminations/{seasonId}`, and `events/{seasonId}` each store a `Record<id, entity>` in a single Firestore document per season:

- **`tribes/{seasonId}`** -- `Record<Tribe["id"], Tribe>` -- the tribe definitions
- **`tribe_assignments/{seasonId}`** -- `Record<TribeAssignment["id"], TribeAssignment>` -- which player is on which tribe as of which episode

This is consistent with how `useChallenges` at `src/hooks/useChallenges.ts:27-45` works -- single doc, `onSnapshot`, `Record<id, entity>`.

### Extending Challenge for Team Wins

```typescript
// Add to existing Challenge type in src/types/index.ts
export type Challenge<PlayerNames = string, SeasonNumber = number> = {
  // ... existing fields ...
  winning_tribe_id?: Tribe["id"] | null;  // NEW: optional tribe winner
};
```

When `winning_tribe_id` is set on a challenge, the scoring engine resolves it to the players on that tribe at that episode, and `winning_players` gets populated automatically (or validated against). This gives the admin the choice: enter individual winners OR pick a winning tribe.

## 2. New Hooks

### `useTribes(seasonId?)` -- mirrors `useChallenges`

```
src/hooks/useTribes.ts
```
Pattern: `onSnapshot` on `doc(db, "tribes", seasonId)`, returns `Record<Tribe["id"], Tribe>`. Identical structure to `useChallenges` at `src/hooks/useChallenges.ts:27-45`.

### `useTribeAssignments(seasonId?)`

```
src/hooks/useTribeAssignments.ts
```
Same pattern. Returns `Record<TribeAssignment["id"], TribeAssignment>`.

### `usePlayerTribeAtEpisode(assignments, playerName, episodeNum)` -- utility

A pure function (not a hook, actually) that finds the latest `TribeAssignment` for a player where `effective_episode <= episodeNum`, sorted by `effective_episode` descending. Returns the `tribe_id` or `null`.

```typescript
// src/utils/tribeUtils.ts
export const getPlayerTribeAtEpisode = (
  assignments: TribeAssignment[],
  playerName: string,
  episodeNum: number,
): Tribe["id"] | null => {
  const playerAssignments = assignments
    .filter(a => a.player_name === playerName && a.effective_episode <= episodeNum)
    .sort((a, b) => b.effective_episode - a.effective_episode);
  return playerAssignments[0]?.tribe_id ?? null;
};

export const getPlayersOnTribe = (
  assignments: TribeAssignment[],
  tribeId: Tribe["id"],
  episodeNum: number,
  allPlayerNames: string[],
): string[] => {
  return allPlayerNames.filter(
    name => getPlayerTribeAtEpisode(assignments, name, episodeNum) === tribeId
  );
};
```

## 3. Scoring Integration

In `src/utils/scoringUtils.ts`, the `getEnhancedSurvivorPoints` function at line 18 processes challenges at line 44-48 by checking `c.winning_players.includes(playerName)`. Two options here:

**Option A (Recommended): Resolve tribe winners at write time.** When the admin selects a winning tribe on a challenge, the `CreateChallenge` form auto-populates `winning_players` with all players on that tribe at that episode. The scoring engine stays unchanged. This is simpler and keeps scoring pure.

**Option B: Resolve at scoring time.** Pass `tribeAssignments` into `getEnhancedSurvivorPoints` and resolve `winning_tribe_id` to players. This means the scoring function needs new parameters and the challenge data alone isn't self-contained.

I recommend **Option A** because it keeps the scoring engine untouched, makes challenge data self-documenting (you can always see who won), and avoids cascading changes through `useScoringCalculations.ts`.

## 4. Admin UI

### 4a. Tribes Tab in SeasonAdmin

Add a fifth tab to `src/pages/SeasonAdmin.tsx` (currently has Episodes, Events, Challenges, Eliminations at lines 28-54):

```
Tabs: Episodes | Events | Challenges | Eliminations | Tribes (NEW)
```

Icon: `IconUsersGroup` from `@tabler/icons-react`.

### 4b. Tribe CRUD Components

```
src/components/Tribes/
  CreateTribe.tsx        -- form: name + color picker
  TribeCRUDTable.tsx     -- table of tribes with delete
  TribePlayerManager.tsx -- drag-and-drop assignment UI
  index.ts
```

**CreateTribe.tsx** follows the pattern of `CreateChallenge` at `src/components/Challenges/CreateChallenge.tsx`:
- Form with `useForm` from `@mantine/form`
- Fields: tribe name (TextInput), color (ColorInput from Mantine)
- Writes to `tribes/{seasonId}` with `setDoc(..., { merge: true })`
- Payload preview via `<Code block>`

**TribeCRUDTable.tsx** -- simple table listing tribes with name, color swatch, and delete button.

### 4c. Drag-and-Drop Player Assignment (TribePlayerManager)

**Library: `@dnd-kit/core` + `@dnd-kit/sortable`**

Rationale:
- `react-beautiful-dnd` is deprecated (Atlassian stopped maintaining it)
- `@dnd-kit` is the modern standard, has excellent React 18 support, accessible by default, and handles the "multiple droppable containers" pattern well
- Mantine does not ship its own DnD

**UI Layout:**

```
[Episode Selector: NumberInput or Select]

+-------------+  +-------------+  +-------------+  +------------------+
|  Tribe Luvu  |  | Tribe Yase  |  | Tribe Vati  |  |    No Tribe      |
|  (blue)      |  |  (yellow)   |  |  (green)    |  |  (unassigned)    |
|              |  |             |  |             |  |                  |
|  [Player A]  |  |  [Player D] |  |  [Player G] |  |                  |
|  [Player B]  |  |  [Player E] |  |  [Player H] |  |                  |
|  [Player C]  |  |  [Player F] |  |  [Player I] |  |                  |
+-------------+  +-------------+  +-------------+  +------------------+

                    [Save Assignments]
```

- Each tribe is a **droppable container** (including "No Tribe")
- Each player card is a **draggable item**
- Episode selector at the top controls which episode's assignments you're viewing/editing
- "Save Assignments" writes `TribeAssignment` records for the selected episode
- **Copy from previous episode** button for convenience -- pre-populates from the prior episode's state so the admin only moves swapped players
- Player cards show avatar + name (using existing `Player.img` field)

### 4d. Challenge Form Enhancement

In `src/components/Challenges/CreateChallenge.tsx`, add an optional "Winning Tribe" select above the "Winning Players" multi-select. When a tribe is selected:

1. Auto-populate `winning_players` with all players on that tribe at the challenge's episode
2. Set `winning_tribe_id` on the challenge
3. The admin can still manually override `winning_players` if needed (e.g., a player sat out)

## 5. New Dependency

```
yarn add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

That is the only new dependency. Mantine's `ColorInput` is already available in `@mantine/core@^7.8.0`.

## 6. Files to Create

| File | Purpose |
|------|---------|
| `src/types/index.ts` | Add `Tribe`, `TribeAssignment` types; extend `Challenge` |
| `src/hooks/useTribes.ts` | Firestore hook for tribes |
| `src/hooks/useTribeAssignments.ts` | Firestore hook for tribe assignments |
| `src/utils/tribeUtils.ts` | `getPlayerTribeAtEpisode`, `getPlayersOnTribe` |
| `src/components/Tribes/CreateTribe.tsx` | Tribe CRUD form |
| `src/components/Tribes/TribeCRUDTable.tsx` | Tribe list table |
| `src/components/Tribes/TribePlayerManager.tsx` | DnD assignment UI |
| `src/components/Tribes/index.ts` | Barrel export |

## 7. Files to Modify

| File | Change |
|------|--------|
| `src/pages/SeasonAdmin.tsx` | Add Tribes tab (line 28+) |
| `src/components/Challenges/CreateChallenge.tsx` | Add optional winning tribe selector |
| `src/types/index.ts` | New types + Challenge extension |
| `package.json` | Add `@dnd-kit/*` |

## 8. Implementation Order

1. **Types** -- add `Tribe`, `TribeAssignment`, extend `Challenge`
2. **Hooks** -- `useTribes`, `useTribeAssignments`
3. **Utility** -- `tribeUtils.ts`
4. **Tribe CRUD** -- `CreateTribe`, `TribeCRUDTable`
5. **Tribe tab** -- wire into `SeasonAdmin.tsx`
6. **DnD assignment** -- `TribePlayerManager` (most complex piece)
7. **Challenge integration** -- winning tribe selector in `CreateChallenge`

## Open Questions for Discussion

1. **Should tribe color be a free-form hex input or a predefined palette?** Survivor tribes have canonical colors, so a predefined palette (red, blue, green, yellow, purple, orange) might be more user-friendly than a free color picker. But the hex input is more flexible.

2. **Do we need tribe-based scoring rules beyond challenge wins?** E.g., "team reward" giving partial points. The current scoring in `src/data/scoring.ts` is all individual -- is the ask limited to "winning tribe on a challenge auto-resolves to member players," or are there tribe-specific scoring actions to add?

3. **Should the "No Tribe" pool be visible after merge?** Once `merge_occurs` is true on an episode, all players are effectively unassigned. Should the UI auto-move everyone to "No Tribe" at the merge episode, or should the admin manually do it?


---
id: turn-0002-codex
turn: 2
from: codex
timestamp: '2026-03-29T20:56:27.079Z'
status: complete
phase: plan
duration_ms: 110950
decisions:
  - Keep `Challenge.winning_players` as the scoring source of truth and derive it from team membership at admin write time
  - 'Add a new season-scoped team assignments document, but model assignments as episode snapshots rather than open-ended effective ranges'
  - Add a `teams` tab to `SeasonAdmin` instead of a separate admin route
model_tier: full
model_name: gpt-5.4
---
# Team Feature Plan Review

Claude's plan is close, but I would push back on one core assumption: `effective_episode` range-based assignments are not the best primary storage model for this codebase.

## What the repo actually supports today

- `SeasonAdmin` is a single tabbed admin surface, so adding a `Teams` tab is the least disruptive extension point at [src/pages/SeasonAdmin.tsx:17](src/pages/SeasonAdmin.tsx#L17) through [src/pages/SeasonAdmin.tsx:90](src/pages/SeasonAdmin.tsx#L90).
- Scoring only reads `Challenge.winning_players`; there is no team concept anywhere in scoring. The key path is [src/utils/scoringUtils.ts:18](src/utils/scoringUtils.ts#L18) through [src/utils/scoringUtils.ts:48](src/utils/scoringUtils.ts#L48), and that is wired into the rest of the app via [src/hooks/useScoringCalculations.ts:14](src/hooks/useScoringCalculations.ts#L14) through [src/hooks/useScoringCalculations.ts:44](src/hooks/useScoringCalculations.ts#L44).
- `CreateChallenge` already builds and persists the full winner list in one place, which makes it the correct integration point for auto-populating team winners instead of teaching scoring about teams. See [src/components/Challenges/CreateChallenge.tsx:33](src/components/Challenges/CreateChallenge.tsx#L33) through [src/components/Challenges/CreateChallenge.tsx:100](src/components/Challenges/CreateChallenge.tsx#L100).
- The existing CRUD pattern is lightweight Firestore document writes per season for challenges/events/eliminations, so a separate `teams/{seasonId}` style document is consistent with [src/hooks/useChallenges.ts:24](src/hooks/useChallenges.ts#L24) through [src/hooks/useChallenges.ts:38](src/hooks/useChallenges.ts#L38).

## Where I disagree with Claude

### 1. Use episode snapshots, not effective ranges

If the admin UI is "drag players between team columns for episode N", the storage should reflect exactly that action.

Claude proposed transition records like:

- player X moves to tribe Y starting episode 5

That is compact, but it creates extra resolution logic everywhere:
- challenge form has to compute current assignment from historical transitions
- the DnD screen has to reconstruct state before edits
- deletes and corrections become more error-prone because one bad transition can corrupt all later episodes

A better fit here is:

- `teams/{seasonId}`: team definitions
- `team_assignments/{seasonId}`: `Record<episodeId, Record<playerName, teamId | null>>`

That matches the actual admin mental model:
- choose episode
- drag roster into 2-3 teams or "No Team"
- save snapshot

It also handles merge cleanly:
- for the merge episode and later, snapshot all players to `null`

You can still add a "Copy previous episode" button in the UI, but that becomes a UI convenience instead of the persistence model.

### 2. Do not make scoring resolve teams at read time

Claude already leaned toward write-time resolution, and I think that should be a firm decision, not an option.

Given [src/hooks/useScoringCalculations.ts:23](src/hooks/useScoringCalculations.ts#L23) through [src/hooks/useScoringCalculations.ts:44](src/hooks/useScoringCalculations.ts#L44), read-time team resolution would require:
- new hook(s) in scoring
- new dependencies in memo inputs
- backfilling team logic into every score computation path

That is unnecessary coupling. The challenge record should remain self-contained:
- `winning_players` stays required
- optional `winning_team_id` can be stored for audit/display
- admin form auto-fills `winning_players` from the episode snapshot

That keeps [src/utils/scoringUtils.ts:44](src/utils/scoringUtils.ts#L44) through [src/utils/scoringUtils.ts:47](src/utils/scoringUtils.ts#L47) unchanged.

### 3. Be careful with "No Team"

I would not model "No Team" as a fake team record. Make it `null` in assignment data and in `winning_team_id`. That avoids:
- polluting CRUD with a non-deletable pseudo-team
- special-case display bugs when someone edits or deletes it
- treating merge as just another tribe

In the UI, render a fixed "No Team" drop zone. In data, use `null`.

## Proposed concrete shape

In [src/types/index.ts](src/types/index.ts):

- add `Team`
- add `EpisodeTeamAssignments`
- extend `Challenge` with optional `winning_team_id?: Team["id"] | null`

Suggested direction:

- `Team`: `id`, `season_id`, `season_num`, `name`, `color`, `order`
- `EpisodeTeamAssignments`: `episode_id`, `episode_num`, `assignments: Record<Player["name"], Team["id"] | null>`

I would not add a separate `TribeAssignment` entity per player. That is noisier to write, noisier to diff, and a worse match for drag-and-drop saves.

## Implementation outline I would hand to the implementer

1. Add types in [src/types/index.ts](src/types/index.ts).
2. Add `useTeams` and `useTeamAssignments` hooks mirroring [src/hooks/useChallenges.ts](src/hooks/useChallenges.ts).
3. Add a `Teams` admin tab in [src/pages/SeasonAdmin.tsx](src/pages/SeasonAdmin.tsx).
4. Add team CRUD components following the table/edit pattern already used in [src/components/Episodes/EpisodeCRUDTable.tsx](src/components/Episodes/EpisodeCRUDTable.tsx) and [src/components/Challenges/ChallengeCRUDTable.tsx](src/components/Challenges/ChallengeCRUDTable.tsx).
5. Add DnD team assignment UI for a selected episode, with:
   - team columns from `teams`
   - fixed `No Team` column
   - load current episode snapshot if present
   - otherwise seed from previous episode snapshot or all `null`
6. Update [src/components/Challenges/CreateChallenge.tsx](src/components/Challenges/CreateChallenge.tsx) to:
   - load assignments for selected episode
   - offer optional `winning_team_id`
   - auto-fill `winning_players`
   - still allow manual edits to `winning_players`
7. Optionally show `winning_team_id` in [src/components/Challenges/ChallengeCRUDTable.tsx](src/components/Challenges/ChallengeCRUDTable.tsx) for admin visibility.

## Decisions I think we should lock now

- Team membership is episode-scoped.
- Persistence should be episode snapshot data, not effective-range transition rows.
- `winning_players` remains authoritative for scoring.
- `winning_team_id` is optional metadata for admin UX and auditability.
- `No Team` is represented as `null`, not a synthetic team record.
- New UI belongs under a `Teams` tab in `SeasonAdmin`.

If Claude agrees with the snapshot model, I would move this to `decided` on the next turn.


---
id: turn-0003-claude
turn: 3
from: claude
timestamp: '2026-03-29T20:57:48.700Z'
status: decided
phase: plan
duration_ms: 81614
decisions:
  - 'Episode snapshot model wins over effective-range transitions -- simpler admin UX, no resolution logic'
  - 'No Team is null, not a synthetic team record'
  - 'winning_players remains the scoring source of truth, populated at write time from team membership'
  - winning_team_id is optional audit metadata on Challenge
  - 'Teams tab in SeasonAdmin, not a separate route'
  - Use @dnd-kit/core + @dnd-kit/sortable for drag-and-drop
  - Team color is a free-form ColorInput (hex) -- admins know Survivor tribe colors
model_tier: full
model_name: opus
---
# Turn 3 -- Accepting Snapshot Model, Finalizing Plan

Codex is right on the snapshot model. I concede.

## Why snapshots win

After re-reading the codebase, every Firestore pattern here is "one document, `Record<id, entity>`" with simple key lookups. The effective-range model I proposed would be the only place in the app that requires temporal resolution logic (find the latest assignment where `effective_episode <= N`). That is conceptual overhead this codebase does not need.

The snapshot model -- `Record<episodeNum, Record<playerName, teamId | null>>` -- maps 1:1 to the admin action: pick an episode, drag players into columns, save. No resolution, no sorting, no edge cases from overlapping ranges.

## Agreed Decisions

All of Codex's pushbacks land. Here is the locked plan:

### Data Model

In `src/types/index.ts`:

```typescript
export type Team = {
  id: `team_${string}`;
  season_id: Season["id"];
  season_num: number;
  name: string;
  color: string;       // hex, e.g. "#3B82F6"
};

// Stored in team_assignments/{seasonId}
// Key is episode number (as string, since Firestore keys are strings)
// Value is a map of player name -> team ID or null
export type TeamAssignmentSnapshot = Record<string, Team["id"] | null>;
export type TeamAssignments = Record<string, TeamAssignmentSnapshot>;
```

Extend `Challenge`:

```typescript
export type Challenge<PlayerNames = string, SeasonNumber = number> = {
  // ... existing fields unchanged ...
  winning_team_id?: Team["id"] | null;  // optional audit/display field
};
```

Firestore documents:
- `teams/{seasonId}` -- `Record<Team["id"], Team>`
- `team_assignments/{seasonId}` -- `Record<episodeNumString, Record<playerName, Team["id"] | null>>`

### Hooks

**`src/hooks/useTeams.ts`** -- mirrors `useChallenges` at `src/hooks/useChallenges.ts:27-45`:
```typescript
export const useTeams = (seasonId?: Season["id"]) => {
  const [data, setData] = useState<Record<Team["id"], Team>>({});
  // onSnapshot on doc(db, "teams", seasonId)
  return { data };
};
```

**`src/hooks/useTeamAssignments.ts`** -- same pattern:
```typescript
export const useTeamAssignments = (seasonId?: Season["id"]) => {
  const [data, setData] = useState<TeamAssignments>({});
  // onSnapshot on doc(db, "team_assignments", seasonId)
  return { data };
};
```

### Utility Functions

**`src/utils/teamUtils.ts`** -- lightweight helpers, not temporal resolution:

```typescript
export const getPlayersOnTeam = (
  snapshot: TeamAssignmentSnapshot,
  teamId: Team["id"],
): string[] =>
  Object.entries(snapshot)
    .filter(([_, tid]) => tid === teamId)
    .map(([name]) => name);

export const getUnassignedPlayers = (
  snapshot: TeamAssignmentSnapshot,
): string[] =>
  Object.entries(snapshot)
    .filter(([_, tid]) => tid === null)
    .map(([name]) => name);
```

### Admin UI Components

```
src/components/Teams/
  CreateTeam.tsx           -- name + ColorInput form
  TeamCRUDTable.tsx        -- table with name, color swatch, delete
  TeamPlayerManager.tsx    -- DnD episode-scoped assignment UI
  index.ts                 -- barrel export
```

**CreateTeam.tsx** follows `CreateChallenge` pattern:
- `useForm` from `@mantine/form`
- Fields: name (TextInput), color (ColorInput)
- Writes to `teams/{seasonId}` with `setDoc(..., { merge: true })`

**TeamCRUDTable.tsx** follows `ChallengeCRUDTable` pattern at `src/components/Challenges/ChallengeCRUDTable.tsx`:
- Table with columns: Name, Color (swatch), Delete
- Inline edit for name/color would be nice but not required for v1
- Delete via `modals.openConfirmModal` like existing CRUD tables

**TeamPlayerManager.tsx** -- the main DnD surface:
- Episode selector (NumberInput or Select from season episodes)
- One droppable column per team + one fixed "No Team" column
- Draggable player cards (name + optional avatar)
- "Copy from previous episode" button -- loads snapshot from `episodeNum - 1` as starting state
- "Save" button writes the entire snapshot for that episode to `team_assignments/{seasonId}`
- When the selected episode has `merge_occurs: true` or `post_merge: true`, show a hint/button to move all players to No Team

### SeasonAdmin Integration

Add a fifth tab to `src/pages/SeasonAdmin.tsx:28-55`:

```tsx
<Tabs.Tab value="teams" leftSection={<IconUsersGroup style={iconStyle} />}>
  Teams
</Tabs.Tab>

// ...

<Tabs.Panel value="teams" pt={"lg"}>
  <Stack gap={"xl"}>
    <CreateTeam />
    <TeamCRUDTable />
    <TeamPlayerManager />
  </Stack>
</Tabs.Panel>
```

### Challenge Form Integration

In `src/components/Challenges/CreateChallenge.tsx`, above the existing `MultiSelect` for winning players at line 142:

1. Add a `Select` for "Winning Team" populated from `useTeams`
2. When a team is selected, look up the team assignment snapshot for `form.values.episode_num`
3. Auto-populate `winning_players` with `getPlayersOnTeam(snapshot, teamId)`
4. Store `winning_team_id` on the challenge
5. The admin can still manually adjust `winning_players` after auto-fill
6. If no teams exist or episode has no assignments, the select is disabled/hidden

The `winning_players` validation at line 46 (`hasLength({ min: 1 })`) stays unchanged -- the team selection is just a convenience for populating it.

### Scoring -- Zero Changes

`src/utils/scoringUtils.ts:44-47` continues to read `c.winning_players` only. `src/hooks/useScoringCalculations.ts` is untouched. The `winning_team_id` field is never read by scoring.

### New Dependency

```
yarn add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

No other new deps. `ColorInput` is already in `@mantine/core@^7.8.0` (confirmed in `package.json:21`).

### ChallengeCRUDTable Enhancement (Optional)

In `src/components/Challenges/ChallengeCRUDTable.tsx`, add a "Winning Team" column that displays the team name/color when `winning_team_id` is present. Low priority -- can be done in a follow-up.

## Implementation Order

1. Types in `src/types/index.ts` -- `Team`, `TeamAssignmentSnapshot`, `TeamAssignments`, extend `Challenge`
2. Hooks -- `useTeams.ts`, `useTeamAssignments.ts`
3. Utility -- `teamUtils.ts`
4. `CreateTeam.tsx` + `TeamCRUDTable.tsx` -- team CRUD
5. Wire Teams tab into `SeasonAdmin.tsx`
6. `TeamPlayerManager.tsx` -- DnD assignment UI (heaviest piece)
7. `CreateChallenge.tsx` -- add winning team selector

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useTeams.ts` | Firestore realtime hook for teams |
| `src/hooks/useTeamAssignments.ts` | Firestore realtime hook for team assignments |
| `src/utils/teamUtils.ts` | `getPlayersOnTeam`, `getUnassignedPlayers` |
| `src/components/Teams/CreateTeam.tsx` | Team creation form |
| `src/components/Teams/TeamCRUDTable.tsx` | Team list with delete |
| `src/components/Teams/TeamPlayerManager.tsx` | DnD assignment UI |
| `src/components/Teams/index.ts` | Barrel export |

## Files to Modify

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `Team`, `TeamAssignmentSnapshot`, `TeamAssignments`; extend `Challenge` with `winning_team_id` |
| `src/pages/SeasonAdmin.tsx` | Add Teams tab |
| `src/components/Challenges/CreateChallenge.tsx` | Add optional winning team selector |
| `package.json` | Add `@dnd-kit/*` |

## Open Questions -- Resolved

1. **Color picker vs palette** -- Free-form `ColorInput` (hex). Admins know Survivor tribe colors and may want exact matches. Mantine's `ColorInput` has built-in swatches we can pre-populate with common Survivor colors while still allowing custom hex.

2. **Tribe-based scoring beyond challenges** -- Out of scope for v1. The ask is "select a winning team, which gives correct points to each player." That is fully handled by auto-populating `winning_players` at write time. If tribe-specific scoring actions are needed later, that is a separate feature.

3. **Auto-move to No Team at merge** -- The UI will show a hint when `merge_occurs` is true on the selected episode. A "Move all to No Team" convenience button handles it in one click, but the admin still has to explicitly save. No silent auto-mutation.


---
id: turn-0004-codex
turn: 4
from: codex
timestamp: '2026-03-29T20:57:55.440Z'
status: decided
phase: plan
duration_ms: 6734
decisions:
  - 'Teams are episode-scoped snapshots stored per season (teams/{seasonId} + team_assignments/{seasonId})'
  - Winning_team_id is optional metadata; scoring still relies on winning_players populated at write time
  - No Team is represented as null and rendered as a dedicated column
model_tier: fast
model_name: gpt-5.1-codex-mini
---
### Plan Alignment
- **Data** – Add `Team`, `TeamAssignmentSnapshot`, and `TeamAssignments` to `src/types/index.ts`, keep `Challenge.winning_players` authoritative, and add the optional `winning_team_id` metadata referenced by `src/components/Challenges/CreateChallenge.tsx`.
- **Hooks/utilities** – Mirror the existing season-scoped hooks (`useChallenges`) with `useTeams` and `useTeamAssignments`, plus lightweight helpers in `src/utils/teamUtils.ts` to list team members/unassigned players for a snapshot.
- **Admin UI** – Embed a `Teams` tab in `src/pages/SeasonAdmin.tsx` that stacks `CreateTeam`, `TeamCRUDTable`, and the episode-scoped `TeamPlayerManager` drag-and-drop surface built with `@dnd-kit/core` + `@dnd-kit/sortable`. The manager loads/saves snapshots in `team_assignments/{seasonId}`, supports “copy previous episode,” and renders a fixed “No Team” drop zone (null assignments).
- **Challenge integration** – Extend `CreateChallenge.tsx` so the winning team selector fetches the current episode snapshot via `useTeamAssignments`, auto-fills `winning_players`, and persists `winning_team_id` for auditing while still allowing manual overrides.

### Next Checks
1. Confirm `useTeams`/`useTeamAssignments` follow the Firestore `Record<id, entity>` doc pattern already used by `useChallenges.ts`.
2. Ensure `TeamPlayerManager` episode selector aligns with `season.episodes` (or whichever data source drives episode numbers) so “copy previous episode” can find the right snapshot.
3. Verify `CreateChallenge` validation still requires at least one winner even when auto-filled from a team snapshot.

Once those pieces are sketched, we can transition to implementation.


---
id: turn-0005-claude
turn: 5
from: claude
timestamp: '2026-03-29T21:04:36.037Z'
status: complete
phase: implement
duration_ms: 400403
model_tier: full
model_name: opus
---
# Teams/Tribes Feature -- Implementation Complete

## New Dependencies
- `@dnd-kit/core@6.3.1`, `@dnd-kit/sortable@10.0.0`, `@dnd-kit/utilities@3.2.2`

## Files Created

| File | Purpose |
|------|---------|
| `src/hooks/useTeams.ts` | Firestore realtime hook for `teams/{seasonId}` -- mirrors useChallenges pattern |
| `src/hooks/useTeamAssignments.ts` | Firestore realtime hook for `team_assignments/{seasonId}` -- episode-scoped snapshots |
| `src/utils/teamUtils.ts` | `getPlayersOnTeam()` and `getUnassignedPlayers()` helpers |
| `src/components/Teams/CreateTeam.tsx` | Team creation form (name + ColorInput with Survivor swatches) |
| `src/components/Teams/TeamCRUDTable.tsx` | Team list table with color swatch and delete |
| `src/components/Teams/TeamPlayerManager.tsx` | Drag-and-drop player assignment UI with episode selector, copy-from-previous, merge hints |
| `src/components/Teams/index.ts` | Barrel export |

## Files Modified

| File | Change |
|------|--------|
| `src/types/index.ts` | Added `Team`, `TeamAssignmentSnapshot`, `TeamAssignments` types; added optional `winning_team_id` to `Challenge` |
| `src/pages/SeasonAdmin.tsx` | Added Teams tab with CreateTeam, TeamCRUDTable, and TeamPlayerManager |
| `src/components/Challenges/CreateChallenge.tsx` | Added optional "Winning Team" selector that auto-fills `winning_players` from episode snapshot |
| `package.json` / `yarn.lock` | Added @dnd-kit dependencies |

## Key Design Decisions Implemented
- **Episode snapshots** (`Record<episodeNum, Record<playerName, teamId | null>>`) -- not effective ranges
- **No Team = null** -- rendered as a dedicated droppable column, no synthetic team record
- **winning_players remains scoring source of truth** -- `winning_team_id` is optional audit metadata
- **Write-time resolution** -- selecting a winning team auto-fills `winning_players` from the episode's team assignments; scoring engine is untouched


## Your Turn
Respond with YAML frontmatter followed by your markdown response. Required frontmatter fields: id, turn, from, timestamp, status. Optional: decisions (array of strings).