import {
  Accordion,
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  IconArrowLeft,
  IconArrowsExchange,
  IconChartLine,
  IconClipboardList,
  IconCrystalBall,
  IconFlame,
  IconLayoutDashboard,
  IconLogin,
  IconTrophy,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AwaitingDataBanner } from "../components/AwaitingDataBanner";
import { EpisodeAdvanceControl } from "../components/EpisodeAdvanceControl";
import { PlayerGroupGrid } from "../components/MyPlayers";
import { PropBetScoring } from "../components/PropBetTables";
import {
  PerSurvivorPerEpisodeDetailedScoringTable,
  PerUserPerEpisodeScoringTable,
  ScoringLegendTable,
} from "../components/ScoringTables";
import { SeasonStatsSection } from "../components/SeasonStats";
import { TradesSection } from "../components/Trades";
import { useAutoFinishCompetition } from "../hooks/useAutoFinishCompetition";
import { useChallenges } from "../hooks/useChallenges";
import { useCompetition } from "../hooks/useCompetition";
import { useEliminations } from "../hooks/useEliminations";
import { useEvents } from "../hooks/useEvents";
import { usePropBetScoring } from "../hooks/useGetPropBetScoring";
import { useSeason } from "../hooks/useSeason";
import { useSeasonStats } from "../hooks/useSeasonStats";
import { useTrades } from "../hooks/useTrades";
import { useUser } from "../hooks/useUser";
import {
  getCompetitionAwaitingDataEpisode,
  getLatestDataEpisode,
} from "../utils/episodeAirDate";
import classes from "./SingleCompetition.module.css";

const VALID_TABS = ["overview", "trades", "stats"] as const;
type TabValue = (typeof VALID_TABS)[number];
const DEFAULT_TAB: TabValue = "overview";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const tabsRef = useRef<HTMLDivElement>(null);
  const { data: competition, isLoading: isCompetitionLoading } =
    useCompetition();
  const { slimUser, isAuthReady } = useUser();
  const { activeKeys: activePropBetKeys } = usePropBetScoring();
  const tradeState = useTrades(competition?.id);

  const { data: season } = useSeason(competition?.season_id);
  const { data: unfilteredEvents, isReady: areEventsReady } = useEvents(
    competition?.season_id,
  );
  const { data: challenges, isReady: areChallengesReady } = useChallenges(
    competition?.season_id,
  );
  const { data: eliminations, isReady: areEliminationsReady } = useEliminations(
    competition?.season_id,
  );
  const seasonStats = useSeasonStats();

  const tabParam = searchParams.get("tab");
  const activeTab: TabValue =
    tabParam && (VALID_TABS as readonly string[]).includes(tabParam)
      ? (tabParam as TabValue)
      : DEFAULT_TAB;

  const handleTabChange = (value: string | null) => {
    if (!value || value === activeTab) return;

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("tab", value);
    setSearchParams(nextSearchParams);

    window.requestAnimationFrame(() => {
      tabsRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
    });
  };

  useAutoFinishCompetition({
    events: unfilteredEvents,
    competition,
    episodes: season?.episodes ?? [],
    slimUser,
  });

  // Competitions are readable only by signed-in users (firestore.rules), so a
  // signed-out visitor, typically arriving from a shared link, is sent
  // straight to sign-in. The modal closes itself on success; the cleanup also
  // closes it on navigation away and keeps Strict Mode's double-run from
  // stacking two modals.
  const requiresSignIn = isAuthReady && !slimUser;
  useEffect(() => {
    if (!requiresSignIn) return;
    const modalId = modals.openContextModal({
      modal: "AuthModal",
      innerProps: {
        initialMode: "login",
        actionDescription: "Sign in to view this competition",
      },
    });
    return () => modals.close(modalId);
  }, [requiresSignIn]);

  if (requiresSignIn) {
    return (
      <Center py="xl">
        <Stack align="center" gap="md">
          <Alert title="Sign in to view this competition">
            Competitions are only visible to signed-in users. Sign in to see the
            standings, or create a free account if you're new here.
          </Alert>
          <Group gap="sm">
            <Button
              leftSection={<IconLogin size={18} />}
              onClick={() =>
                modals.openContextModal({
                  modal: "AuthModal",
                  innerProps: {
                    initialMode: "login",
                    actionDescription: "Sign in to view this competition",
                  },
                })
              }
            >
              Sign in
            </Button>
            <Button
              variant="default"
              leftSection={<IconUserPlus size={18} />}
              onClick={() =>
                modals.openContextModal({
                  modal: "AuthModal",
                  innerProps: {
                    initialMode: "register",
                    actionDescription:
                      "Create an account to view this competition",
                  },
                })
              }
            >
              Create account
            </Button>
          </Group>
        </Stack>
      </Center>
    );
  }

  if (!competition && !isCompetitionLoading) {
    return (
      <Center py="xl">
        <Stack align="center" gap="md">
          <Alert color="yellow" title="Competition not found">
            This competition doesn't exist or may have been removed.
          </Alert>
          <Button
            component={Link}
            to="/competitions"
            variant="default"
            leftSection={<IconArrowLeft size={18} />}
          >
            Back to competitions
          </Button>
        </Stack>
      </Center>
    );
  }

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
  const showEpisodeControl = isWatchAlong || isCreator;
  const hasWinner = Object.values(unfilteredEvents).some(
    (e) => e.action === "win_survivor",
  );

  const latestDataEpisode = getLatestDataEpisode(
    challenges,
    eliminations,
    unfilteredEvents,
  );
  const isScoringDataReady =
    areChallengesReady && areEliminationsReady && areEventsReady;
  const awaitingDataEpisode = getCompetitionAwaitingDataEpisode({
    season,
    latestDataEpisode,
    isScoringDataReady,
    currentEpisode: competition.current_episode,
    finished: competition.finished,
    hasWinner,
  });
  const latestVisibleDataEpisode = isWatchAlong
    ? Math.min(latestDataEpisode, competition.current_episode ?? 0)
    : latestDataEpisode;
  const hasSeasonStats =
    latestVisibleDataEpisode > 0 &&
    seasonStats != null &&
    (seasonStats.castawayCards.length > 0 ||
      seasonStats.rosterStats.length > 0);
  const incomingTradeCount = slimUser?.uid
    ? tradeState.data.filter(
        (trade) =>
          trade.status === "pending" && trade.offered_to_uid === slimUser.uid,
      ).length
    : 0;
  const tradesTabLabel =
    incomingTradeCount > 0
      ? `Trades, ${incomingTradeCount} pending ${incomingTradeCount === 1 ? "offer" : "offers"}`
      : "Trades";

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
      <Box
        className={classes.competitionHeader}
        data-has-episode-control={showEpisodeControl || undefined}
      >
        <Box className={classes.competitionIdentity}>
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

        {showEpisodeControl && (
          <Box className={classes.episodeControl}>
            <EpisodeAdvanceControl
              competition={competition}
              season={season}
              isCreator={isCreator}
              hasWinner={hasWinner}
            />
          </Box>
        )}
      </Box>

      {awaitingDataEpisode && (
        <AwaitingDataBanner episode={awaitingDataEpisode} />
      )}

      <Box ref={tabsRef} className={classes.tabsAnchor}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tabs.List
            grow
            aria-label="Competition sections"
            className={classes.tabsList}
          >
            <Tabs.Tab
              value="overview"
              leftSection={<IconLayoutDashboard size={17} />}
              className={classes.tab}
            >
              Overview
            </Tabs.Tab>
            <Tabs.Tab
              value="trades"
              leftSection={<IconArrowsExchange size={17} />}
              className={classes.tab}
              aria-label={tradesTabLabel}
            >
              <span className={classes.tabLabel}>
                Trades
                {incomingTradeCount > 0 && (
                  <Badge
                    size="xs"
                    variant="filled"
                    color="grape"
                    circle={incomingTradeCount < 10}
                    className={classes.tabBadge}
                    aria-hidden="true"
                  >
                    {incomingTradeCount > 99 ? "99+" : incomingTradeCount}
                  </Badge>
                )}
              </span>
            </Tabs.Tab>
            <Tabs.Tab
              value="stats"
              leftSection={<IconFlame size={17} />}
              className={classes.tab}
            >
              Stats
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview" pt="lg">
            <Stack gap="xl">
              <Section
                title="Rosters"
                subtitle="Castaways by participant. Accepted trades land at the next episode reveal"
                icon={
                  <IconUsers size={22} color="var(--mantine-color-blue-6)" />
                }
              >
                <PlayerGroupGrid />
              </Section>

              <Section
                title="Standings"
                subtitle="Points by player across all episodes"
                icon={
                  <IconTrophy size={22} color="var(--mantine-color-yellow-6)" />
                }
              >
                <PerUserPerEpisodeScoringTable />
              </Section>

              {activePropBetKeys.length > 0 && (
                <Section
                  title="Prop Bets"
                  subtitle="Pre-season predictions and results"
                  icon={
                    <IconCrystalBall
                      size={22}
                      color="var(--mantine-color-violet-6)"
                    />
                  }
                >
                  <PropBetScoring />
                </Section>
              )}

              <Section
                title="Player Scores"
                subtitle="Detailed scoring for each contestant by episode"
                icon={
                  <IconChartLine
                    size={22}
                    color="var(--mantine-color-teal-6)"
                  />
                }
              >
                <PerSurvivorPerEpisodeDetailedScoringTable />
              </Section>

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
          </Tabs.Panel>

          <Tabs.Panel value="trades" pt="lg">
            <Section
              title="Trades"
              subtitle="Trade active players with other participants"
              icon={
                <IconArrowsExchange
                  size={22}
                  color="var(--mantine-color-grape-6)"
                />
              }
            >
              <TradesSection
                trades={tradeState.data}
                tradesLoaded={tradeState.loaded}
                tradesError={tradeState.error}
              />
            </Section>
          </Tabs.Panel>

          <Tabs.Panel value="stats" pt="lg">
            <Section
              title="Season Stats"
              subtitle="Key storylines and standout performances"
              icon={
                <IconFlame size={22} color="var(--mantine-color-orange-6)" />
              }
            >
              {!isScoringDataReady ? (
                <Center py="xl">
                  <Stack align="center" gap="xs">
                    <Loader size="sm" aria-label="Loading season stats" />
                    <Text size="sm" c="dimmed">
                      Loading season stats…
                    </Text>
                  </Stack>
                </Center>
              ) : hasSeasonStats ? (
                <SeasonStatsSection stats={seasonStats} />
              ) : (
                <Center py={{ base: "xl", sm: 48 }}>
                  <Stack align="center" gap="xs" maw={520}>
                    <ThemeIcon
                      variant="light"
                      color="orange"
                      size="xl"
                      radius="xl"
                    >
                      <IconFlame size={22} />
                    </ThemeIcon>
                    <Title order={4} ta="center">
                      Season stats are just getting started
                    </Title>
                    <Text size="sm" c="dimmed" ta="center">
                      Highlights and roster trends will appear after the first
                      episode's scoring data is available.
                    </Text>
                  </Stack>
                </Center>
              )}
            </Section>
          </Tabs.Panel>
        </Tabs>
      </Box>
    </Stack>
  );
};
