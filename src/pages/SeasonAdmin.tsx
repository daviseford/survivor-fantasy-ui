import {
  Alert,
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  Select,
  Stack,
  Tabs,
  Text,
  Title,
  rem,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconCalendar,
  IconKarate,
  IconList,
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

const iconStyle = { width: rem(16), height: rem(16) };

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
    return (
      <Stack gap="md" p="md">
        <Alert
          color="red"
          icon={<IconAlertCircle size={16} />}
          title="Season not found"
        >
          No season matched "{seasonId}".
        </Alert>
        <Button component={Link} to="/admin" variant="light" w="fit-content">
          Back to dashboard
        </Button>
      </Stack>
    );
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
        </Stack>
      </Paper>

      <Tabs value={activeTab} onChange={handleTabChange}>
        <Tabs.List grow aria-label="Season data management">
          <Tabs.Tab
            value="episodes"
            leftSection={<IconList style={iconStyle} />}
            aria-label="Episodes"
          >
            <Text visibleFrom="sm">Episodes</Text>
          </Tabs.Tab>
          <Tabs.Tab
            value="events"
            leftSection={<IconCalendar style={iconStyle} />}
            aria-label="Events"
          >
            <Text visibleFrom="sm">Events</Text>
          </Tabs.Tab>
          <Tabs.Tab
            value="challenges"
            leftSection={<IconKarate style={iconStyle} />}
            aria-label="Challenges"
          >
            <Text visibleFrom="sm">Challenges</Text>
          </Tabs.Tab>
          <Tabs.Tab
            value="eliminations"
            leftSection={<IconUserX style={iconStyle} />}
            aria-label="Eliminations"
          >
            <Text visibleFrom="sm">Eliminations</Text>
          </Tabs.Tab>
          <Tabs.Tab
            value="teams"
            leftSection={<IconUsersGroup style={iconStyle} />}
            aria-label="Teams"
          >
            <Text visibleFrom="sm">Teams</Text>
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="episodes" pt="lg">
          <Stack gap="xl">
            <CreateEpisode />
            <EpisodeCRUDTable />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="events" pt="lg">
          <Stack gap="xl">
            <CreateGameEvent />
            <GameEventsCRUDTable />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="challenges" pt="lg">
          <Stack gap="xl">
            <CreateChallenge />
            <ChallengeCRUDTable />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="eliminations" pt="lg">
          <Stack gap="xl">
            <CreateElimination />
            <EliminationCRUDTable />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="teams" pt="lg">
          <Stack gap="xl">
            <CreateTeam />
            <TeamCRUDTable />
            <TeamPlayerManager />
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};
