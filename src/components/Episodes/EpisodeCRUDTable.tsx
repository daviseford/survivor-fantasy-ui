import {
  ActionIcon,
  Alert,
  Badge,
  Checkbox,
  Group,
  Table,
  TableScrollContainer,
  Text,
  TextInput,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconPencil, IconTrash, IconX } from "@tabler/icons-react";
import { doc, updateDoc } from "firebase/firestore";
import { useState } from "react";
import { db } from "../../firebase";
import { useSeason } from "../../hooks/useSeason";
import { useUser } from "../../hooks/useUser";
import { Episode } from "../../types";

export const EpisodeCRUDTable = () => {
  const { data: season } = useSeason();
  const { slimUser } = useUser();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Episode | null>(null);

  const handleDelete = async (episode: Episode) => {
    if (!slimUser?.isAdmin || !season) return;

    modals.openConfirmModal({
      title: `Delete Episode ${episode.order}?`,
      children: (
        <Text size="sm">
          Remove "{episode.name || `Episode ${episode.order}`}" from this
          season. Use this only if the episode was created by mistake.
        </Text>
      ),
      labels: { confirm: "Delete episode", cancel: "Keep it" },
      onConfirm: async () => {
        try {
          const ref = doc(db, "seasons", season.id);
          const updated = season.episodes.filter((e) => e.id !== episode.id);
          await updateDoc(ref, { episodes: updated });
          notifications.show({
            title: "Episode deleted",
            message: `Episode ${episode.order} removed`,
            color: "green",
            icon: <IconCheck size={16} />,
          });
        } catch (err) {
          notifications.show({
            title: "Failed to delete episode",
            message: err instanceof Error ? err.message : "Unknown error",
            color: "red",
            icon: <IconX size={16} />,
          });
        }
      },
    });
  };

  const startEdit = (episode: Episode) => {
    setEditingId(episode.id);
    setEditValues({ ...episode });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues(null);
  };

  const saveEdit = async () => {
    if (!season || !editValues) return;

    try {
      const ref = doc(db, "seasons", season.id);
      const updated = season.episodes.map((e) =>
        e.id === editValues.id ? editValues : e,
      );
      await updateDoc(ref, { episodes: updated });

      notifications.show({
        title: "Episode updated",
        message: `Episode ${editValues.order} saved`,
        color: "green",
        icon: <IconCheck size={16} />,
      });

      setEditingId(null);
      setEditValues(null);
    } catch (err) {
      notifications.show({
        title: "Failed to update episode",
        message: err instanceof Error ? err.message : "Unknown error",
        color: "red",
        icon: <IconX size={16} />,
      });
    }
  };

  const episodes = [...(season?.episodes ?? [])].sort(
    (a, b) => a.order - b.order,
  );

  const rows = episodes.map((e) => {
    const isEditing = editingId === e.id;

    if (isEditing && editValues) {
      return (
        <Table.Tr key={e.id}>
          <Table.Td>{e.order}</Table.Td>
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
            <Group gap="xs">
              <Checkbox
                size="xs"
                label="Merge"
                checked={editValues.merge_occurs}
                onChange={(ev) =>
                  setEditValues({
                    ...editValues,
                    merge_occurs: ev.target.checked,
                  })
                }
              />
              <Checkbox
                size="xs"
                label="Post-merge"
                checked={editValues.post_merge}
                onChange={(ev) =>
                  setEditValues({
                    ...editValues,
                    post_merge: ev.target.checked,
                  })
                }
              />
              <Checkbox
                size="xs"
                label="Finale"
                checked={editValues.finale}
                onChange={(ev) =>
                  setEditValues({ ...editValues, finale: ev.target.checked })
                }
              />
            </Group>
          </Table.Td>
          {slimUser?.isAdmin && (
            <Table.Td>
              <Group gap="xs">
                <ActionIcon
                  size="lg"
                  color="green"
                  onClick={saveEdit}
                  aria-label="Save episode"
                >
                  <IconCheck />
                </ActionIcon>
                <ActionIcon
                  size="lg"
                  color="gray"
                  onClick={cancelEdit}
                  aria-label="Cancel editing episode"
                >
                  <IconX />
                </ActionIcon>
              </Group>
            </Table.Td>
          )}
        </Table.Tr>
      );
    }

    return (
      <Table.Tr key={e.id}>
        <Table.Td>{e.order}</Table.Td>
        <Table.Td>{e.name || "-"}</Table.Td>
        <Table.Td>
          <Group gap="xs">
            {e.merge_occurs && (
              <Badge size="xs" color="orange">
                Merge
              </Badge>
            )}
            {e.post_merge && (
              <Badge size="xs" color="blue">
                Post-merge
              </Badge>
            )}
            {e.finale && (
              <Badge size="xs" color="red">
                Finale
              </Badge>
            )}
          </Group>
        </Table.Td>
        {slimUser?.isAdmin && (
          <Table.Td>
            <Group gap="xs">
              <ActionIcon
                size="lg"
                color="blue"
                onClick={() => startEdit(e)}
                aria-label={`Edit episode ${e.order}`}
              >
                <IconPencil />
              </ActionIcon>
              <ActionIcon
                size="lg"
                color="red"
                onClick={() => handleDelete(e)}
                aria-label={`Delete episode ${e.order}`}
              >
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
            <Table.Th>Episode #</Table.Th>
            <Table.Th>Name</Table.Th>
            <Table.Th>Flags</Table.Th>
            {slimUser?.isAdmin && <Table.Th>Actions</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.length > 0 ? (
            rows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={4}>
                <Alert color="blue" variant="light">
                  No episodes yet. Add the first episode above to start the
                  season timeline.
                </Alert>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </TableScrollContainer>
  );
};
