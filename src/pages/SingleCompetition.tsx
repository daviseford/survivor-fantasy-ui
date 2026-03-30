import { Accordion, Box, Paper, Stack, Text, Title } from "@mantine/core";
import { PlayerGroupGrid } from "../components/MyPlayers";
import { PropBetScoring } from "../components/PropBetTables";
import {
  PerSurvivorPerEpisodeDetailedScoringTable,
  PerUserPerEpisodeScoringTable,
  ScoringLegendTable,
} from "../components/ScoringTables";
import { useCompetition } from "../hooks/useCompetition";
import { useSeason } from "../hooks/useSeason";

const Section = ({
  title,
  subtitle,
  children,
}: React.PropsWithChildren<{ title: string; subtitle?: string }>) => (
  <Paper p="lg" radius="md" withBorder>
    <Stack gap="sm">
      <div>
        <Title order={3}>{title}</Title>
        {subtitle && (
          <Text size="sm" c="dimmed">
            {subtitle}
          </Text>
        )}
      </div>
      {children}
    </Stack>
  </Paper>
);

export const SingleCompetition = () => {
  const { data: competition } = useCompetition();

  const { data: season } = useSeason(competition?.season_id);

  if (!competition || !season) return null;

  return (
    <Stack gap="lg" p="lg">
      <Box>
        <Text c="dimmed" size="sm" tt="uppercase" fw={600} lh={1.4}>
          Season {competition.season_num}
        </Text>
        <Title order={2}>{competition.competition_name}</Title>
      </Box>

      <PlayerGroupGrid />

      <Section
        title="Standings"
        subtitle="Points by player across all episodes"
      >
        <PerUserPerEpisodeScoringTable />
      </Section>

      {competition.prop_bets && (
        <Section
          title="Prop Bets"
          subtitle="Pre-season predictions and results"
        >
          <PropBetScoring />
        </Section>
      )}

      <Section
        title="Player Scores"
        subtitle="Detailed scoring for each contestant by episode"
      >
        <PerSurvivorPerEpisodeDetailedScoringTable />
      </Section>

      <Accordion variant="subtle" radius="md">
        <Accordion.Item value="scoring-values">
          <Accordion.Control>
            <Title order={4} c="dimmed">
              Scoring Reference
            </Title>
          </Accordion.Control>
          <Accordion.Panel>
            <ScoringLegendTable />
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
};
