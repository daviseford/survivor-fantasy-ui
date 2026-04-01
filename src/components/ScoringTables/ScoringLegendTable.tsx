import { Badge, Table, Text } from "@mantine/core";
import {
  BASE_PLAYER_SCORING,
  type CategorizedPlayerScoring,
  type ScoringCategory,
} from "../../data/scoring";

const CATEGORY_ORDER: ScoringCategory[] = [
  "Challenges",
  "Milestones",
  "Idols",
  "Advantages",
  "Other",
];

export const ScoringLegendTable = () => {
  const grouped = CATEGORY_ORDER.reduce<
    Record<ScoringCategory, CategorizedPlayerScoring[]>
  >(
    (acc, cat) => {
      acc[cat] = BASE_PLAYER_SCORING.filter((x) => x.category === cat);
      return acc;
    },
    {} as Record<ScoringCategory, CategorizedPlayerScoring[]>,
  );

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
        <Table.Tbody>
          {CATEGORY_ORDER.map((category) => {
            const items = grouped[category];
            if (!items?.length) return null;

            return [
              <Table.Tr
                key={`header-${category}`}
                style={{ backgroundColor: "var(--mantine-color-gray-light)" }}
              >
                <Table.Td colSpan={3} py={4}>
                  <Text fw={700} size="xs" tt="uppercase" c="dimmed">
                    {category}
                  </Text>
                </Table.Td>
              </Table.Tr>,
              ...items.map((x) => (
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
              )),
            ];
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
};
