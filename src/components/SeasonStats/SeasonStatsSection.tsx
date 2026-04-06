import { Stack, Table, Text, Title } from "@mantine/core";
import { RosterStat, SeasonStatsResult } from "../../utils/seasonStats";
import { SeasonStatsCard } from "./SeasonStatsCard";
import classes from "./SeasonStatsSection.module.css";

const RosterStatTable = ({ stat }: { stat: RosterStat }) => (
  <Table.Tr>
    <Table.Td className={classes.rosterStatLabel}>
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

  // Use the first roster stat's rows for column headers (all share the same participants)
  const participants = hasRoster ? stats.rosterStats[0].rows : [];

  return (
    <Stack gap="md">
      {hasCastaway && (
        <div>
          <Title order={6} c="dimmed" mb={4}>
            Castaway Stats
          </Title>
          <div className={classes.cardGrid}>
            {stats.castawayCards.map((card) => (
              <SeasonStatsCard key={card.key} card={card} />
            ))}
          </div>
        </div>
      )}
      {hasRoster && (
        <div className={hasCastaway ? classes.sectionDivider : undefined}>
          <Title order={6} c="dimmed" mb={4}>
            Roster Stats
          </Title>
          <Table.ScrollContainer minWidth={400}>
            <Table verticalSpacing={6} horizontalSpacing="sm">
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
                  <RosterStatTable key={stat.key} stat={stat} />
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </div>
      )}
    </Stack>
  );
};
