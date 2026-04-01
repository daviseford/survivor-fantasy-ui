import { Table, TableScrollContainer, Text } from "@mantine/core";
import { PropBetsQuestions } from "../../data/propbets";
import { useDraft } from "../../hooks/useDraft";
import { useSeason } from "../../hooks/useSeason";
import type { CastawayId, CastawayLookup } from "../../types";

/** Resolve a prop bet answer to a display name if it's a castaway ID. */
const resolveAnswer = (answer: string, lookup?: CastawayLookup): string => {
  if (!answer || !lookup) return answer;
  return lookup[answer as CastawayId]?.full_name ?? answer;
};

export const PostDraftPropBetTable = () => {
  const { draft } = useDraft();
  const { data: season } = useSeason(draft?.season_id);

  if (!draft?.prop_bets) return null;

  const lookup = season?.castawayLookup;

  const rows = draft.prop_bets.map((p) => {
    return (
      <Table.Tr key={p.id}>
        <Table.Td fw={600}>
          <Text size="sm">{p.user_name}</Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm">
            {resolveAnswer(p.values.propbet_first_vote, lookup)}
          </Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm">
            {resolveAnswer(p.values.propbet_ftc, lookup)}
          </Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm">
            {resolveAnswer(p.values.propbet_idols, lookup)}
          </Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm">
            {resolveAnswer(p.values.propbet_immunities, lookup)}
          </Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm">{p.values.propbet_medical_evac}</Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm">
            {resolveAnswer(p.values.propbet_winner, lookup)}
          </Text>
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
