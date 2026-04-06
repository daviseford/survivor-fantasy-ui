import { Stack, Text, Title } from "@mantine/core";
import { ScoringLegendTable } from "../components/ScoringTables/ScoringLegendTable";

export const ScoringReference = () => {
  return (
    <Stack gap="lg" p="md" maw={900}>
      <div>
        <Title order={2}>Scoring Reference</Title>
        <Text c="dimmed" size="sm">
          Points awarded for in-game actions across all competitions.
        </Text>
      </div>
      <ScoringLegendTable />
    </Stack>
  );
};
