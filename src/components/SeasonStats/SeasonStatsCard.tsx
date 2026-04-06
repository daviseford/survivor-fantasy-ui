import { Badge, Group, Stack, Text } from "@mantine/core";
import { StatCard } from "../../utils/seasonStats";
import classes from "./SeasonStatsSection.module.css";

export const SeasonStatsCard = ({ card }: { card: StatCard }) => {
  const isNegative = card.tone === "negative";
  const isTied = card.winners.length > 1;

  return (
    <div
      className={`${classes.card} ${isNegative ? classes.cardNegative : ""}`}
    >
      <Stack gap={4}>
        <Text className={classes.cardTitle}>{card.title}</Text>
        {card.subtitle && (
          <Text size="xs" c="dimmed" mt={-2}>
            {card.subtitle}
          </Text>
        )}

        {isTied ? (
          <div className={classes.tieList}>
            {card.winners.map((w, idx) => (
              <Badge key={`${w.id}_${idx}`} variant="light" size="md">
                {w.label} — {w.value} {card.unit}
              </Badge>
            ))}
            <Text size="xs" c="dimmed" mt={2}>
              Tied
            </Text>
          </div>
        ) : (
          card.winners.map((w, idx) => (
            <div key={`${w.id}_${idx}`}>
              <Group gap="xs" align="baseline">
                <Text className={classes.cardValue}>{w.label}</Text>
                <Text className={classes.cardUnit}>
                  {w.value} {card.unit}
                </Text>
              </Group>
              {w.detail && (
                <Text className={classes.cardDetail}>{w.detail}</Text>
              )}
            </div>
          ))
        )}
      </Stack>
    </div>
  );
};
