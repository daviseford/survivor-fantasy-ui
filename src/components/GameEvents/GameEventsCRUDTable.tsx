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
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { BASE_PLAYER_SCORING } from "../../data/scoring";
import { db } from "../../firebase";
import { useEliminations } from "../../hooks/useEliminations";
import { useEvents } from "../../hooks/useEvents";
import { useSeason } from "../../hooks/useSeason";
import { useUser } from "../../hooks/useUser";
import { GameEvent, GameEventActions } from "../../types";

export const GameEventsCRUDTable = () => {
  const { data: season } = useSeason();
  const { data: events } = useEvents(season?.id);
  const { data: eliminations } = useEliminations(season?.id);
  const { slimUser } = useUser();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<GameEvent | null>(null);

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

  const startEdit = (event: GameEvent) => {
    setEditingId(event.id);
    setEditValues({ ...event });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues(null);
  };

  const saveEdit = async () => {
    if (!season || !editValues) return;

    const actionDef = BASE_PLAYER_SCORING.find(
      (x) => x.action === editValues.action,
    );
    const values = {
      ...editValues,
      multiplier: actionDef?.multiplier ? editValues.multiplier : null,
    };

    try {
      const ref = doc(db, `events/${season.id}`);
      await setDoc(ref, { [values.id]: values }, { merge: true });

      notifications.show({
        title: "Event updated",
        message: `${values.action} for ${values.player_name} saved`,
        color: "green",
        icon: <IconCheck size={16} />,
      });

      setEditingId(null);
      setEditValues(null);
    } catch (err) {
      notifications.show({
        title: "Failed to update event",
        message: err instanceof Error ? err.message : "Unknown error",
        color: "red",
        icon: <IconX size={16} />,
      });
    }
  };

  const getPlayerNames = (episodeNum: number) => {
    const eliminatedPlayers = new Set(
      Object.values(eliminations)
        .filter((x) => x.episode_num < episodeNum)
        .map((x) => x.player_name),
    );
    return (
      season?.players
        .map((x) => x.name)
        .filter((x) => !eliminatedPlayers.has(x)) ?? []
    );
  };

  const currentActionDef = editValues
    ? BASE_PLAYER_SCORING.find((x) => x.action === editValues.action)
    : null;

  const rows = Object.values(events || {})
    .sort((a, b) => b.episode_num - a.episode_num)
    .map((e) => {
      const isEditing = editingId === e.id;

      if (isEditing && editValues) {
        const playerNames = getPlayerNames(editValues.episode_num);

        return (
          <Table.Tr key={e.id}>
            <Table.Td>
              <Select
                size="xs"
                data={[...GameEventActions]}
                value={editValues.action}
                searchable
                onChange={(val) =>
                  setEditValues({
                    ...editValues,
                    action:
                      (val as GameEvent["action"]) ?? editValues.action,
                  })
                }
              />
            </Table.Td>
            <Table.Td>
              {currentActionDef?.multiplier ? (
                <NumberInput
                  size="xs"
                  value={editValues.multiplier ?? undefined}
                  onChange={(val) =>
                    setEditValues({
                      ...editValues,
                      multiplier: val === "" ? null : Number(val),
                    })
                  }
                />
              ) : (
                "-"
              )}
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
              />
            </Table.Td>
            <Table.Td>
              <NumberInput
                size="xs"
                min={1}
                max={season?.episodes.length}
                value={editValues.episode_num}
                onChange={(val) => {
                  const num = Number(val) || 1;
                  setEditValues({
                    ...editValues,
                    episode_num: num,
                    episode_id: `episode_${num}`,
                  });
                }}
              />
            </Table.Td>
            {slimUser?.isAdmin && (
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon color="green" onClick={saveEdit}>
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
          <Table.Td>{e.action}</Table.Td>
          <Table.Td>{e.multiplier || "-"}</Table.Td>
          <Table.Td>{e.player_name}</Table.Td>
          <Table.Td>{e.episode_id}</Table.Td>
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
            <Table.Th>Action</Table.Th>
            <Table.Th>Multiplier</Table.Th>
            <Table.Th>Player</Table.Th>
            <Table.Th>Episode</Table.Th>
            {slimUser?.isAdmin && <Table.Th>Actions</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </TableScrollContainer>
  );
};
