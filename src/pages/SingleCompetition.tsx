import {
  Accordion,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconChartLine,
  IconClipboardList,
  IconCrystalBall,
  IconFlame,
  IconTrophy,
  IconUsers,
} from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { EpisodeAdvanceControl } from "../components/EpisodeAdvanceControl";
import { PlayerGroupGrid } from "../components/MyPlayers";
import { PropBetScoring } from "../components/PropBetTables";
import {
  PerSurvivorPerEpisodeDetailedScoringTable,
  PerUserPerEpisodeScoringTable,
  ScoringLegendTable,
} from "../components/ScoringTables";
import { SeasonStatsSection } from "../components/SeasonStats";
import { useAutoFinishCompetition } from "../hooks/useAutoFinishCompetition";
import { useCompetition } from "../hooks/useCompetition";
import { useEvents } from "../hooks/useEvents";
import { usePropBetScoring } from "../hooks/useGetPropBetScoring";
import { useSeason } from "../hooks/useSeason";
import { useSeasonStats } from "../hooks/useSeasonStats";
import { useUser } from "../hooks/useUser";

const Section = ({
  title,
  subtitle,
  icon,
  children,
}: React.PropsWithChildren<{
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}>) => (
  <Paper p={{ base: "sm", sm: "lg" }} radius="md" withBorder>
    <Stack gap="md">
      <Group gap="sm" align="center">
        {icon}
        <div>
          <Title order={3}>{title}</Title>
          {subtitle && (
            <Text size="sm" c="dimmed">
              {subtitle}
            </Text>
          )}
        </div>
      </Group>
      {children}
    </Stack>
  </Paper>
);

export const SingleCompetition = () => {
  const { data: competition } = useCompetition();
  const { slimUser } = useUser();
  const { activeKeys: activePropBetKeys } = usePropBetScoring();

  const { data: season } = useSeason(competition?.season_id);
  const { data: unfilteredEvents } = useEvents(competition?.season_id);
  const seasonStats = useSeasonStats();

  useAutoFinishCompetition({
    events: unfilteredEvents,
    competition,
    episodes: season?.episodes ?? [],
    slimUser,
  });

  if (!competition || !season) {
    return (
      <Center h="60vh">
        <Loader size="lg" />
      </Center>
    );
  }

  const episodeCount = season.episodes?.length ?? 0;
  const isCreator = slimUser?.uid === competition.creator_uid;
  const isWatchAlong = competition.current_episode != null;
  const hasWinner = Object.values(unfilteredEvents).some(
    (e) => e.action === "win_survivor",
  );

  return (
    <Stack gap="xl" p={{ base: "sm", sm: "lg" }}>
      <Button
        component={Link}
        to="/competitions"
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        w="fit-content"
      >
        Back to competitions
      </Button>
      <Box>
        <Group gap="xs" mb={4}>
          <Badge variant="light" size="sm">
            Season {competition.season_num}
          </Badge>
          <Badge variant="light" color="gray" size="sm">
            {competition.participants.length} players
          </Badge>
          {episodeCount > 0 && !isWatchAlong && (
            <Badge variant="light" color="gray" size="sm">
              {episodeCount} {episodeCount === 1 ? "episode" : "episodes"}
            </Badge>
          )}
        </Group>
        <Title order={2}>{competition.competition_name}</Title>
      </Box>

      <EpisodeAdvanceControl
        competition={competition}
        season={season}
        isCreator={isCreator}
        hasWinner={hasWinner}
      />

      <Section
        title="Teams"
        subtitle="Drafted contestants by player"
        icon={<IconUsers size={22} color="var(--mantine-color-blue-6)" />}
      >
        <PlayerGroupGrid />
      </Section>

      <Section
        title="Standings"
        subtitle="Points by player across all episodes"
        icon={<IconTrophy size={22} color="var(--mantine-color-yellow-6)" />}
      >
        <PerUserPerEpisodeScoringTable />
      </Section>

      {activePropBetKeys.length > 0 && (
        <Section
          title="Prop Bets"
          subtitle="Pre-season predictions and results"
          icon={
            <IconCrystalBall size={22} color="var(--mantine-color-violet-6)" />
          }
        >
          <PropBetScoring />
        </Section>
      )}

      <Section
        title="Player Scores"
        subtitle="Detailed scoring for each contestant by episode"
        icon={<IconChartLine size={22} color="var(--mantine-color-teal-6)" />}
      >
        <PerSurvivorPerEpisodeDetailedScoringTable />
      </Section>

      {seasonStats &&
        (seasonStats.castawayCards.length > 0 ||
          seasonStats.rosterStats.length > 0) && (
          <Section
            title="Season Stats"
            subtitle="Key storylines and standout performances"
            icon={<IconFlame size={22} color="var(--mantine-color-orange-6)" />}
          >
            <SeasonStatsSection stats={seasonStats} />
          </Section>
        )}

      {/* <Section
        title="Scoring Breakdown"
        subtitle="Points by scoring category"
        icon={
          <IconChartDonut size={22} color="var(--mantine-color-orange-6)" />
        }
      >
        <ScoringBreakdownSection />
      </Section> */}

      <Accordion variant="subtle" radius="md">
        <Accordion.Item value="scoring-values">
          <Accordion.Control>
            <Group gap="sm">
              <IconClipboardList
                size={18}
                color="var(--mantine-color-dimmed)"
              />
              <Title order={4} c="dimmed">
                Scoring Reference
              </Title>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <ScoringLegendTable />
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
};
