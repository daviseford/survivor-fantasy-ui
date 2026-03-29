import {
  Box,
  Button,
  Card,
  Center,
  Code,
  ColorInput,
  Group,
  Loader,
  SimpleGrid,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { doc, setDoc } from "firebase/firestore";
import { v4 } from "uuid";
import { db } from "../../firebase";
import { useSeason } from "../../hooks/useSeason";
import { Team } from "../../types";

const SURVIVOR_SWATCHES = [
  "#3B82F6", // blue
  "#EF4444", // red
  "#22C55E", // green
  "#EAB308", // yellow
  "#A855F7", // purple
  "#F97316", // orange
  "#EC4899", // pink
  "#14B8A6", // teal
  "#000000", // black
];

export const CreateTeam = () => {
  const { data: season, isLoading } = useSeason();

  const form = useForm<Team>({
    initialValues: {
      id: `team_${v4()}`,
      season_id: "season_1",
      season_num: 1,
      name: "",
      color: "#3B82F6",
    },

    validate: {
      name: (value) => (value.trim().length > 0 ? null : "Team name required"),
      color: (value) =>
        /^#[0-9a-fA-F]{6}$/.test(value) ? null : "Valid hex color required",
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

  const handleSubmit = async (values: Team) => {
    const _validate = form.validate();
    if (_validate.hasErrors) return;

    const payload: Team = {
      ...values,
      season_id: season.id,
      season_num: season.order,
    };

    const ref = doc(db, `teams/${season.id}`);
    await setDoc(ref, { [payload.id]: payload }, { merge: true });

    form.setValues({ id: `team_${v4()}`, name: "", color: "#3B82F6" });
  };

  return (
    <Card withBorder>
      <Card.Section p="md">
        <Title order={4}>Create a new Team</Title>
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

              <TextInput
                withAsterisk
                label="Team Name"
                placeholder="e.g. Luvu"
                {...form.getInputProps("name")}
              />

              <ColorInput
                withAsterisk
                label="Team Color"
                format="hex"
                swatches={SURVIVOR_SWATCHES}
                {...form.getInputProps("color")}
              />

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
                  ...form.values,
                  season_id: season.id,
                  season_num: season.order,
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
