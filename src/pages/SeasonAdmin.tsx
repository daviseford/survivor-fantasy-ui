import {
  Center,
  Loader,
  Select,
  Stack,
  Tabs,
  Text,
  Title,
  rem,
} from "@mantine/core";
import { useFirestoreQueryData } from "@react-query-firebase/firestore";
import {
  IconCalendar,
  IconKarate,
  IconList,
  IconUserX,
  IconUsersGroup,
} from "@tabler/icons-react";
import { collection } from "firebase/firestore";
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
import { db } from "../firebase";
import { useSeason } from "../hooks/useSeason";
import { useUser } from "../hooks/useUser";
import { Season } from "../types";

const VALID_TABS = [
  "episodes",
  "events",
  "challenges",
  "eliminations",
  "teams",
];
const DEFAULT_TAB = "episodes";

export const SeasonAdmin = () => {
  const { slimUser } = useUser();
  const { seasonId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get("tab");
  const activeTab =
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : DEFAULT_TAB;

  const { data: season, isLoading: isSeasonLoading } = useSeason();

  const seasonsRef = collection(db, "seasons");
  const { data: seasons } = useFirestoreQueryData<Season[], Season[]>(
    ["seasons"],
    // @ts-expect-error react-query-firebase type mismatch with Firestore ref
    seasonsRef,
  );

  const iconStyle = { width: rem(12), height: rem(12) };

  if (!slimUser?.isAdmin) {
    return <Text c="red">DENIED!</Text>;
  }

  if (isSeasonLoading) {
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
      ?.sort((a, b) => b.order - a.order)
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
    <Stack gap="md">
      <div>
        <Title order={2} mb="xs">
          Manage {season.name}
        </Title>
        <Select
          label="Switch season"
          data={seasonOptions}
          value={seasonId ?? null}
          onChange={handleSeasonChange}
          w={300}
        />
      </div>

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
