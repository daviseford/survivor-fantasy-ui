import { Card, Stack, Text } from "@mantine/core";
import { StatCard } from "../../utils/seasonStats";
import classes from "./SeasonStatsSection.module.css";

export const SeasonStatsCard = ({ card }: { card: StatCard }) => {
  const isNegative = card.tone === "negative";
  const isTied = card.winners.length > 1;

  return (
    <Card
      padding="sm"
      radius="md"
      withBorder
      className={`${classes.card} ${isNegative ? classes.cardNegative : ""}`}
    >
      <Stack gap={4}>
        <Text size="xs" tt="uppercase" lts="0.4px" c="dimmed" fw={500}>
          {card.title}
        </Text>
        {card.subtitle && (
          <Text size="xs" c="dimmed" mt={-2}>
            {card.subtitle}
          </Text>
        )}

        {isTied ? (
          <div>
            <Text size="sm" fw={700} lh={1.3}>
              {card.winners.map((w) => w.label).join(", ")}
            </Text>
            <Text size="xs" c="dimmed">
              Tied — {card.winners[0].value} {card.unit}
            </Text>
          </div>
        ) : (
          card.winners.map((w, idx) => (
            <div key={`${w.id}_${idx}`}>
              <Text size="lg" fw={700} lh={1.2}>
                {w.label}
              </Text>
              <Text size="xs" c="dimmed">
                {w.value} {card.unit}
                {w.detail ? ` · ${w.detail}` : ""}
              </Text>
            </div>
          ))
        )}
      </Stack>
    </Card>
  );
};
