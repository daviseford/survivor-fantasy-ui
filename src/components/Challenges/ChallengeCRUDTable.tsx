import { ActionIcon, Code, Table } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconTrash } from "@tabler/icons-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useChallenges } from "../../hooks/useChallenges";
import { useSeason } from "../../hooks/useSeason";
import { useUser } from "../../hooks/useUser";
import { Challenge } from "../../types";

export const ChallengeCRUDTable = () => {
  const { data: season } = useSeason();
  const { data: challenges } = useChallenges(season?.id);

  const { slimUser } = useUser();

  const handleDelete = async (e: Challenge) => {
    if (!slimUser?.isAdmin) return;

    modals.openConfirmModal({
      title: "Do you want to delete this challenge?",
      children: <Code block>{JSON.stringify(e, null, 2)}</Code>,
      labels: { confirm: "Delete", cancel: "Cancel" },
      onConfirm: async () => {
        const ref = doc(db, `challenges/${season?.id}`);

        const newEvents = { ...challenges };

        delete newEvents[e.id];

        await setDoc(ref, newEvents);
      },
    });
  };

  const rows = Object.values(challenges || {})
    .sort((a, b) => b.order - a.order)
    .map((e) => {
      return (
        <Table.Tr key={e.id}>
          <Table.Td>{e.order}</Table.Td>
          <Table.Td>{e.variant}</Table.Td>
          <Table.Td>{e.winning_players.join(", ")}</Table.Td>
          <Table.Td>{e.episode_id}</Table.Td>
          {slimUser?.isAdmin && (
            <Table.Td>
              <ActionIcon color="red" onClick={() => handleDelete(e)}>
                <IconTrash />
              </ActionIcon>
            </Table.Td>
          )}
        </Table.Tr>
      );
    });

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Order</Table.Th>
          <Table.Th>Variant</Table.Th>
          <Table.Th>Player</Table.Th>
          <Table.Th>Episode</Table.Th>
          {slimUser?.isAdmin && <Table.Th>Delete</Table.Th>}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
};
