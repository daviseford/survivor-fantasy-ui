import { Badge, Table, Text } from "@mantine/core";
import { BASE_PLAYER_SCORING } from "../../data/scoring";

export const ScoringLegendTable = () => {
  const rows = BASE_PLAYER_SCORING.map((x) => (
    <Table.Tr key={x.action}>
      <Table.Td>
        <Badge variant="light" color="gray" size="sm">
          {x.action.replace(/_/g, " ")}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{x.description}</Text>
      </Table.Td>
      <Table.Td ta="center">
        {x.fixed_value != null ? (
          <Text span fw={600} size="sm" c={x.fixed_value > 0 ? "teal" : "red"}>
            {x.fixed_value > 0 ? "+" : ""}
            {x.fixed_value}
          </Text>
        ) : (
          <Text span size="sm" c="dimmed">
            varies
          </Text>
        )}
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Table.ScrollContainer minWidth={300}>
      <Table verticalSpacing="xs" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Action</Table.Th>
            <Table.Th>Description</Table.Th>
            <Table.Th ta="center" w={80}>
              Points
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
};
