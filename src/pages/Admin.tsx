import {
  Accordion,
  ActionIcon,
  Badge,
  Button,
  Card,
  Center,
  Code,
  Group,
  Image,
  Loader,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconList,
  IconSettings,
  IconTrash,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { ref, remove } from "firebase/database";
import { deleteDoc, doc, setDoc } from "firebase/firestore";
import { Link } from "react-router-dom";
import { SEASON_9_CHALLENGES, SEASON_9_ELIMINATIONS } from "../data/season_9";
import { SEASONS } from "../data/seasons";
import { db, rt_db } from "../firebase";
import { useCompetitions } from "../hooks/useCompetitions";
import { useSeasons } from "../hooks/useSeasons";
import { useUser } from "../hooks/useUser";
import { Competition } from "../types";

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

  const { data: seasons, isLoading } = useSeasons();
  const { data: competitions } = useCompetitions();

  const handleDeleteCompetition = (competition: Competition) => {
    modals.openConfirmModal({
      title: "Delete this competition?",
      children: <Code block>{JSON.stringify(competition, null, 2)}</Code>,
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "competitions", competition.id));
          await remove(ref(rt_db, `drafts/${competition.draft_id}`));
          notifications.show({
            title: "Competition deleted",
            message: `"${competition.competition_name}" removed`,
            color: "green",
            icon: <IconCheck size={16} />,
          });
        } catch (err) {
          notifications.show({
            title: "Failed to delete competition",
            message: err instanceof Error ? err.message : "Unknown error",
            color: "red",
            icon: <IconX size={16} />,
          });
        }
      },
    });
  };

  if (!slimUser?.isAdmin) {
    return (
      <Center py="xl">
        <Text c="dimmed">You need admin access to view this page.</Text>
      </Center>
    );
  }

  return (
    <Stack gap="xl" p="md">
      <div>
        <Group gap="xs" mb={4}>
          <IconSettings size={22} color="var(--mantine-color-blue-6)" />
          <Title order={2}>Admin Dashboard</Title>
        </Group>
        <Text c="dimmed" size="sm">
          Manage seasons, episodes, and game data.
        </Text>
      </div>

      <div>
        <Title order={3} mb="md">
          Seasons
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
                  component={Link}
                  to={`/admin/${season.id}`}
                  key={season.id}
                  shadow="sm"
                  padding="lg"
                  radius="md"
                  withBorder
                >
                  {season.img && (
                    <Card.Section pos="relative">
                      <Image src={season.img} height={100} alt="" fit="cover" />
                      <Badge
                        color="dark"
                        variant="filled"
                        size="sm"
                        pos="absolute"
                        top={12}
                        right={12}
                      >
                        S{season.order}
                      </Badge>
                    </Card.Section>
                  )}

                  <Text fw={600} mt="md" mb="xs">
                    {season.name}
                  </Text>

                  <Group gap="lg">
                    <Group gap={4}>
                      <IconList size={14} color="gray" />
                      <Text size="xs" c="dimmed">
                        {season.episodes?.length ?? 0} episodes
                      </Text>
                    </Group>
                    <Group gap={4}>
                      <IconUsers size={14} color="gray" />
                      <Text size="xs" c="dimmed">
                        {season.players?.length ?? 0} players
                      </Text>
                    </Group>
                  </Group>
                </Card>
              ))}
          </SimpleGrid>
        )}
      </div>

      <div>
        <Title order={3} mb="md">
          Competitions
        </Title>
        {competitions.length === 0 ? (
          <Text c="dimmed" size="sm">
            No competitions found.
          </Text>
        ) : (
          <Table.ScrollContainer minWidth={400}>
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Season</Table.Th>
                  <Table.Th>Participants</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {competitions.map((c) => (
                  <Table.Tr key={c.id}>
                    <Table.Td fw={600}>{c.competition_name}</Table.Td>
                    <Table.Td>
                      <Badge variant="light" size="sm">
                        S{c.season_num}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {c.participants
                          .map((p) => p.displayName ?? p.email)
                          .join(", ")}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        color="red"
                        onClick={() => handleDeleteCompetition(c)}
                        aria-label={`Delete ${c.competition_name}`}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </div>

      <Accordion variant="subtle">
        <Accordion.Item value="data-tools">
          <Accordion.Control>
            <Title order={4} c="dimmed">
              Data Tools
            </Title>
          </Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={3}>
              <Button
                onClick={() =>
                  upload("Season 9", async () => {
                    await setDoc(
                      doc(db, "seasons", "season_9"),
                      SEASONS.season_9,
                      { merge: true },
                    );
                    await setDoc(
                      doc(db, "challenges", "season_9"),
                      SEASON_9_CHALLENGES,
                      { merge: true },
                    );
                    await setDoc(
                      doc(db, "eliminations", "season_9"),
                      SEASON_9_ELIMINATIONS,
                      { merge: true },
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
                      { merge: true },
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
                      { merge: true },
                    );
                  })
                }
              >
                Upload Season 50 Data
              </Button>
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
};
