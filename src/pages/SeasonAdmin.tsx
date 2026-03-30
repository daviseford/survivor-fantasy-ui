import {
  Badge,
  Center,
  Group,
  Loader,
  Select,
  Stack,
  Tabs,
  Text,
  Title,
  rem,
} from "@mantine/core";
import {
  IconCalendar,
  IconKarate,
  IconList,
  IconUserX,
  IconUsersGroup,
} from "@tabler/icons-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
        <Text c="red" fw={500}>
          Unauthorized
        </Text>
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

  return (
    <Stack gap="md" p="md">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div>
          <Badge variant="light" size="sm" mb={4}>
            Season {season.order}
          </Badge>
          <Title order={2}>Manage {season.name}</Title>
          <Text c="dimmed" size="sm">
            {season.players?.length ?? 0} players ·{" "}
            {season.episodes?.length ?? 0} episodes
          </Text>
        </div>
        <Select
          placeholder="Switch season"
          data={seasonOptions}
          value={seasonId ?? null}
          onChange={handleSeasonChange}
          w={250}
          size="sm"
          clearable={false}
        />
      </Group>

      <Tabs value={activeTab} onChange={handleTabChange}>
        <Tabs.List>
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
