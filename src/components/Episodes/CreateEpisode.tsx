import {
  Box,
  Button,
  Card,
  Center,
  Checkbox,
  Code,
  Group,
  Loader,
  NumberInput,
  SimpleGrid,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { arrayUnion, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useSeason } from "../../hooks/useSeason";
import { Episode } from "../../types";

export const CreateEpisode = () => {
  const { data: season, isLoading } = useSeason();

  const nextOrder = (season?.episodes?.length ?? 0) + 1;

  const form = useForm<Omit<Episode, "id" | "season_id" | "season_num">>({
    initialValues: {
      order: nextOrder,
      name: "",
      finale: false,
      post_merge: false,
      merge_occurs: false,
    },
  });

  if (isLoading) {
    return (
      <Center>
        <Loader size="xl" />
      </Center>
    );
  }

  if (!season) return null;

  const handleSubmit = async (
    values: Omit<Episode, "id" | "season_id" | "season_num">,
  ) => {
    const episode: Episode = {
      id: `episode_${values.order}`,
      season_id: season.id,
      season_num: season.order,
      ...values,
    };

    const ref = doc(db, "seasons", season.id);
    await updateDoc(ref, { episodes: arrayUnion(episode) });

    // Reset for next episode
    form.setValues({
      order: values.order + 1,
      name: "",
      finale: false,
      post_merge: values.post_merge || values.merge_occurs,
      merge_occurs: false,
    });
  };

  return (
    <Card withBorder>
      <Card.Section p="md">
        <Title order={4}>Create a new Episode</Title>
      </Card.Section>

      <Card.Section p="md">
        <SimpleGrid cols={{ base: 1, md: 2 }}>
          <Box maw={340} mx="auto">
            <form onSubmit={form.onSubmit((values) => handleSubmit(values))}>
              <TextInput
                withAsterisk
                readOnly
                label="Season"
                value={`${season.name} (${season.id})`}
              />

              <NumberInput
                withAsterisk
                label="Episode #"
                min={1}
                {...form.getInputProps("order")}
              />

              <TextInput
                label="Episode Name"
                placeholder="e.g. The Marooning"
                {...form.getInputProps("name")}
              />

              <Group mt="md" gap="lg">
                <Checkbox
                  label="Merge occurs"
                  {...form.getInputProps("merge_occurs", { type: "checkbox" })}
                />
                <Checkbox
                  label="Post-merge"
                  {...form.getInputProps("post_merge", { type: "checkbox" })}
                />
                <Checkbox
                  label="Finale"
                  {...form.getInputProps("finale", { type: "checkbox" })}
                />
              </Group>

              <Group justify="flex-end" mt="md">
                <Button type="submit">Submit</Button>
              </Group>
            </form>
          </Box>
          <Box>
            Generated Payload:
            <Code block>
              {JSON.stringify(
                {
                  id: `episode_${form.values.order}`,
                  season_id: season.id,
                  season_num: season.order,
                  ...form.values,
                },
                null,
                2,
              )}
            </Code>
          </Box>
        </SimpleGrid>
      </Card.Section>
    </Card>
  );
};
