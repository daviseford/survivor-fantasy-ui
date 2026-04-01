import {
  ActionIcon,
  Code,
  Group,
  NumberInput,
  Select,
  Table,
  TableScrollContainer,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconPencil, IconTrash, IconX } from "@tabler/icons-react";
import { deleteField, doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { db } from "../../firebase";
import { useEliminations } from "../../hooks/useEliminations";
import { useSeason } from "../../hooks/useSeason";
import { useUser } from "../../hooks/useUser";
import {
  Elimination,
  EliminationVariant,
  EliminationVariants,
} from "../../types";

type EditValues = {
  order: number;
  variant: EliminationVariant;
  player_name: string;
  episode_num: number;
  votes_received?: number;
};

export const EliminationCRUDTable = () => {
  const { data: season } = useSeason();
  const { data: eliminations } = useEliminations(season?.id);
  const { slimUser } = useUser();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EditValues | null>(null);

  const handleDelete = async (e: Elimination) => {
    if (!slimUser?.isAdmin) return;

    modals.openConfirmModal({
      title: "Do you want to delete this elimination?",
      children: <Code block>{JSON.stringify(e, null, 2)}</Code>,
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        const ref = doc(db, `eliminations/${season?.id}`);

        const newEvents = { ...eliminations };

        delete newEvents[e.id];

        await setDoc(ref, newEvents);
      },
    });
  };

  const startEdit = (e: Elimination) => {
    setEditingId(e.id);
    setEditValues({
      order: e.order,
      variant: e.variant,
      player_name: e.player_name,
      episode_num: e.episode_num,
      votes_received: e.votes_received,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues(null);
  };

  const saveEdit = async (e: Elimination) => {
    if (!editValues || !season) return;

    try {
      const updated = {
        ...e,
        order: editValues.order,
        variant: editValues.variant,
        player_name: editValues.player_name,
        episode_num: editValues.episode_num,
        episode_id: `episode_${editValues.episode_num}`,
        votes_received:
          editValues.votes_received !== undefined
            ? editValues.votes_received
            : deleteField(),
      };
      const ref = doc(db, `eliminations/${season.id}`);
      await setDoc(ref, { [e.id]: updated }, { merge: true });

      notifications.show({
        title: "Elimination updated",
        message: `${editValues.player_name} (order ${editValues.order}) saved`,
        color: "green",
        icon: <IconCheck size={16} />,
      });

      setEditingId(null);
      setEditValues(null);
    } catch (err) {
      notifications.show({
        title: "Failed to update elimination",
        message: err instanceof Error ? err.message : "Unknown error",
        color: "red",
        icon: <IconX size={16} />,
      });
    }
  };

  const playerNames = season?.players.map((p) => p.name) ?? [];
  const variantOptions = EliminationVariants.slice().reverse();

  const rows = Object.values(eliminations || {})
    .sort((a, b) => b.order - a.order)
    .map((e) => {
      const isEditing = editingId === e.id;

      if (isEditing && editValues) {
        return (
          <Table.Tr key={e.id}>
            <Table.Td>
              <NumberInput
                size="xs"
                min={1}
                value={editValues.order}
                onChange={(val) =>
                  setEditValues({ ...editValues, order: Number(val) || 1 })
                }
                style={{ width: 70 }}
              />
            </Table.Td>
            <Table.Td>
              <Select
                size="xs"
                data={variantOptions as unknown as string[]}
                value={editValues.variant}
                onChange={(val) =>
                  setEditValues({
                    ...editValues,
                    variant: (val as EliminationVariant) ?? editValues.variant,
                  })
                }
                style={{ width: 180 }}
              />
            </Table.Td>
            <Table.Td>
              <Select
                size="xs"
                data={playerNames}
                value={editValues.player_name}
                searchable
                onChange={(val) =>
                  setEditValues({
                    ...editValues,
                    player_name: val ?? editValues.player_name,
                  })
                }
                style={{ width: 180 }}
              />
            </Table.Td>
            <Table.Td>
              <NumberInput
                size="xs"
                min={1}
                max={season?.episodes.length}
                value={editValues.episode_num}
                onChange={(val) =>
                  setEditValues({
                    ...editValues,
                    episode_num: Number(val) || 1,
                  })
                }
                style={{ width: 70 }}
              />
            </Table.Td>
            <Table.Td>
              <NumberInput
                size="xs"
                min={0}
                value={editValues.votes_received ?? ""}
                placeholder="—"
                onChange={(val) =>
                  setEditValues({
                    ...editValues,
                    votes_received: val === "" ? undefined : Number(val),
                  })
                }
                style={{ width: 70 }}
              />
            </Table.Td>
            {slimUser?.isAdmin && (
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon color="green" onClick={() => saveEdit(e)}>
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
        <Table.Tr key={e.id}>
          <Table.Td>{e.order}</Table.Td>
          <Table.Td>{e.variant}</Table.Td>
          <Table.Td>{e.player_name}</Table.Td>
          <Table.Td>episode_{e.episode_num}</Table.Td>
          <Table.Td>{e.votes_received ?? "—"}</Table.Td>
          {slimUser?.isAdmin && (
            <Table.Td>
              <Group gap="xs">
                <ActionIcon color="blue" onClick={() => startEdit(e)}>
                  <IconPencil />
                </ActionIcon>
                <ActionIcon color="red" onClick={() => handleDelete(e)}>
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
            <Table.Th>Order</Table.Th>
            <Table.Th>Variant</Table.Th>
            <Table.Th>Player</Table.Th>
            <Table.Th>Episode</Table.Th>
            <Table.Th>Votes</Table.Th>
            {slimUser?.isAdmin && <Table.Th>Actions</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </TableScrollContainer>
  );
};
