import {
  ActionIcon,
  Badge,
  Code,
  Group,
  Table,
  TableScrollContainer,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconTrash } from "@tabler/icons-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useSeason } from "../../hooks/useSeason";
import { useUser } from "../../hooks/useUser";
import { Episode } from "../../types";

export const EpisodeCRUDTable = () => {
  const { data: season } = useSeason();
  const { slimUser } = useUser();

  const handleDelete = async (episode: Episode) => {
    if (!slimUser?.isAdmin || !season) return;

    modals.openConfirmModal({
      title: "Do you want to delete this episode?",
      children: <Code block>{JSON.stringify(episode, null, 2)}</Code>,
      labels: { confirm: "Delete", cancel: "Cancel" },
      onConfirm: async () => {
        const ref = doc(db, "seasons", season.id);
        const updated = season.episodes.filter((e) => e.id !== episode.id);
        await updateDoc(ref, { episodes: updated });
      },
    });
  };

  const episodes = [...(season?.episodes ?? [])].sort(
    (a, b) => a.order - b.order,
  );

  const rows = episodes.map((e) => (
    <Table.Tr key={e.id}>
      <Table.Td>{e.order}</Table.Td>
      <Table.Td>{e.name || "-"}</Table.Td>
      <Table.Td>
        <Group gap="xs">
          {e.merge_occurs && <Badge size="xs" color="orange">Merge</Badge>}
          {e.post_merge && <Badge size="xs" color="blue">Post-merge</Badge>}
          {e.finale && <Badge size="xs" color="red">Finale</Badge>}
        </Group>
      </Table.Td>
      {slimUser?.isAdmin && (
        <Table.Td>
          <ActionIcon color="red" onClick={() => handleDelete(e)}>
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
            <Table.Th>Episode #</Table.Th>
            <Table.Th>Name</Table.Th>
            <Table.Th>Flags</Table.Th>
            {slimUser?.isAdmin && <Table.Th>Delete</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </TableScrollContainer>
  );
};
