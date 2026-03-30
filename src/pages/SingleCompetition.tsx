import {
  Accordion,
  Divider,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { PlayerGroupGrid } from "../components/MyPlayers";
import { PropBetScoring } from "../components/PropBetTables";
import {
  PerSurvivorPerEpisodeDetailedScoringTable,
  PerUserPerEpisodeScoringTable,
  ScoringLegendTable,
} from "../components/ScoringTables";
import { useCompetition } from "../hooks/useCompetition";
import { useSeason } from "../hooks/useSeason";

export const SingleCompetition = () => {
  const { data: competition } = useCompetition();

  const { data: season } = useSeason(competition?.season_id);

  if (!competition || !season) return null;

  return (
    <Stack gap="xl" p="lg">
      <div>
        <Text c="dimmed" size="sm">
          Season {competition.season_num}
        </Text>
        <Title order={2}>{competition.competition_name}</Title>
      </div>

      <PlayerGroupGrid />

      <Divider />

      <section>
        <Title order={3} mb="sm">
          Standings
        </Title>
        <PerUserPerEpisodeScoringTable />
      </section>

      {competition.prop_bets && (
        <>
          <Divider />
          <section>
            <Title order={3} mb="sm">
              Prop Bets
            </Title>
            <PropBetScoring />
          </section>
        </>
      )}

      <Divider />

      <section>
        <Title order={3} mb="sm">
          Player Scores
        </Title>
        <PerSurvivorPerEpisodeDetailedScoringTable />
      </section>

      <Divider />

      <Accordion variant="subtle">
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
