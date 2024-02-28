import { Table } from "@mantine/core";
import { PropBetsQuestions } from "../../data/propbets";
import { useDraft } from "../../hooks/useDraft";

export const PostDraftPropBetTable = () => {
  const { draft } = useDraft();

  if (!draft?.prop_bets) return null;

  const rows = draft?.prop_bets.map((p) => {
    return (
      <Table.Tr key={p.id}>
        <Table.Td>
          <strong>{p.user_name}</strong>
        </Table.Td>
        {Object.values(p.values).map((v) => {
          return <Table.Td>{v}</Table.Td>;
        })}
      </Table.Tr>
    );
  });

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th></Table.Th>
          {Object.values(PropBetsQuestions).map((v) => {
            return <Table.Th>{v.description}</Table.Th>;
          })}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
};
