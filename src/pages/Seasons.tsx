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

function getEraClass(order: number): string {
  if (order <= 8) return classes.eraClassic;
  if (order <= 20) return classes.eraMiddle;
  if (order <= 33) return classes.eraModern;
  return classes.eraNew;
}

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

function getSeasonDisplayTitle(meta: SeasonMeta): string {
  if (/\d/.test(meta.name)) return meta.name;

  const label = meta.subtitle ?? meta.name.replace(/^Survivor:\s*/, "");
  return `S${meta.order}: ${label}`;
}

function HeroCard({ meta, live }: { meta: SeasonMeta; live: boolean }) {
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
          <Image src={meta.img} height={200} w="100%" h={200} alt={meta.name} />
        ) : (
          <div
            className={`${classes.heroImageFallback} ${getEraClass(meta.order)}`}
          >
            <span className={classes.heroSeasonNumber}>{meta.order}</span>
            {meta.subtitle && (
              <span className={classes.heroSubtitle}>{meta.subtitle}</span>
            )}
          </div>
        )}
        <Group pos="absolute" top={12} right={12} gap="xs">
          {live && (
            <Badge color="red" variant="filled" size="lg">
              LIVE
            </Badge>
          )}
          <Badge color="dark" variant="filled" size="lg">
            Season {meta.order}
          </Badge>
        </Group>
      </Card.Section>

      <Group justify="space-between" mt="md" align="flex-start">
        <div style={{ flex: 1 }}>
          <Text fw={700} size="lg">
            {getSeasonDisplayTitle(meta)}
          </Text>
          <Text size="sm" c="dimmed">
            {meta.location} &middot; {meta.year}
          </Text>
        </div>
        <IconChevronRight
          size={18}
          color="var(--mantine-color-dimmed)"
          style={{ marginTop: 4 }}
        />
      </Group>
    </Card>
  );
}

function CompactCard({ meta, live }: { meta: SeasonMeta; live: boolean }) {
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
      <Card.Section pos="relative">
        {meta.img ? (
          <Image src={meta.img} height={100} w="100%" h={100} alt={meta.name} loading="lazy" />
        ) : (
          <div
            className={`${classes.compactImageFallback} ${getEraClass(meta.order)}`}
          >
            <span className={classes.compactSeasonNumber}>{meta.order}</span>
            {meta.subtitle && (
              <span className={classes.compactSubtitle}>{meta.subtitle}</span>
            )}
          </div>
        )}
        {live && (
          <Badge
            color="red"
            variant="filled"
            size="xs"
            pos="absolute"
            top={6}
            right={6}
          >
            LIVE
          </Badge>
        )}
      </Card.Section>

      <Stack gap={2} mt="xs">
        <Text fw={600} size="sm" lineClamp={1}>
          {getSeasonDisplayTitle(meta)}
        </Text>
        <Text size="xs" c="dimmed" lineClamp={1}>
          {meta.location} &middot; {meta.year}
        </Text>
      </Stack>
    </Card>
  );
}

export const Seasons = () => {
  const [search, setSearch] = useState("");
  const [selectedEras, setSelectedEras] = useState<string[]>([]);

  const allSeasons = useMemo(
    () => Object.values(SEASON_METADATA).sort((a, b) => b.order - a.order),
    [],
  );

  // The live season is the highest-order incomplete season
  const liveSeasonId = useMemo(() => {
    const liveSeason = allSeasons.find((m) => !m.complete);
    return liveSeason?.id ?? null;
  }, [allSeasons]);

  const marqueeSeasons = useMemo(() => allSeasons.slice(0, 2), [allSeasons]);

  const marqueeIds = useMemo(
    () => new Set(marqueeSeasons.map((m) => m.id)),
    [marqueeSeasons],
  );

  const browseSeasons = useMemo(() => {
    return allSeasons.filter(
      (meta) =>
        !marqueeIds.has(meta.id) &&
        matchesSearch(meta, search) &&
        matchesEras(meta, selectedEras),
    );
  }, [allSeasons, marqueeIds, search, selectedEras]);

  return (
    <Stack gap="lg" p="md">
      {/* Header */}
      <div>
        <Title order={2}>Pick a season</Title>
        <Text c="dimmed" size="sm">
          Choose a season, scout the contestants, and get a draft going with
          your friends.
        </Text>
      </div>

      {/* Marquee — two latest seasons */}
      <SimpleGrid cols={{ base: 1, sm: 2 }} maw={900}>
        {marqueeSeasons.map((meta) => (
          <HeroCard key={meta.id} meta={meta} live={meta.id === liveSeasonId} />
        ))}
      </SimpleGrid>

      {/* Browse — search + era filters + compact grid */}
      <Stack gap="sm">
        <div className={classes.sectionHeader}>
          <Title order={4}>All Seasons</Title>
          <div className={classes.sectionLine} />
        </div>

        <TextInput
          placeholder="Search by name, number, or location..."
          leftSection={<IconSearch size={16} />}
          aria-label="Search seasons"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />

        <Chip.Group multiple value={selectedEras} onChange={setSelectedEras}>
          <Group gap="xs" aria-label="Filter by era" role="group">
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
          <SimpleGrid cols={{ base: 2, xs: 2, sm: 3, md: 4, lg: 5 }}>
            {browseSeasons.map((meta) => (
              <CompactCard
                key={meta.id}
                meta={meta}
                live={meta.id === liveSeasonId}
              />
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Stack>
  );
};
