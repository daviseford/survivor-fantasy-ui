import { ActionIcon, Code, Table, TableScrollContainer } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconTrash } from "@tabler/icons-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useEvents } from "../../hooks/useEvents";
import { useSeason } from "../../hooks/useSeason";
import { useUser } from "../../hooks/useUser";
import { GameEvent } from "../../types";

export const GameEventsCRUDTable = () => {
  const { data: season } = useSeason();
  const { data: events } = useEvents(season?.id);

  const { slimUser } = useUser();

  const handleDelete = async (e: GameEvent) => {
    if (!slimUser?.isAdmin) return;

    modals.openConfirmModal({
      title: "Do you want to delete this event?",
      children: <Code block>{JSON.stringify(e, null, 2)}</Code>,
      labels: { confirm: "Delete", cancel: "Cancel" },
      onConfirm: async () => {
        const ref = doc(db, `events/${season?.id}`);

        const newEvents = { ...events };

        delete newEvents[e.id];

        await setDoc(ref, newEvents);
      },
    });
  };

  const rows = Object.values(events || {})
    .sort((a, b) => b.episode_num - a.episode_num)
    .map((e) => {
      return (
        <Table.Tr key={e.id}>
          <Table.Td>{e.action}</Table.Td>
          <Table.Td>{e.multiplier || "-"}</Table.Td>
          <Table.Td>{e.player_name}</Table.Td>
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
    <TableScrollContainer minWidth={300}>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Action</Table.Th>
            <Table.Th>Multiplier</Table.Th>
            <Table.Th>Player</Table.Th>
            <Table.Th>Episode</Table.Th>
            {slimUser?.isAdmin && <Table.Th>Delete</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </TableScrollContainer>
  );
};
