import {
  Alert,
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Title,
  rem,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconCalendar,
  IconKarate,
  IconList,
  IconSparkles,
  IconUserX,
  IconUsersGroup,
} from "@tabler/icons-react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ChallengeCRUDTable, CreateChallenge } from "../components/Challenges";
import {
  CreateElimination,
  EliminationCRUDTable,
} from "../components/Eliminations";
import { CreateEpisode, EpisodeCRUDTable } from "../components/Episodes";
import { CreateGameEvent, GameEventsCRUDTable } from "../components/GameEvents";
import {
  CreateTeam,
  TeamCRUDTable,
  TeamPlayerManager,
} from "../components/Teams";
import { useSeason } from "../hooks/useSeason";
import { useSeasons } from "../hooks/useSeasons";
import { useUser } from "../hooks/useUser";

const VALID_TABS = [
  "episodes",
  "events",
  "challenges",
  "eliminations",
  "teams",
] as const;
type TabValue = (typeof VALID_TABS)[number];
const DEFAULT_TAB: TabValue = "episodes";

const iconStyle = { width: rem(12), height: rem(12) };

export const SeasonAdmin = () => {
  const { slimUser } = useUser();
  const { seasonId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get("tab");
  const activeTab: TabValue =
    tabParam && (VALID_TABS as readonly string[]).includes(tabParam)
      ? (tabParam as TabValue)
      : DEFAULT_TAB;

  const { data: season, isLoading: isSeasonLoading } = useSeason();
  const { data: seasons, isLoading: isSeasonsLoading } = useSeasons();

  if (!slimUser?.isAdmin) {
    return (
      <Center py="xl">
        <Text c="dimmed">You need admin access to view this page.</Text>
      </Center>
    );
  }

  if (isSeasonLoading || isSeasonsLoading) {
    return (
      <Center>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!season) {
    return <Text c="red">Season not found: {seasonId}</Text>;
  }

  const seasonOptions =
    seasons
      ?.slice()
      .sort((a, b) => b.order - a.order)
      .map((s) => ({
        value: s.id,
        label: s.name,
      })) ?? [];

  const handleSeasonChange = (value: string | null) => {
    if (value) {
      navigate(`/admin/${value}?tab=${activeTab}`);
    }
  };

  const handleTabChange = (value: string | null) => {
    if (value) {
      setSearchParams({ tab: value }, { replace: true });
    }
  };

  const tabDescriptions: Record<
    TabValue,
    { title: string; description: string }
  > = {
    episodes: {
      title: "Episode setup",
      description:
        "Define the weekly structure first so the rest of the season data has the right episode context.",
    },
    events: {
      title: "Scoring events",
      description:
        "Log player actions for the selected episode. Use this after the episode shell exists.",
    },
    challenges: {
      title: "Challenge results",
      description:
        "Record reward or immunity winners once the episode and player context are ready.",
    },
    eliminations: {
      title: "Elimination order",
      description:
        "Track boots, medevacs, quits, and vote totals in season order.",
    },
    teams: {
      title: "Tribe and team management",
      description:
        "Create teams, assign colors, and manage episode-by-episode tribe membership.",
    },
  };

  return (
    <Stack gap="md" p="md">
      <Button
        component={Link}
        to="/admin"
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        w="fit-content"
        px={0}
      >
        Back to admin dashboard
      </Button>

      <Paper withBorder p="lg" radius="md">
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <div>
              <Badge variant="light" size="sm" mb={4}>
                Season {season.order}
              </Badge>
              <Title order={2}>Manage {season.name}</Title>
              <Text c="dimmed" size="sm" mt={4}>
                Update the season in order: episodes first, then events,
                challenges, eliminations, and team state.
              </Text>
            </div>
            <Select
              label="Switch season"
              placeholder="Switch season"
              data={seasonOptions}
              value={seasonId ?? null}
              onChange={handleSeasonChange}
              w={260}
              size="sm"
              clearable={false}
            />
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <Paper withBorder radius="md" p="md">
              <Text size="xs" tt="uppercase" c="dimmed" fw={700}>
                Castaways
              </Text>
              <Text fw={700} mt={6}>
                {season.players?.length ?? 0}
              </Text>
              <Text size="sm" c="dimmed" mt={4}>
                Active roster available for season operations.
              </Text>
            </Paper>
            <Paper withBorder radius="md" p="md">
              <Text size="xs" tt="uppercase" c="dimmed" fw={700}>
                Episodes
              </Text>
              <Text fw={700} mt={6}>
                {season.episodes?.length ?? 0}
              </Text>
              <Text size="sm" c="dimmed" mt={4}>
                Weekly structure that drives all other admin records.
              </Text>
            </Paper>
            <Paper withBorder radius="md" p="md">
              <Group justify="space-between" align="start">
                <div>
                  <Text size="xs" tt="uppercase" c="dimmed" fw={700}>
                    Current Workspace
                  </Text>
                  <Text fw={700} mt={6}>
                    {tabDescriptions[activeTab].title}
                  </Text>
                </div>
                <IconSparkles size={16} color="var(--mantine-color-blue-6)" />
              </Group>
              <Text size="sm" c="dimmed" mt={4}>
                {tabDescriptions[activeTab].description}
              </Text>
            </Paper>
          </SimpleGrid>

          <Alert color="blue" variant="light">
            <Text size="sm">
              Recommended weekly flow: create or confirm the episode, add player
              events, log challenge winners, record eliminations, then update
              team assignments if the tribe structure changed.
            </Text>
          </Alert>
        </Stack>
      </Paper>

      <Tabs value={activeTab} onChange={handleTabChange}>
        <Tabs.List grow>
          <Tabs.Tab
            value="episodes"
            leftSection={<IconList style={iconStyle} />}
          >
            Episodes
          </Tabs.Tab>
          <Tabs.Tab
            value="events"
            leftSection={<IconCalendar style={iconStyle} />}
          >
            Events
          </Tabs.Tab>
          <Tabs.Tab
            value="challenges"
            leftSection={<IconKarate style={iconStyle} />}
          >
            Challenges
          </Tabs.Tab>
          <Tabs.Tab
            value="eliminations"
            leftSection={<IconUserX style={iconStyle} />}
          >
            Eliminations
          </Tabs.Tab>
          <Tabs.Tab
            value="teams"
            leftSection={<IconUsersGroup style={iconStyle} />}
          >
            Teams
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="episodes" pt="lg">
          <Stack gap="xl">
            <div>
              <Title order={3}>{tabDescriptions.episodes.title}</Title>
              <Text c="dimmed" size="sm" mt={4}>
                {tabDescriptions.episodes.description}
              </Text>
            </div>
            <CreateEpisode />
            <EpisodeCRUDTable />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="events" pt="lg">
          <Stack gap="xl">
            <div>
              <Title order={3}>{tabDescriptions.events.title}</Title>
              <Text c="dimmed" size="sm" mt={4}>
                {tabDescriptions.events.description}
              </Text>
            </div>
            <CreateGameEvent />
            <GameEventsCRUDTable />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="challenges" pt="lg">
          <Stack gap="xl">
            <div>
              <Title order={3}>{tabDescriptions.challenges.title}</Title>
              <Text c="dimmed" size="sm" mt={4}>
                {tabDescriptions.challenges.description}
              </Text>
            </div>
            <CreateChallenge />
            <ChallengeCRUDTable />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="eliminations" pt="lg">
          <Stack gap="xl">
            <div>
              <Title order={3}>{tabDescriptions.eliminations.title}</Title>
              <Text c="dimmed" size="sm" mt={4}>
                {tabDescriptions.eliminations.description}
              </Text>
            </div>
            <CreateElimination />
            <EliminationCRUDTable />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="teams" pt="lg">
          <Stack gap="xl">
            <div>
              <Title order={3}>{tabDescriptions.teams.title}</Title>
              <Text c="dimmed" size="sm" mt={4}>
                {tabDescriptions.teams.description}
              </Text>
            </div>
            <CreateTeam />
            <TeamCRUDTable />
            <TeamPlayerManager />
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};
