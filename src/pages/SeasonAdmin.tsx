import {
  Calendar,
  List,
  Swords,
  UserX,
  Users,
} from "lucide-react";
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
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
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
      <div className="flex items-center justify-center py-8">
        <p className="font-medium text-destructive">Unauthorized</p>
      </div>
    );
  }

  if (isSeasonLoading || isSeasonsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!season) {
    return <p className="text-destructive">Season not found: {seasonId}</p>;
  }

  const seasonOptions = seasons
    ?.slice()
    .sort((a, b) => b.order - a.order)
    .map((s) => ({
      value: s.id,
      label: s.name,
    })) ?? [];

  const handleSeasonChange = (value: string) => {
    if (value) {
      navigate(`/admin/${value}?tab=${activeTab}`);
    }
  };

  const handleTabChange = (value: string) => {
    if (value) {
      setSearchParams({ tab: value }, { replace: true });
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge variant="secondary" className="mb-1">
            Season {season.order}
          </Badge>
          <h2 className="text-2xl font-bold">Manage {season.name}</h2>
          <p className="text-sm text-muted-foreground">
            {season.players?.length ?? 0} players &middot;{" "}
            {season.episodes?.length ?? 0} episodes
          </p>
        </div>
        <Select
          value={seasonId ?? undefined}
          onValueChange={handleSeasonChange}
        >
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Switch season" />
          </SelectTrigger>
          <SelectContent>
            {seasonOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="episodes">
            <List className="mr-1 h-3 w-3" />
            Episodes
          </TabsTrigger>
          <TabsTrigger value="events">
            <Calendar className="mr-1 h-3 w-3" />
            Events
          </TabsTrigger>
          <TabsTrigger value="challenges">
            <Swords className="mr-1 h-3 w-3" />
            Challenges
          </TabsTrigger>
          <TabsTrigger value="eliminations">
            <UserX className="mr-1 h-3 w-3" />
            Eliminations
          </TabsTrigger>
          <TabsTrigger value="teams">
            <Users className="mr-1 h-3 w-3" />
            Teams
          </TabsTrigger>
        </TabsList>

        <TabsContent value="episodes" className="space-y-6 pt-4">
          <CreateEpisode />
          <EpisodeCRUDTable />
        </TabsContent>

        <TabsContent value="events" className="space-y-6 pt-4">
          <CreateGameEvent />
          <GameEventsCRUDTable />
        </TabsContent>

        <TabsContent value="challenges" className="space-y-6 pt-4">
          <CreateChallenge />
          <ChallengeCRUDTable />
        </TabsContent>

        <TabsContent value="eliminations" className="space-y-6 pt-4">
          <CreateElimination />
          <EliminationCRUDTable />
        </TabsContent>

        <TabsContent value="teams" className="space-y-6 pt-4">
          <CreateTeam />
          <TeamCRUDTable />
          <TeamPlayerManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};
