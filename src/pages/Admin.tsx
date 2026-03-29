import {
  Accordion,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Image,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconList,
  IconSettings,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { SEASON_9_CHALLENGES, SEASON_9_ELIMINATIONS } from "../data/season_9";
import { SEASONS } from "../data/seasons";
import { db } from "../firebase";
import { useSeasons } from "../hooks/useSeasons";
import { useUser } from "../hooks/useUser";

const upload = async (label: string, fn: () => Promise<void>) => {
  try {
    await fn();
    notifications.show({
      title: `${label} uploaded successfully`,
      message: "",
      color: "green",
      icon: <IconCheck size={16} />,
    });
  } catch (err) {
    notifications.show({
      title: `${label} failed`,
      message: err instanceof Error ? err.message : "Unknown error",
      color: "red",
      icon: <IconX size={16} />,
    });
  }
};

export const Admin = () => {
  const { slimUser } = useUser();
  const navigate = useNavigate();

  const { data: seasons, isLoading } = useSeasons();

  if (!slimUser?.isAdmin) {
    return (
      <Center py="xl">
        <Text c="red" fw={500}>
          Unauthorized
        </Text>
      </Center>
    );
  }

  return (
    <Stack gap="xl">
      <Group gap="xs">
        <IconSettings size={28} color="var(--mantine-color-blue-6)" />
        <Title order={2}>Admin Dashboard</Title>
      </Group>

      <div>
        <Title order={3} mb="md">
          Manage Seasons
        </Title>
        {isLoading ? (
          <Center>
            <Loader size="lg" />
          </Center>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
            {seasons
              ?.slice()
              .sort((a, b) => b.order - a.order)
              .map((season) => (
                <Card
                  key={season.id}
                  shadow="sm"
                  padding="lg"
                  radius="md"
                  withBorder
                >
                  {season.img && (
                    <Card.Section>
                      <Image
                        src={season.img}
                        height={120}
                        alt={season.name}
                        fit="cover"
                      />
                    </Card.Section>
                  )}

                  <Group justify="space-between" mt="md" mb="xs">
                    <Text fw={600}>{season.name}</Text>
                    <Badge color="pink">Season {season.order}</Badge>
                  </Group>

                  <Group gap="lg" mb="md">
                    <Group gap={4}>
                      <IconList size={14} color="gray" />
                      <Text size="sm" c="dimmed">
                        {season.episodes?.length ?? 0} episodes
                      </Text>
                    </Group>
                    <Group gap={4}>
                      <IconUsers size={14} color="gray" />
                      <Text size="sm" c="dimmed">
                        {season.players?.length ?? 0} players
                      </Text>
                    </Group>
                  </Group>

                  <Button
                    fullWidth
                    variant="light"
                    onClick={() => navigate(`/admin/${season.id}`)}
                  >
                    Manage
                  </Button>
                </Card>
              ))}
          </SimpleGrid>
        )}
      </div>

      <Accordion>
        <Accordion.Item value="data-tools">
          <Accordion.Control>
            <Title order={4}>Data Tools</Title>
          </Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={3}>
              <Button
                onClick={() =>
                  upload("Season 9", async () => {
                    await setDoc(
                      doc(db, "seasons", "season_9"),
                      SEASONS.season_9,
                    );
                    await setDoc(
                      doc(db, "challenges", "season_9"),
                      SEASON_9_CHALLENGES,
                    );
                    await setDoc(
                      doc(db, "eliminations", "season_9"),
                      SEASON_9_ELIMINATIONS,
                    );
                  })
                }
              >
                Upload Season 9 Data
              </Button>
              <Button
                onClick={() =>
                  upload("Season 46", async () => {
                    await setDoc(
                      doc(db, "seasons", "season_46"),
                      SEASONS.season_46,
                    );
                  })
                }
              >
                Upload Season 46 Data
              </Button>
              <Button
                onClick={() =>
                  upload("Season 50", async () => {
                    await setDoc(
                      doc(db, "seasons", "season_50"),
                      SEASONS.season_50,
                    );
                  })
                }
              >
                Upload Season 50 Data
              </Button>
              <Button
                onClick={() =>
                  upload("Season 99", async () => {
                    await setDoc(
                      doc(db, "seasons", "season_99"),
                      SEASONS.season_99,
                    );
                  })
                }
              >
                Upload Season 99 Data
              </Button>
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
};
