import {
  Box,
  Button,
  Card,
  Center,
  Code,
  Group,
  Loader,
  NumberInput,
  Select,
  SimpleGrid,
  TextInput,
  Title,
} from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { doc, setDoc } from "firebase/firestore";
import { useEffect } from "react";
import { v4 } from "uuid";
import { BASE_PLAYER_SCORING } from "../../data/scoring";
import { db } from "../../firebase";
import { useEvents } from "../../hooks/useEvents";
import { useSeason } from "../../hooks/useSeason";
import { GameEvent, GameEventActions } from "../../types";

export const CreateGameEvent = () => {
  const { data: season, isLoading } = useSeason();

  const { refetch } = useEvents(season?.order);

  const eventId = `event_${v4()}`;

  const form = useForm<GameEvent>({
    initialValues: {
      id: eventId,
      season_id: 1,
      episode_id: 1,
      action: GameEventActions[0],
      multiplier: null,
      player_name: "",
    },

    validate: {
      player_name: isNotEmpty("Enter player name"),
    },
  });

  // Set initial values with async request
  useEffect(() => {
    if (season) {
      form.setValues({ season_id: season.order });
      form.resetDirty();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season]);

  if (isLoading) {
    return (
      <Center>
        <Loader size="xl" />
      </Center>
    );
  }

  const currentAction = BASE_PLAYER_SCORING.find(
    (x) => x.action === form.values.action,
  );

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement> | undefined,
  ) => {
    e?.preventDefault();

    const _validate = form.validate();
    if (_validate.hasErrors) return;

    const _action = BASE_PLAYER_SCORING.find(
      (x) => x.action === form.values.action,
    );

    const values = { ...form.values };

    // remove any old values if not needed
    if (!_action?.multiplier) {
      values.multiplier = null;
    }

    console.log({ values });

    const ref = doc(db, `events/${season?.id}`);

    await setDoc(ref, { [eventId]: values }, { merge: true });
    refetch();
  };

  return (
    <Card withBorder>
      <Card.Section p={"md"}>
        <Title order={4}>Create a new Event</Title>
      </Card.Section>

      <Card.Section p={"md"}>
        <SimpleGrid cols={2}>
          <Box maw={340} mx="auto">
            <form onSubmit={handleSubmit}>
              <TextInput
                withAsterisk
                readOnly
                label="Season #"
                value={form.values.season_id}
              />

              <NumberInput
                withAsterisk
                label="Episode #"
                min={1}
                max={season?.episodes.length}
                {...form.getInputProps("episode_id")}
              />

              <Select
                withAsterisk
                label="Player Name"
                data={season?.players.map((x) => x.name)}
                {...form.getInputProps("player_name")}
              />

              <Select
                withAsterisk
                label="Action"
                data={GameEventActions}
                {...form.getInputProps("action")}
                description={currentAction?.description}
              />

              {currentAction?.multiplier && (
                <NumberInput
                  withAsterisk
                  label="How many?"
                  {...form.getInputProps("multiplier")}
                />
              )}

              <Group justify="flex-end" mt="md">
                <Button type="submit">Submit</Button>
              </Group>
            </form>
          </Box>
          <Box>
            Generated Payload:
            <Code block>{JSON.stringify(form.values, null, 2)}</Code>
          </Box>
        </SimpleGrid>
      </Card.Section>
    </Card>
  );
};
