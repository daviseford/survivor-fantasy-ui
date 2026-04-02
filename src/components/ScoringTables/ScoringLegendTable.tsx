import { Badge, Table, Text } from "@mantine/core";
import { BASE_PLAYER_SCORING } from "../../data/scoring";

const SCORING_CATEGORIES = [
  {
    label: "Challenges",
    actions: ["reward", "immunity"],
  },
  {
    label: "Milestones",
    actions: [
      "make_merge",
      "make_final_tribal_council",
      "win_survivor",
      "medically_evacuated",
      "quitter",
    ],
  },
  {
    label: "Idols and Advantages Found",
    actions: [
      "find_idol",
      "find_extra_vote",
      "find_steal_a_vote",
      "find_block_a_vote",
      "find_bank_your_vote",
      "find_idol_nullifier",
      "find_knowledge_is_power",
      "find_safety_without_power",
      "find_control_the_vote",
      "find_amulet",
      "find_challenge_advantage",
      "find_other_advantage",
    ],
  },
  {
    label: "Idols and Advantages Used",
    actions: [
      "use_idol",
      "use_extra_vote",
      "use_steal_a_vote",
      "use_block_a_vote",
      "use_bank_your_vote",
      "use_idol_nullifier",
      "use_knowledge_is_power",
      "use_safety_without_power",
      "use_control_the_vote",
    ],
  },
  {
    label: "Advantages Won",
    actions: [
      "win_extra_vote",
      "win_steal_a_vote",
      "win_block_a_vote",
      "win_idol",
      "win_other_advantage",
    ],
  },
  {
    label: "Tribal Council and Risk",
    actions: [
      "votes_negated_by_idol",
      "eliminated",
      "use_shot_in_the_dark_unsuccessfully",
      "use_shot_in_the_dark_successfully",
    ],
  },
  {
    label: "Journeys and Beware",
    actions: [
      "find_beware_advantage",
      "accept_beware_advantage",
      "fulfill_beware_advantage",
      "go_on_journey",
      "complete_sweat_or_savvy_task",
    ],
  },
] as const;

const scoringByAction = new Map(
  BASE_PLAYER_SCORING.map((entry) => [entry.action, entry]),
);

export const ScoringLegendTable = () => {
  const rows = SCORING_CATEGORIES.flatMap((category) => {
    const categoryRows = category.actions
      .map((action) => scoringByAction.get(action))
      .filter((entry) => entry != null)
      .map((x) => (
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
              <Text
                span
                fw={600}
                size="sm"
                c={x.fixed_value > 0 ? "teal" : "red"}
              >
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

    if (categoryRows.length === 0) {
      return [];
    }

    return [
      <Table.Tr key={`category-${category.label}`}>
        <Table.Td colSpan={3} bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))">
          <Text fw={700} size="sm">
            {category.label}
          </Text>
        </Table.Td>
      </Table.Tr>,
      ...categoryRows,
    ];
  });

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
