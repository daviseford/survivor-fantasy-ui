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
        <Table.Td>{p.values.propbet_first_vote}</Table.Td>
        <Table.Td>{p.values.propbet_ftc}</Table.Td>
        <Table.Td>{p.values.propbet_idols}</Table.Td>
        <Table.Td>{p.values.propbet_immunities}</Table.Td>
        <Table.Td>{p.values.propbet_medical_evac}</Table.Td>
        <Table.Td>{p.values.propbet_winner}</Table.Td>
      </Table.Tr>
    );
  });

  return (
    <Table>
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
  );
};
