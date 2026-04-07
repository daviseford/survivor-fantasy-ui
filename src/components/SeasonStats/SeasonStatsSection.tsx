import { Divider, SimpleGrid, Stack, Table, Text } from "@mantine/core";
import { RosterStat, SeasonStatsResult } from "../../utils/seasonStats";
import { SeasonStatsCard } from "./SeasonStatsCard";

function getCellColor(
  value: number,
  best: number,
  worst: number,
  direction: "high" | "low",
): string | undefined {
  if (best === worst) return undefined;
  const isBest = direction === "high" ? value === best : value === worst;
  const isWorst = direction === "high" ? value === worst : value === best;
  if (isBest) return "var(--mantine-color-green-light)";
  if (isWorst) return "var(--mantine-color-red-light)";
  return undefined;
}

function getRank(index: number): string {
  const n = index + 1;
  const suffix = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
  return `${n}${suffix}`;
}

const RosterStatRow = ({
  stat,
  showRank,
}: {
  stat: RosterStat;
  showRank: boolean;
}) => {
  const values = stat.rows.map((r) => r.value);
  const best = Math.max(...values);
  const worst = Math.min(...values);

  // Compute rank from value (sorted descending for "high", ascending for "low")
  const sorted = [...values].sort((a, b) =>
    stat.direction === "high" ? b - a : a - b,
  );
  const rankByValue = (v: number) => sorted.indexOf(v) + 1;

  return (
    <Table.Tr>
      <Table.Td style={{ minWidth: 140 }}>
        <Text size="xs" fw={600}>
          {stat.title}
        </Text>
        <Text size="xs" c="dimmed">
          {stat.description}
        </Text>
      </Table.Td>
      {stat.rows.map((row) => {
        const bg = getCellColor(row.value, best, worst, stat.direction);
        const rank = showRank ? getRank(rankByValue(row.value) - 1) : null;
        return (
          <Table.Td key={row.uid} ta="center" bg={bg}>
            {rank && (
              <Text size="xs" c="dimmed" fw={500}>
                {rank}
              </Text>
            )}
            <Text size="sm" fw={700}>
              {row.value}{" "}
              <Text span size="xs" c="dimmed" fw={400}>
                {stat.unit}
              </Text>
            </Text>
            {row.detail && (
              <Text size="xs" c="dimmed">
                {row.detail}
              </Text>
            )}
          </Table.Td>
        );
      })}
    </Table.Tr>
  );
};

export const SeasonStatsSection = ({ stats }: { stats: SeasonStatsResult }) => {
  const hasCastaway = stats.castawayCards.length > 0;
  const hasRoster = stats.rosterStats.length > 0;

  if (!hasCastaway && !hasRoster) return null;

  const participants = hasRoster ? stats.rosterStats[0].rows : [];
  const showRank = participants.length > 2;

  return (
    <Stack gap="md">
      {hasCastaway && (
        <div>
          <Text size="sm" fw={600} c="dimmed" mb="xs">
            Castaway Stats
          </Text>
          <SimpleGrid
            cols={{ base: 2, md: 3 }}
            spacing="xs"
            style={{ alignItems: "start" }}
          >
            {stats.castawayCards.map((card) => (
              <SeasonStatsCard key={card.key} card={card} />
            ))}
          </SimpleGrid>
        </div>
      )}
      {hasRoster && (
        <>
          {hasCastaway && <Divider />}
          <div>
            <Text size="sm" fw={600} c="dimmed">
              Roster Stats
            </Text>
            <Table.ScrollContainer minWidth={500}>
              <Table verticalSpacing="xs" horizontalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th />
                    {participants.map((p) => (
                      <Table.Th key={p.uid} ta="center">
                        <Text size="sm" fw={600}>
                          {p.label}
                        </Text>
                      </Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {stats.rosterStats.map((stat) => (
                    <RosterStatRow
                      key={stat.key}
                      stat={stat}
                      showRank={showRank}
                    />
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </div>
        </>
      )}
    </Stack>
  );
};
