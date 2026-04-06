import { Divider, SimpleGrid, Stack, Table, Text } from "@mantine/core";
import { RosterStat, SeasonStatsResult } from "../../utils/seasonStats";
import { SeasonStatsCard } from "./SeasonStatsCard";

const RosterStatRow = ({ stat }: { stat: RosterStat }) => (
  <Table.Tr>
    <Table.Td style={{ minWidth: 140 }}>
      <Text size="xs" fw={600}>
        {stat.title}
      </Text>
      <Text size="xs" c="dimmed">
        {stat.description}
      </Text>
    </Table.Td>
    {stat.rows.map((row) => (
      <Table.Td key={row.uid} ta="center">
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
    ))}
  </Table.Tr>
);

export const SeasonStatsSection = ({ stats }: { stats: SeasonStatsResult }) => {
  const hasCastaway = stats.castawayCards.length > 0;
  const hasRoster = stats.rosterStats.length > 0;

  if (!hasCastaway && !hasRoster) return null;

  const participants = hasRoster ? stats.rosterStats[0].rows : [];

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
            <Text size="sm" fw={600} c="dimmed" mb="xs">
              Roster Stats
            </Text>
            <Table.ScrollContainer minWidth={400}>
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
                    <RosterStatRow key={stat.key} stat={stat} />
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
