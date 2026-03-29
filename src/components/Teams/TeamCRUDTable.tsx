import {
  ActionIcon,
  Box,
  Code,
  Table,
  TableScrollContainer,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconTrash } from "@tabler/icons-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useSeason } from "../../hooks/useSeason";
import { useTeams } from "../../hooks/useTeams";
import { useUser } from "../../hooks/useUser";
import { Team } from "../../types";

export const TeamCRUDTable = () => {
  const { data: season } = useSeason();
  const { data: teams } = useTeams(season?.id);
  const { slimUser } = useUser();

  const handleDelete = async (team: Team) => {
    if (!slimUser?.isAdmin) return;

    modals.openConfirmModal({
      title: "Do you want to delete this team?",
      children: <Code block>{JSON.stringify(team, null, 2)}</Code>,
      labels: { confirm: "Delete", cancel: "Cancel" },
      onConfirm: async () => {
        const ref = doc(db, `teams/${season?.id}`);
        const newTeams = { ...teams };
        delete newTeams[team.id];
        await setDoc(ref, newTeams);
      },
    });
  };

  const rows = Object.values(teams || {}).map((team) => (
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
          <ActionIcon color="red" onClick={() => handleDelete(team)}>
            <IconTrash />
          </ActionIcon>
        </Table.Td>
      )}
    </Table.Tr>
  ));

  return (
    <TableScrollContainer minWidth={300}>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Color</Table.Th>
            <Table.Th>ID</Table.Th>
            {slimUser?.isAdmin && <Table.Th>Delete</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </TableScrollContainer>
  );
};
