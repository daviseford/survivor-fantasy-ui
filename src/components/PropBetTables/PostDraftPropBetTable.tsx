import { Table, TableScrollContainer, Text } from "@mantine/core";
import { getActivePropBetKeys, PropBetsQuestions } from "../../data/propbets";
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
  const activeKeys = getActivePropBetKeys(draft.prop_bets);

  if (activeKeys.length === 0) return null;

  const rows = draft.prop_bets.map((p) => {
    return (
      <Table.Tr key={p.id}>
        <Table.Td fw={600}>
          <Text size="sm">{p.user_name}</Text>
        </Table.Td>
        {activeKeys.map((key) => (
          <Table.Td key={key}>
            <Text size="sm">{resolveAnswer(p.values[key] || "", lookup)}</Text>
          </Table.Td>
        ))}
      </Table.Tr>
    );
  });

  return (
    <TableScrollContainer minWidth={500}>
      <Table highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th></Table.Th>
            {activeKeys.map((key) => (
              <Table.Th key={key}>
                {PropBetsQuestions[key].description}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </TableScrollContainer>
  );
};
