import { CreateGameEvent, GameEventsCRUDTable } from "../components/GameEvents";

export const EventsAdmin = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Manage Game Events</h2>
      <CreateGameEvent />
      <GameEventsCRUDTable />
    </div>
  );
};
