import {
  ActionIcon,
  Alert,
  Group,
  NumberInput,
  Select,
  Stack,
  Table,
  TableScrollContainer,
  Text,
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
  CastawayId,
  Elimination,
  EliminationVariant,
  EliminationVariants,
} from "../../types";

type EditValues = {
  order: number;
  variant: EliminationVariant;
  castaway_id: CastawayId;
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
      title: `Delete elimination ${e.order}?`,
      children: (
        <Stack gap="xs">
          <Text size="sm">
            Remove this elimination from the season. Use this only if it was
            created by mistake.
          </Text>
          <Text size="sm" c="dimmed">
            {season?.castawayLookup?.[e.castaway_id]?.full_name ??
              e.castaway_id}{" "}
            &middot; {e.variant} &middot; Episode {e.episode_num}
          </Text>
        </Stack>
      ),
      labels: { confirm: "Delete elimination", cancel: "Keep it" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        const ref = doc(db, `eliminations/${season?.id}`);

        const newEliminations = { ...eliminations };

        delete newEliminations[e.id];

        await setDoc(ref, newEliminations);
      },
    });
  };

  const startEdit = (e: Elimination) => {
    setEditingId(e.id);
    setEditValues({
      order: e.order,
      variant: e.variant,
      castaway_id: e.castaway_id,
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
        castaway_id: editValues.castaway_id,
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
        message: `${season?.castawayLookup?.[editValues.castaway_id]?.full_name ?? editValues.castaway_id} (order ${editValues.order}) saved`,
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

  const playerOptions =
    season?.players.map((p) => ({
      value: p.castaway_id,
      label: p.full_name,
    })) ?? [];
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
                w={70}
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
                w={180}
              />
            </Table.Td>
            <Table.Td>
              <Select
                size="xs"
                data={playerOptions}
                value={editValues.castaway_id}
                searchable
                onChange={(val) =>
                  setEditValues({
                    ...editValues,
                    castaway_id: (val as CastawayId) ?? editValues.castaway_id,
                  })
                }
                w={180}
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
                w={70}
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
                w={70}
              />
            </Table.Td>
            {slimUser?.isAdmin && (
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon
                    size="lg"
                    color="green"
                    onClick={() => saveEdit(e)}
                    aria-label="Save elimination"
                  >
                    <IconCheck />
                  </ActionIcon>
                  <ActionIcon
                    size="lg"
                    color="gray"
                    onClick={cancelEdit}
                    aria-label="Cancel editing elimination"
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
          <Table.Td>{e.variant}</Table.Td>
          <Table.Td>
            {season?.castawayLookup?.[e.castaway_id]?.full_name ??
              e.castaway_id}
          </Table.Td>
          <Table.Td>episode_{e.episode_num}</Table.Td>
          <Table.Td>{e.votes_received ?? "—"}</Table.Td>
          {slimUser?.isAdmin && (
            <Table.Td>
              <Group gap="xs">
                <ActionIcon
                  size="lg"
                  color="blue"
                  onClick={() => startEdit(e)}
                  aria-label={`Edit elimination ${e.order}`}
                >
                  <IconPencil />
                </ActionIcon>
                <ActionIcon
                  size="lg"
                  color="red"
                  onClick={() => handleDelete(e)}
                  aria-label={`Delete elimination ${e.order}`}
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
            <Table.Th>Order</Table.Th>
            <Table.Th>Variant</Table.Th>
            <Table.Th>Player</Table.Th>
            <Table.Th>Episode</Table.Th>
            <Table.Th>Votes</Table.Th>
            {slimUser?.isAdmin && <Table.Th>Actions</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.length > 0 ? (
            rows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={6}>
                <Alert color="blue" variant="light">
                  No eliminations recorded yet.
                </Alert>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </TableScrollContainer>
  );
};
