import { Card, Group, Stack, Text } from "@mantine/core";
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
      className={isNegative ? classes.cardNegative : undefined}
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

        {card.winners.map((w, idx) => (
          <div key={`${w.id}_${idx}`}>
            <Group gap="xs" align="baseline" wrap="nowrap">
              <Text size="lg" fw={700} lh={1.2}>
                {w.label}
              </Text>
              <Text size="xs" c="dimmed">
                {w.value} {card.unit}
              </Text>
            </Group>
            {w.detail && (
              <Text size="xs" c="dimmed">
                {w.detail}
              </Text>
            )}
          </div>
        ))}
        {isTied && (
          <Text size="xs" c="dimmed">
            Tied
          </Text>
        )}
      </Stack>
    </Card>
  );
};
