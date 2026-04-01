import {
  Badge,
  Card,
  Center,
  Chip,
  Group,
  Image,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconChevronRight, IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SEASON_METADATA, type SeasonMeta } from "../data/season-metadata";
import classes from "./Seasons.module.css";

const ERAS = [
  { label: "Classic (1–8)", min: 1, max: 8 },
  { label: "Middle (9–20)", min: 9, max: 20 },
  { label: "Modern (21–33)", min: 21, max: 33 },
  { label: "New Era (34–50)", min: 34, max: 50 },
] as const;

function matchesSearch(meta: SeasonMeta, query: string): boolean {
  const q = query.toLowerCase();
  return (
    String(meta.order).includes(q) ||
    meta.name.toLowerCase().includes(q) ||
    (meta.subtitle?.toLowerCase().includes(q) ?? false) ||
    meta.location.toLowerCase().includes(q)
  );
}

function matchesEras(meta: SeasonMeta, selectedEras: string[]): boolean {
  if (selectedEras.length === 0) return true;
  return selectedEras.some((eraLabel) => {
    const era = ERAS.find((e) => e.label === eraLabel);
    return era && meta.order >= era.min && meta.order <= era.max;
  });
}

function HeroCard({ meta }: { meta: SeasonMeta }) {
  return (
    <Card
      component={Link}
      to={`/seasons/${meta.id}`}
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      className={classes.heroCard}
    >
      <Card.Section pos="relative">
        {meta.img ? (
          <Image src={meta.img} height={200} alt={meta.name} />
        ) : (
          <div className={classes.heroImageFallback}>
            <span className={classes.heroSeasonNumber}>{meta.order}</span>
          </div>
        )}
        <Badge
          color="dark"
          variant="filled"
          size="lg"
          pos="absolute"
          top={12}
          right={12}
        >
          Season {meta.order}
        </Badge>
      </Card.Section>

      <Group justify="space-between" mt="md" align="flex-start">
        <div style={{ flex: 1 }}>
          <Text fw={700} size="xl">
            {meta.subtitle ? `Survivor: ${meta.subtitle}` : meta.name}
          </Text>
          <Text size="sm" c="dimmed">
            {meta.location} &middot; {meta.year}
          </Text>
          <Text size="sm" c="dimmed">
            {meta.contestantCount} contestants
          </Text>
        </div>
        <IconChevronRight
          size={20}
          color="var(--mantine-color-dimmed)"
          style={{ marginTop: 4 }}
        />
      </Group>
    </Card>
  );
}

function CompactCard({ meta }: { meta: SeasonMeta }) {
  return (
    <Card
      component={Link}
      to={`/seasons/${meta.id}`}
      shadow="xs"
      padding="sm"
      radius="md"
      withBorder
      className={classes.compactCard}
    >
      <Card.Section>
        {meta.img ? (
          <Image src={meta.img} height={100} alt={meta.name} />
        ) : (
          <div className={classes.compactImageFallback}>
            <span className={classes.compactSeasonNumber}>{meta.order}</span>
          </div>
        )}
      </Card.Section>

      <Stack gap={2} mt="xs">
        <Text fw={600} size="sm" lineClamp={1}>
          {meta.subtitle ?? `Survivor ${meta.order}`}
        </Text>
        <Text size="xs" c="dimmed" lineClamp={1}>
          {meta.location} &middot; {meta.year}
        </Text>
        <Badge size="xs" variant="light" color="gray" w="fit-content">
          {meta.contestantCount} contestants
        </Badge>
      </Stack>
    </Card>
  );
}

export const Seasons = () => {
  const [search, setSearch] = useState("");
  const [selectedEras, setSelectedEras] = useState<string[]>([]);

  const allSeasons = useMemo(
    () =>
      Object.values(SEASON_METADATA).sort((a, b) => b.order - a.order),
    [],
  );

  const marqueeSeasons = useMemo(() => allSeasons.slice(0, 2), [allSeasons]);

  const browseSeasons = useMemo(() => {
    return allSeasons.filter(
      (meta) => matchesSearch(meta, search) && matchesEras(meta, selectedEras),
    );
  }, [allSeasons, search, selectedEras]);

  return (
    <Stack gap="lg" p="md">
      {/* Header */}
      <div>
        <Title order={2}>Pick a season</Title>
        <Text c="dimmed" size="sm">
          Every draft starts here. Choose a season, scout the contestants, and
          get a draft going with your friends.
        </Text>
      </div>

      {/* Marquee — two latest seasons */}
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        {marqueeSeasons.map((meta) => (
          <HeroCard key={meta.id} meta={meta} />
        ))}
      </SimpleGrid>

      {/* Browse — search + era filters + compact grid */}
      <Stack gap="sm">
        <Title order={4}>All Seasons</Title>

        <TextInput
          placeholder="Search by name, number, or location..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />

        <Chip.Group multiple value={selectedEras} onChange={setSelectedEras}>
          <Group gap="xs">
            {ERAS.map((era) => (
              <Chip
                key={era.label}
                value={era.label}
                size="sm"
                variant="outline"
                className={classes.eraChip}
              >
                {era.label}
              </Chip>
            ))}
          </Group>
        </Chip.Group>

        {browseSeasons.length === 0 ? (
          <Center py="xl">
            <Text c="dimmed">No seasons match your search.</Text>
          </Center>
        ) : (
          <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4, lg: 5 }}>
            {browseSeasons.map((meta) => (
              <CompactCard key={meta.id} meta={meta} />
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Stack>
  );
};
