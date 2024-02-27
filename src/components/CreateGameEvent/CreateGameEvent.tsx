import {
  Box,
  Button,
  Center,
  Code,
  Group,
  Loader,
  NumberInput,
  Select,
  TextInput,
} from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { doc, setDoc } from "firebase/firestore";
import { useEffect } from "react";
import { v4 } from "uuid";
import { BASE_PLAYER_SCORING } from "../../data/scoring";
import { db } from "../../firebase";
import { useSeason } from "../../hooks/useSeason";
import { GameEvent, GameEventActions } from "../../types";

export const CreateGameEvent = () => {
  const { data: season, isLoading } = useSeason();

  const eventId = `event_${v4()}`;

  const form = useForm<GameEvent>({
    initialValues: {
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

    return form.onSubmit(async (values) => {
      const _action = BASE_PLAYER_SCORING.find(
        (x) => x.action === form.values.action,
      );

      // remove any old values if not needed
      if (!_action?.multiplier) {
        values.multiplier = null;
      }

      console.log({ values });

      //   const ref = doc(db, `events/${season?.id}/${eventId}`);
      const ref = doc(db, `events/${season?.id}/${eventId}`);

      const res = await setDoc(ref, values);

      console.log({ res });
    });
  };

  console.log({ currentAction });

  return (
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

      <div>
        Payload:
        <Code block>{JSON.stringify({ [eventId]: form.values }, null, 2)}</Code>
      </div>
    </Box>
  );
};
