import {
  ActionIcon,
  Code,
  Group,
  MultiSelect,
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
import { db } from "../../firebase";
import { useChallenges } from "../../hooks/useChallenges";
import { useEliminations } from "../../hooks/useEliminations";
import { useSeason } from "../../hooks/useSeason";
import { useUser } from "../../hooks/useUser";
import { CastawayId, Challenge, ChallengeWinActions } from "../../types";

export const ChallengeCRUDTable = () => {
  const { data: season } = useSeason();
  const { data: challenges } = useChallenges(season?.id);
  const { data: eliminations } = useEliminations(season?.id);
  const { slimUser } = useUser();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Challenge | null>(null);

  const handleDelete = async (e: Challenge) => {
    if (!slimUser?.isAdmin) return;

    modals.openConfirmModal({
      title: "Do you want to delete this challenge?",
      children: <Code block>{JSON.stringify(e, null, 2)}</Code>,
      labels: { confirm: "Delete", cancel: "Cancel" },
      onConfirm: async () => {
        const ref = doc(db, `challenges/${season?.id}`);
        const newChallenges = { ...challenges };
        delete newChallenges[e.id];
        await setDoc(ref, newChallenges);
      },
    });
  };

  const startEdit = (challenge: Challenge) => {
    setEditingId(challenge.id);
    setEditValues({ ...challenge });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues(null);
  };

  const saveEdit = async () => {
    if (!season || !editValues) return;

    try {
      const ref = doc(db, `challenges/${season.id}`);
      await setDoc(ref, { [editValues.id]: editValues }, { merge: true });

      notifications.show({
        title: "Challenge updated",
        message: `Challenge ${editValues.order} saved`,
        color: "green",
        icon: <IconCheck size={16} />,
      });

      setEditingId(null);
      setEditValues(null);
    } catch (err) {
      notifications.show({
        title: "Failed to update challenge",
        message: err instanceof Error ? err.message : "Unknown error",
        color: "red",
        icon: <IconX size={16} />,
      });
    }
  };

  // Players available for the currently-edited episode
  const getPlayerOptions = (episodeNum: number) => {
    const eliminatedCastaways = new Set(
      Object.values(eliminations)
        .filter((x) => x.episode_num < episodeNum)
        .map((x) => x.castaway_id),
    );
    return (
      season?.players
        .filter((x) => !eliminatedCastaways.has(x.castaway_id))
        .map((x) => ({ value: x.castaway_id, label: x.full_name })) ?? []
    );
  };

  const rows = Object.values(challenges || {})
    .sort((a, b) => b.order - a.order)
    .map((e) => {
      const isEditing = editingId === e.id;

      if (isEditing && editValues) {
        const playerOptions = getPlayerOptions(editValues.episode_num);

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
              />
            </Table.Td>
            <Table.Td>
              <Select
                size="xs"
                data={[...ChallengeWinActions]}
                value={editValues.variant}
                onChange={(val) =>
                  setEditValues({
                    ...editValues,
                    variant:
                      (val as Challenge["variant"]) ?? editValues.variant,
                  })
                }
              />
            </Table.Td>
            <Table.Td>
              <MultiSelect
                size="xs"
                data={playerOptions}
                value={editValues.winning_castaways}
                searchable
                onChange={(val) =>
                  setEditValues({
                    ...editValues,
                    winning_castaways: val as CastawayId[],
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
          <Table.Td>{e.order}</Table.Td>
          <Table.Td>{e.variant}</Table.Td>
          <Table.Td>
            {e.winning_castaways
              .map(
                (id) =>
                  season?.castawayLookup?.[id]?.full_name ?? id,
              )
              .join(", ")}
          </Table.Td>
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
            <Table.Th>Order</Table.Th>
            <Table.Th>Variant</Table.Th>
            <Table.Th>Winning Player(s)</Table.Th>
            <Table.Th>Episode</Table.Th>
            {slimUser?.isAdmin && <Table.Th>Actions</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </TableScrollContainer>
  );
};
