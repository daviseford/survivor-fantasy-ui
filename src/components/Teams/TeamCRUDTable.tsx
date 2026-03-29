import {
  ActionIcon,
  Box,
  Code,
  ColorInput,
  Group,
  Table,
  TableScrollContainer,
  TextInput,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconCheck, IconPencil, IconTrash, IconX } from "@tabler/icons-react";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { db } from "../../firebase";
import { useChallenges } from "../../hooks/useChallenges";
import { useSeason } from "../../hooks/useSeason";
import { useTeamAssignments } from "../../hooks/useTeamAssignments";
import { useTeams } from "../../hooks/useTeams";
import { useUser } from "../../hooks/useUser";
import { Team } from "../../types";

const SURVIVOR_SWATCHES = [
  "#3B82F6",
  "#EF4444",
  "#22C55E",
  "#EAB308",
  "#A855F7",
  "#F97316",
  "#EC4899",
  "#14B8A6",
  "#000000",
];

export const TeamCRUDTable = () => {
  const { data: season } = useSeason();
  const { data: teams } = useTeams(season?.id);
  const { data: assignments } = useTeamAssignments(season?.id);
  const { data: challenges } = useChallenges(season?.id);
  const { slimUser } = useUser();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    name: string;
    color: string;
  } | null>(null);

  const isTeamReferenced = (teamId: Team["id"]): boolean => {
    // Check team assignments
    for (const snapshot of Object.values(assignments)) {
      for (const assignedTeamId of Object.values(snapshot)) {
        if (assignedTeamId === teamId) return true;
      }
    }
    // Check challenges
    for (const challenge of Object.values(challenges)) {
      if (challenge.winning_team_id === teamId) return true;
    }
    return false;
  };

  const handleDelete = async (team: Team) => {
    if (!slimUser?.isAdmin) return;

    if (isTeamReferenced(team.id)) {
      modals.openConfirmModal({
        title: "Team is in use",
        children: (
          <>
            This team is referenced by episode assignments or challenges.
            Deleting it will leave dangling references. Are you sure?
          </>
        ),
        labels: { confirm: "Delete anyway", cancel: "Cancel" },
        confirmProps: { color: "red" },
        onConfirm: async () => {
          await deleteTeam(team);
        },
      });
    } else {
      modals.openConfirmModal({
        title: "Do you want to delete this team?",
        children: <Code block>{JSON.stringify(team, null, 2)}</Code>,
        labels: { confirm: "Delete", cancel: "Cancel" },
        onConfirm: async () => {
          await deleteTeam(team);
        },
      });
    }
  };

  const deleteTeam = async (team: Team) => {
    const ref = doc(db, `teams/${season?.id}`);
    const newTeams = { ...teams };
    delete newTeams[team.id];
    await setDoc(ref, newTeams);
  };

  const startEdit = (team: Team) => {
    setEditingId(team.id);
    setEditValues({ name: team.name, color: team.color });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues(null);
  };

  const saveEdit = async (team: Team) => {
    if (!editValues || !season) return;

    const updated: Team = {
      ...team,
      name: editValues.name,
      color: editValues.color,
    };
    const ref = doc(db, `teams/${season.id}`);
    await setDoc(ref, { [team.id]: updated }, { merge: true });
    setEditingId(null);
    setEditValues(null);
  };

  const rows = Object.values(teams || {}).map((team) => {
    const isEditing = editingId === team.id;

    if (isEditing && editValues) {
      return (
        <Table.Tr key={team.id}>
          <Table.Td>
            <TextInput
              size="xs"
              value={editValues.name}
              onChange={(ev) =>
                setEditValues({ ...editValues, name: ev.target.value })
              }
            />
          </Table.Td>
          <Table.Td>
            <ColorInput
              size="xs"
              format="hex"
              swatches={SURVIVOR_SWATCHES}
              value={editValues.color}
              onChange={(color) => setEditValues({ ...editValues, color })}
            />
          </Table.Td>
          <Table.Td>{team.id}</Table.Td>
          {slimUser?.isAdmin && (
            <Table.Td>
              <Group gap="xs">
                <ActionIcon color="green" onClick={() => saveEdit(team)}>
                  <IconCheck />
                </ActionIcon>
                <ActionIcon color="gray" onClick={cancelEdit}>
                  <IconX />
                </ActionIcon>
              </Group>
            </Table.Td>
          )}
        </Table.Tr>
      );
    }

    return (
      <Table.Tr key={team.id}>
        <Table.Td>{team.name}</Table.Td>
        <Table.Td>
          <Box
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              backgroundColor: team.color,
              border: "1px solid var(--mantine-color-default-border)",
            }}
          />
        </Table.Td>
        <Table.Td>{team.id}</Table.Td>
        {slimUser?.isAdmin && (
          <Table.Td>
            <Group gap="xs">
              <ActionIcon color="blue" onClick={() => startEdit(team)}>
                <IconPencil />
              </ActionIcon>
              <ActionIcon color="red" onClick={() => handleDelete(team)}>
                <IconTrash />
              </ActionIcon>
            </Group>
          </Table.Td>
        )}
      </Table.Tr>
    );
  });

  return (
    <TableScrollContainer minWidth={300}>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Color</Table.Th>
            <Table.Th>ID</Table.Th>
            {slimUser?.isAdmin && <Table.Th>Actions</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </TableScrollContainer>
  );
};
