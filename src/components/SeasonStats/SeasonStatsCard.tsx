import { Group, Stack, Text } from "@mantine/core";
import { StatCard } from "../../utils/seasonStats";
import classes from "./SeasonStatsSection.module.css";

export const SeasonStatsCard = ({ card }: { card: StatCard }) => {
  const isNegative = card.tone === "negative";
  const isTied = card.winners.length > 1;

  return (
    <div
      className={`${classes.card} ${isNegative ? classes.cardNegative : ""}`}
    >
      <Stack gap={2}>
        <Text className={classes.cardLabel}>{card.title}</Text>
        {card.subtitle && (
          <Text size="xs" c="dimmed" mt={-1} mb={2}>
            {card.subtitle}
          </Text>
        )}

        {card.winners.map((w, idx) => (
          <div key={`${w.id}_${idx}`}>
            <Group gap={6} align="baseline" wrap="nowrap">
              <Text className={classes.cardValue}>{w.label}</Text>
              <Text className={classes.cardUnit}>
                {w.value} {card.unit}
              </Text>
            </Group>
            {w.detail && <Text className={classes.cardDetail}>{w.detail}</Text>}
          </div>
        ))}
        {isTied && (
          <Text size="xs" c="dimmed">
            Tied
          </Text>
        )}
      </Stack>
    </div>
  );
};
