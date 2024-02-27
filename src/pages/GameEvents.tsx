import { Stack, Title } from "@mantine/core";
import { CreateGameEvent, GameEventsCRUDTable } from "../components/GameEvents";

export const GameEventsPage = () => {
  return (
    <div>
      <Stack gap={"xl"}>
        <Title order={2}>Manage Game Events</Title>
        <CreateGameEvent />
        <GameEventsCRUDTable />
      </Stack>
    </div>
  );
};
