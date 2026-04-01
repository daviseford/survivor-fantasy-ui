import {
  Accordion,
  Alert,
  Box,
  Button,
  Center,
  Group,
  Loader,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";
import { doc, setDoc } from "firebase/firestore";
import { useEffect } from "react";
import { v4 } from "uuid";
import { BASE_PLAYER_SCORING } from "../../data/scoring";
import { db } from "../../firebase";
import { useEliminations } from "../../hooks/useEliminations";
import { useSeason } from "../../hooks/useSeason";
import { CastawayId, GameEvent, GameEventActions } from "../../types";

export const CreateGameEvent = () => {
  const { data: season, isLoading } = useSeason();
  const { data: eliminations } = useEliminations(season?.id);

  const form = useForm<GameEvent>({
    initialValues: {
      id: `event_${v4()}`,
      season_num: 1,
      season_id: "season_1",
      episode_id: "episode_1",
      episode_num: 1,
      action: GameEventActions[0],
      multiplier: null,
      castaway_id: "" as CastawayId,
    },

    validate: {
      castaway_id: isNotEmpty("Select a player"),
    },

    transformValues: (values) => ({
      ...values,
      episode_id: `episode_${values.episode_num}`,
      season_id: `season_${values.season_num}`,
    }),
  });

  // Set initial values with async request
  useEffect(() => {
    if (season) {
      const episode_num = season.episodes.length;

      form.setValues({
        season_num: season.order,
        season_id: season.id,
        episode_num: episode_num,
        episode_id: `episode_${episode_num}`,
      });
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

  if (!season?.episodes?.length) {
    return (
      <Center>
        <Text>Create an Episode first before adding events</Text>
      </Center>
    );
  }

  const currentAction = BASE_PLAYER_SCORING.find(
    (x) => x.action === form.values.action,
  );

  const handleSubmit = async (values: GameEvent) => {
    const _validate = form.validate();
    if (_validate.hasErrors) return;

    if (!currentAction?.multiplier) {
      values.multiplier = null;
    }

    try {
      const ref = doc(db, `events/${season?.id}`);
      await setDoc(ref, { [values.id]: values }, { merge: true });

      notifications.show({
        title: "Event created successfully",
        message: `${values.action} for ${season?.castawayLookup?.[values.castaway_id]?.full_name ?? values.castaway_id}`,
        color: "green",
        icon: <IconCheck size={16} />,
      });

      // reset id and important form values
      form.setValues({ id: `event_${v4()}` });
    } catch (err) {
      notifications.show({
        title: "Failed to create event",
        message: err instanceof Error ? err.message : "Unknown error",
        color: "red",
        icon: <IconX size={16} />,
      });
    }
  };

  // Only exclude players eliminated before the selected episode
  const eliminatedCastaways = new Set(
    Object.values(eliminations)
      .filter((x) => x.episode_num < form.values.episode_num)
      .map((x) => x.castaway_id),
  );
  const playerOptions = season?.players
    .filter((x) => !eliminatedCastaways.has(x.castaway_id))
    .map((x) => ({ value: x.castaway_id, label: x.full_name }));

  return (
    <Accordion defaultValue="create-event">
      <Accordion.Item value="create-event">
        <Accordion.Control>
          <Title order={4}>Add Scoring Event</Title>
        </Accordion.Control>
        <Accordion.Panel>
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <Box maw={420} mx="auto">
              <form onSubmit={form.onSubmit((values) => handleSubmit(values))}>
                <TextInput
                  withAsterisk
                  readOnly
                  label="Season #"
                  value={form.values.season_num}
                />

                <NumberInput
                  withAsterisk
                  label="Episode #"
                  min={1}
                  max={season?.episodes.length}
                  {...form.getInputProps("episode_num")}
                />

                <Select
                  withAsterisk
                  label="Player"
                  data={playerOptions}
                  searchable
                  {...form.getInputProps("castaway_id")}
                />

                <Select
                  withAsterisk
                  label="Scoring Action"
                  data={GameEventActions}
                  searchable
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
                  <Button type="submit">Save Event</Button>
                </Group>
              </form>
            </Box>
            <Box>
              <Paper withBorder p="md" radius="md">
                <Title order={5} mb="xs">
                  Use this for player moments
                </Title>
                <Text size="sm" c="dimmed">
                  This form records scoring actions like idol finds, advantages,
                  and other player events tied to a specific episode.
                </Text>
                {currentAction?.multiplier && (
                  <Alert color="blue" variant="light" mt="md">
                    This action supports a count. Use <strong>How many?</strong>{" "}
                    when the same action happened multiple times.
                  </Alert>
                )}
              </Paper>
            </Box>
          </SimpleGrid>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
};
