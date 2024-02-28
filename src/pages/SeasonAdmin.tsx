import { Stack, Tabs, Text, rem } from "@mantine/core";
import { IconCalendar, IconKarate, IconUserX } from "@tabler/icons-react";
import { ChallengeCRUDTable, CreateChallenge } from "../components/Challenges";
import {
  CreateElimination,
  EliminationCRUDTable,
} from "../components/Eliminations";
import { CreateGameEvent, GameEventsCRUDTable } from "../components/GameEvents";
import { useUser } from "../hooks/useUser";

export const SeasonAdmin = () => {
  const { slimUser } = useUser();

  const iconStyle = { width: rem(12), height: rem(12) };

  if (!slimUser?.isAdmin) {
    return <Text c="red">DENIED!</Text>;
  }

  return (
    <div>
      <Tabs defaultValue="events">
        <Tabs.List>
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
        </Tabs.List>

        <Tabs.Panel value="events" pt={"lg"}>
          <Stack gap={"xl"}>
            {/* <Title order={2}>Manage Game Events</Title> */}
            <CreateGameEvent />
            <GameEventsCRUDTable />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="challenges" pt={"lg"}>
          <Stack gap={"xl"}>
            {/* <Title order={2}>Manage Challenges</Title> */}
            <CreateChallenge />
            <ChallengeCRUDTable />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="eliminations" pt={"lg"}>
          <Stack gap={"xl"}>
            {/* <Title order={2}>Manage Challenges</Title> */}
            <CreateElimination />
            <EliminationCRUDTable />
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
};
