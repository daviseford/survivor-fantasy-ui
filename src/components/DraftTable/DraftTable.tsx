import { Avatar, Group, Table, Text } from "@mantine/core";
import { DraftPick, Player, SlimUser } from "../../types";

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

        return (
          <Table.Tr key={x.player_name + "draft_table"}>
            <Table.Td>
              <Group gap="sm">
                <Avatar size={40} src={player!.img} radius={40} />

                <Text fz="sm" fw={500}>
                  {x.player_name}
                </Text>
              </Group>
            </Table.Td>
            <Table.Td>{x.order}</Table.Td>
            <Table.Td>
              {participants?.find((p) => p.uid === x.user_uid)?.displayName}
            </Table.Td>
          </Table.Tr>
        );
      });

  return (
    <div>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Player Name</Table.Th>
            <Table.Th>Draft Position</Table.Th>
            <Table.Th>Drafted By</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </div>
  );
};
