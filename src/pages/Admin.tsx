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
  TextInput,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconList,
  IconSearch,
  IconSettings,
  IconTrash,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { ref, remove } from "firebase/database";
import { deleteDoc, doc, setDoc } from "firebase/firestore";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const { slimUser } = useUser();

  const { data: seasons, isLoading } = useSeasons();
  const { data: competitions } = useCompetitions();
  const [seasonSearch, setSeasonSearch] = useState("");

  const sortedSeasons = useMemo(
    () => seasons?.slice().sort((a, b) => b.order - a.order) ?? [],
    [seasons],
  );

  const latestSeason = sortedSeasons[0];

  const filteredSeasons = useMemo(() => {
    if (!seasonSearch.trim()) return sortedSeasons;
    const q = seasonSearch.toLowerCase();
    return sortedSeasons.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        String(s.order).includes(q) ||
        s.id.toLowerCase().includes(q),
    );
  }, [sortedSeasons, seasonSearch]);

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
          <Stack gap="md">
            {latestSeason && (
              <Card
                component={Link}
                to={`/admin/${latestSeason.id}`}
                shadow="sm"
                padding="lg"
                radius="md"
                withBorder
                maw={450}
              >
                {latestSeason.img && (
                  <Card.Section pos="relative">
                    <Image
                      src={latestSeason.img}
                      height={100}
                      alt=""
                      fit="cover"
                    />
                    <Badge
                      color="dark"
                      variant="filled"
                      size="sm"
                      pos="absolute"
                      top={12}
                      right={12}
                    >
                      S{latestSeason.order}
                    </Badge>
                  </Card.Section>
                )}
                <Text fw={600} mt="md" mb="xs">
                  {latestSeason.name}
                </Text>
                <Group gap="lg">
                  <Group gap={4}>
                    <IconList size={14} color="gray" />
                    <Text size="xs" c="dimmed">
                      {latestSeason.episodes?.length ?? 0} episodes
                    </Text>
                  </Group>
                  <Group gap={4}>
                    <IconUsers size={14} color="gray" />
                    <Text size="xs" c="dimmed">
                      {latestSeason.players?.length ?? 0} players
                    </Text>
                  </Group>
                </Group>
              </Card>
            )}

            <TextInput
              placeholder="Search seasons..."
              leftSection={<IconSearch size={16} />}
              value={seasonSearch}
              onChange={(e) => setSeasonSearch(e.currentTarget.value)}
              maw={350}
            />

            <Table.ScrollContainer minWidth={400}>
              <Table highlightOnHover verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Season</Table.Th>
                    <Table.Th>Episodes</Table.Th>
                    <Table.Th>Players</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredSeasons.map((season) => (
                    <Table.Tr
                      key={season.id}
                      onClick={() => navigate(`/admin/${season.id}`)}
                      style={{ cursor: "pointer" }}
                    >
                      <Table.Td>
                        <Group gap="xs">
                          <Badge variant="light" size="sm">
                            S{season.order}
                          </Badge>
                          <Text size="sm" fw={500}>
                            {season.name}
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{season.episodes?.length ?? 0}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{season.players?.length ?? 0}</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Stack>
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
