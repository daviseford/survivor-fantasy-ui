import { Calendar, Swords, UserX } from "lucide-react";
import { ChallengeCRUDTable, CreateChallenge } from "../components/Challenges";
import {
  CreateElimination,
  EliminationCRUDTable,
} from "../components/Eliminations";
import { CreateGameEvent, GameEventsCRUDTable } from "../components/GameEvents";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useUser } from "../hooks/useUser";

export const SeasonAdmin = () => {
  const { slimUser } = useUser();

  if (!slimUser?.isAdmin) {
    return <p className="text-destructive">DENIED!</p>;
  }

  return (
    <div>
      <Tabs defaultValue="events">
        <TabsList>
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
        </TabsList>

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
      </Tabs>
    </div>
  );
};
