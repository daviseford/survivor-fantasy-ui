import { Table, TableScrollContainer, Text } from "@mantine/core";
import { PropBetsQuestions } from "../../data/propbets";
import { useDraft } from "../../hooks/useDraft";

export const PostDraftPropBetTable = () => {
  const { draft } = useDraft();

  if (!draft?.prop_bets) return null;

  const rows = draft.prop_bets.map((p) => {
    return (
      <Table.Tr key={p.id}>
        <Table.Td fw={600}>
          <Text size="sm">{p.user_name}</Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm">{p.values.propbet_first_vote}</Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm">{p.values.propbet_ftc}</Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm">{p.values.propbet_idols}</Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm">{p.values.propbet_immunities}</Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm">{p.values.propbet_medical_evac}</Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm">{p.values.propbet_winner}</Text>
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <TableScrollContainer minWidth={500}>
      <Table highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th></Table.Th>
            <Table.Th>
              {PropBetsQuestions.propbet_first_vote.description}
            </Table.Th>
            <Table.Th>{PropBetsQuestions.propbet_ftc.description}</Table.Th>
            <Table.Th>{PropBetsQuestions.propbet_idols.description}</Table.Th>
            <Table.Th>
              {PropBetsQuestions.propbet_immunities.description}
            </Table.Th>
            <Table.Th>
              {PropBetsQuestions.propbet_medical_evac.description}
            </Table.Th>
            <Table.Th>{PropBetsQuestions.propbet_winner.description}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </TableScrollContainer>
  );
};
