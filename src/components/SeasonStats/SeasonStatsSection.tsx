import { Stack, Text, Title } from "@mantine/core";
import { SeasonStatsResult } from "../../utils/seasonStats";
import { SeasonStatsCard } from "./SeasonStatsCard";
import classes from "./SeasonStatsSection.module.css";

export const SeasonStatsSection = ({ stats }: { stats: SeasonStatsResult }) => {
  const hasCastaway = stats.castawayCards.length > 0;
  const hasRoster = stats.rosterCards.length > 0;

  if (!hasCastaway && !hasRoster) return null;

  return (
    <Stack gap="md">
      {hasCastaway && (
        <div>
          <Title order={5} mb="xs">
            Castaway Stats
          </Title>
          <Text size="xs" c="dimmed" mb="sm">
            Individual performance across drafted castaways
          </Text>
          <div className={classes.cardGrid}>
            {stats.castawayCards.map((card) => (
              <SeasonStatsCard key={card.key} card={card} />
            ))}
          </div>
        </div>
      )}
      {hasRoster && (
        <div>
          <Title order={5} mb="xs">
            Roster Stats
          </Title>
          <Text size="xs" c="dimmed" mb="sm">
            How each team's draft roster is performing
          </Text>
          <div className={classes.cardGrid}>
            {stats.rosterCards.map((card) => (
              <SeasonStatsCard key={card.key} card={card} />
            ))}
          </div>
        </div>
      )}
    </Stack>
  );
};
