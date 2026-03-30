import { Avatar, Group, Table, Text } from "@mantine/core";
import { DraftPick, Player, SlimUser } from "../../types";
import { getNumberWithOrdinal } from "../../utils/misc";

export const DraftTable = ({
  draft_picks,
  participants,
  players,
}: {
  draft_picks: DraftPick[];
  participants: SlimUser[];
  players: Player[];
}) => {
  const rows = !draft_picks
    ? []
    : draft_picks?.map((x) => {
        const player = players?.find((p) => p.name === x.player_name);
        const user = participants?.find((p) => p.uid === x.user_uid);
        return (
          <Table.Tr key={x.player_name + "draft_table"}>
            <Table.Td ta="center">
              <Text span size="sm" c="dimmed">
                {getNumberWithOrdinal(x.order)}
              </Text>
            </Table.Td>
            <Table.Td>
              <Group gap="sm" wrap="nowrap">
                <Avatar
                  size={32}
                  src={player?.img}
                  radius={32}
                  alt={x.player_name}
                />
                <Text fz="sm" fw={500}>
                  {x.player_name}
                </Text>
              </Group>
            </Table.Td>
            <Table.Td>
              <Text size="sm">{user?.displayName || user?.email}</Text>
            </Table.Td>
          </Table.Tr>
        );
      });

  return (
    <Table.ScrollContainer minWidth={300}>
      <Table highlightOnHover verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={60} ta="center">
              Pick
            </Table.Th>
            <Table.Th>Contestant</Table.Th>
            <Table.Th>Drafted By</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
};
