import { Stack, Title } from "@mantine/core";
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
