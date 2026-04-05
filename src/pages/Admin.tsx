import {
  Accordion,
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Divider,
  Group,
  Image,
  Loader,
  Paper,
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
  IconChevronRight,
  IconDatabase,
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
      title: `Delete "${competition.competition_name}"?`,
      children: (
        <Stack gap="xs">
          <Text size="sm">
            This removes the competition and its linked live draft data.
          </Text>
          <Text size="sm" c="dimmed">
            Season {competition.season_num} · {competition.participants.length}{" "}
            participants
          </Text>
        </Stack>
      ),
      labels: { confirm: "Delete competition", cancel: "Keep it" },
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
      <Paper withBorder p="lg" radius="md">
        <Stack gap="md">
          <div>
            <Group gap="xs" mb={4}>
              <Box component="span" c="blue.6" display="inline-flex">
                <IconSettings size={22} />
              </Box>
              <Title order={2}>Admin Dashboard</Title>
            </Group>
            <Text c="dimmed" size="sm">
              Choose a season, update game data, and keep league operations in
              sync.
            </Text>
          </div>

          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <Paper withBorder radius="md" p="md">
              <Text size="xs" tt="uppercase" c="dimmed" fw={700}>
                Latest Season
              </Text>
              <Text fw={700} mt={6}>
                {latestSeason?.name ?? "No seasons"}
              </Text>
              <Text size="sm" c="dimmed" mt={4}>
                {latestSeason
                  ? `${latestSeason.episodes?.length ?? 0} episodes · ${latestSeason.players?.length ?? 0} players`
                  : "Add season data to get started."}
              </Text>
            </Paper>

            <Paper withBorder radius="md" p="md">
              <Text size="xs" tt="uppercase" c="dimmed" fw={700}>
                Competition Count
              </Text>
              <Text fw={700} mt={6}>
                {competitions.length}
              </Text>
              <Text size="sm" c="dimmed" mt={4}>
                Active and archived competitions visible to admins.
              </Text>
            </Paper>

            <Paper withBorder radius="md" p="md">
              <Text size="xs" tt="uppercase" c="dimmed" fw={700}>
                Recommended Next Step
              </Text>
              <Text fw={700} mt={6}>
                {latestSeason ? `Open ${latestSeason.name}` : "Review seasons"}
              </Text>
              <Text size="sm" c="dimmed" mt={4}>
                Start with episodes, then events, challenges, eliminations, and
                teams.
              </Text>
            </Paper>
          </SimpleGrid>

          {latestSeason && (
            <Group>
              <Button
                component={Link}
                to={`/admin/${latestSeason.id}`}
                rightSection={<IconChevronRight size={16} />}
              >
                Open Latest Season
              </Button>
              <Button
                variant="light"
                component={Link}
                to={`/admin/${latestSeason.id}?tab=events`}
              >
                Jump to Events
              </Button>
            </Group>
          )}
        </Stack>
      </Paper>

      <div>
        <Group justify="space-between" align="end" mb="md" wrap="wrap">
          <div>
            <Title order={3}>Seasons</Title>
            <Text c="dimmed" size="sm" mt={4}>
              Pick a season to manage its weekly data and roster state.
            </Text>
          </div>
          <TextInput
            placeholder="Search by season name, number, or id"
            leftSection={<IconSearch size={16} />}
            value={seasonSearch}
            onChange={(e) => setSeasonSearch(e.currentTarget.value)}
            maw={360}
          />
        </Group>
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
                <Text size="sm" c="dimmed" mb="md">
                  Best place to continue live season maintenance.
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
                <Divider my="md" />
                <Group justify="space-between">
                  <Text size="sm" fw={600}>
                    Open season workspace
                  </Text>
                  <IconChevronRight size={16} />
                </Group>
              </Card>
            )}

            <Table.ScrollContainer minWidth={400}>
              <Table highlightOnHover verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Season</Table.Th>
                    <Table.Th>Episodes</Table.Th>
                    <Table.Th>Players</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredSeasons.length > 0 ? (
                    filteredSeasons.map((season) => (
                      <Table.Tr key={season.id}>
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
                        <Table.Td>
                          <Button
                            size="xs"
                            variant="light"
                            onClick={() => navigate(`/admin/${season.id}`)}
                            rightSection={<IconChevronRight size={14} />}
                          >
                            Manage
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  ) : (
                    <Table.Tr>
                      <Table.Td colSpan={4}>
                        <Alert
                          color="blue"
                          variant="light"
                          icon={<IconSearch size={16} />}
                        >
                          No seasons match "{seasonSearch}". Try a season number
                          or clear the search.
                        </Alert>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Stack>
        )}
      </div>

      <div>
        <Title order={3} mb="xs">
          Competitions
        </Title>
        <Text c="dimmed" size="sm" mb="md">
          Archive cleanup lives here. Delete only when you want to remove the
          competition and its draft data together.
        </Text>
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
            <Group gap="xs">
              <IconDatabase size={16} />
              <Title order={4} c="dimmed">
                Data Tools
              </Title>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Text c="dimmed" size="sm" mb="md">
              One-off maintenance actions for known season uploads. Use these
              when a season record needs to be restored or refreshed.
            </Text>
            <SimpleGrid cols={{ base: 1, md: 3 }}>
              <Button
                variant="light"
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
                Restore Season 9
              </Button>
              <Button
                variant="light"
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
                Restore Season 46
              </Button>
              <Button
                variant="light"
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
                Restore Season 50
              </Button>
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
};
