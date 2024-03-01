import { Table } from "@mantine/core";
import { BASE_PLAYER_SCORING } from "../../data/scoring";

export const ScoringLegendTable = () => {
  const rows = BASE_PLAYER_SCORING.map((x) => (
    <Table.Tr key={x.action}>
      <Table.Td>{x.action}</Table.Td>
      <Table.Td>{x.description}</Table.Td>
      <Table.Td>{x.fixed_value}</Table.Td>
    </Table.Tr>
  ));

  return (
    <Table.ScrollContainer minWidth={300}>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Action</Table.Th>
            <Table.Th>Description</Table.Th>
            <Table.Th>Fixed Value</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
};
