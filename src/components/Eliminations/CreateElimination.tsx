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
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { hasLength, useForm } from "@mantine/form";
import { doc, setDoc } from "firebase/firestore";
import { last, orderBy } from "lodash-es";
import { useEffect } from "react";
import { v4 } from "uuid";
import { db } from "../../firebase";
import { useEliminations } from "../../hooks/useEliminations";
import { useSeason } from "../../hooks/useSeason";
import { Elimination, EliminationVariants } from "../../types";

const dropdownOptions = EliminationVariants.slice().reverse();

export const CreateElimination = () => {
  const { data: season, isLoading } = useSeason();
  const { data: eliminations } = useEliminations(season?.id);

  const form = useForm<Elimination>({
    initialValues: {
      id: `elimination_${v4()}`,
      season_num: 1,
      season_id: "season_1",
      episode_id: "episode_1",
      episode_num: 1,
      player_name: "",
      variant: dropdownOptions[0],
      order: 0,
    },

    validate: {
      player_name: hasLength({ min: 1 }, "Add winning player"),
    },

    transformValues: (values) => ({
      ...values,
      episode_id: `episode_${values.episode_num}`,
      season_id: `season_${values.season_num}`,
    }),
  });

  // Set initial values with async request
  useEffect(() => {
    if (season && eliminations) {
      const order =
        (last(orderBy(eliminations, (x) => x.order))?.order || 0) + 1;

      form.setValues({
        season_num: season.order,
        season_id: season.id,
        order,
      });
      form.resetDirty();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season, eliminations]);

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
        <Text>Create an Episode first before adding eliminations</Text>
      </Center>
    );
  }

  const handleSubmit = async (values: Elimination) => {
    const _validate = form.validate();

    if (_validate.hasErrors) return;

    const ref = doc(db, `eliminations/${season?.id}`);

    await setDoc(ref, { [values.id]: values }, { merge: true });

    // reset id and important form values
    form.setValues({ id: `elimination_${v4()}` });
  };

  const eliminatedPlayers = Object.values(eliminations).map(
    (x) => x.player_name,
  );
  const playerNames = season?.players
    .map((x) => x.name)
    .filter((x) => !eliminatedPlayers.includes(x));

  return (
    <Card withBorder>
      <Card.Section p={"md"}>
        <Title order={4}>Create a new Elimination</Title>
      </Card.Section>

      <Card.Section p={"md"}>
        <SimpleGrid cols={2}>
          <Box maw={340} mx="auto">
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
                label="Elimination Variant"
                data={dropdownOptions}
                searchable
                {...form.getInputProps("variant")}
              />

              <Select
                withAsterisk
                label="Eliminated Player"
                data={playerNames}
                searchable
                {...form.getInputProps("player_name")}
              />

              <NumberInput
                withAsterisk
                label="Order"
                min={1}
                {...form.getInputProps("order")}
              />

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
