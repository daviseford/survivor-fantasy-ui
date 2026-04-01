import {
  Avatar,
  Badge,
  Box,
  Group,
  Stack,
  Table,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { BASE_PLAYER_SCORING } from "../../data/scoring";
import { useCompetition } from "../../hooks/useCompetition";
import { useScoringCalculations } from "../../hooks/useScoringCalculations";
import { useSeason } from "../../hooks/useSeason";
import { useUser } from "../../hooks/useUser";
import { CastawayId, PlayerAction } from "../../types";
import { getNumberWithOrdinal } from "../../utils/misc";

type SortField = "rank" | "player" | "total" | "draft";
type SortDir = "asc" | "desc";

const getBadgeColor = (action: string) => {
  if (action === "eliminated") return "red";
  if (action === "win_survivor") return "green";
  if (action.includes("idol") || action.includes("advantage")) return "violet";
  if (
    action.includes("immunity") ||
    action.includes("challenge") ||
    action.includes("reward")
  )
    return "blue";
  return "gray";
};

const SortableHeader = ({
  label,
  field,
  sortField,
  sortDir,
  onSort,
  width,
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
  width?: string;
}) => {
  const isActive = sortField === field;
  const Icon = isActive && sortDir === "desc" ? IconChevronDown : IconChevronUp;
  return (
    <Table.Th w={width}>
      <UnstyledButton
        onClick={() => onSort(field)}
        style={{ display: "flex", alignItems: "center", gap: 4 }}
      >
        {label}
        {isActive && <Icon size={14} />}
      </UnstyledButton>
    </Table.Th>
  );
};

export const PerSurvivorPerEpisodeDetailedScoringTable = () => {
  const { data: competition } = useCompetition();
  const { data: season } = useSeason(competition?.season_id);
  const { slimUser } = useUser();

  const {
    filteredEpisodes,
    filteredEliminations: eliminations,
    filteredEvents: events,
    survivorPointsByEpisode,
    survivorPointsTotalSeason,
  } = useScoringCalculations();

  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "total" ? "desc" : "asc");
    }
  };

  // Build a sortable array from the scoring data
  const entries = useMemo(() => {
    return Object.entries(survivorPointsByEpisode)
      .map(([castawayId, episodeScores]) => {
        const total = survivorPointsTotalSeason[castawayId] ?? 0;
        const draftPick = competition?.draft_picks.find(
          (x) => x.castaway_id === castawayId,
        );
        const displayName =
          season?.castawayLookup[castawayId as CastawayId]?.full_name ??
          castawayId;
        return {
          castawayId: castawayId as CastawayId,
          displayName,
          episodeScores,
          total,
          draftOrder: draftPick?.order ?? 999,
        };
      })
      .sort((a, b) => b.total - a.total) // default rank order
      .map((entry, i) => ({ ...entry, defaultRank: i + 1 }));
  }, [
    survivorPointsByEpisode,
    survivorPointsTotalSeason,
    competition?.draft_picks,
    season?.castawayLookup,
  ]);

  const sorted = useMemo(() => {
    const compareFn = (
      a: (typeof entries)[number],
      b: (typeof entries)[number],
    ) => {
      let cmp = 0;
      switch (sortField) {
        case "rank":
          cmp = a.defaultRank - b.defaultRank;
          break;
        case "player":
          cmp = a.displayName.localeCompare(b.displayName);
          break;
        case "total":
          cmp = b.total - a.total; // higher total = better rank
          break;
        case "draft":
          cmp = a.draftOrder - b.draftOrder;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    };
    return entries.slice().sort(compareFn);
  }, [entries, sortField, sortDir]);

  const scoringDescriptionLookup = useMemo(
    () =>
      BASE_PLAYER_SCORING.reduce(
        (accum, score) => {
          accum[score.action] = score.description;
          return accum;
        },
        {} as Record<PlayerAction, string>,
      ),
    [],
  );

  const rows = sorted.map((entry) => {
    const { castawayId, displayName, episodeScores, total, defaultRank, draftOrder } = entry;
    const playerData = season?.players.find((x) => x.castaway_id === castawayId);

    const draftPick = competition?.draft_picks.find(
      (x) => x.castaway_id === castawayId,
    );
    const draftedBy = competition?.participants.find(
      (x) => x.uid === draftPick?.user_uid,
    );

    const playerElimination = Object.values(eliminations).find(
      (x) => x.castaway_id === castawayId,
    );

    const isRemovedFromGame =
      playerElimination &&
      (playerElimination.variant === "medical" ||
        playerElimination.variant === "quitter");

    const isWinner = Object.values(events).some(
      (x) => x.castaway_id === castawayId && x.action === "win_survivor",
    );

    const isDraftedByCurrentUser = draftPick?.user_uid === slimUser?.uid;

    const trStyle = {
      backgroundColor: isWinner
        ? "var(--mantine-color-green-light)"
        : playerElimination
          ? "var(--mantine-color-gray-light)"
          : isDraftedByCurrentUser
            ? "var(--mantine-color-blue-light)"
            : "",
    };
    const avatarStyle = playerElimination ? { filter: "grayscale(1)" } : {};

    return (
      <Table.Tr key={castawayId} style={trStyle}>
        <Table.Td ta="center">
          <Text span size="sm" fw={500} c="dimmed">
            {defaultRank}
          </Text>
        </Table.Td>
        <Table.Td style={{ minWidth: 160 }}>
          <Group gap={8} wrap="nowrap" align="center">
            <Avatar
              size={28}
              src={playerData?.img}
              radius={28}
              style={{ ...avatarStyle, flexShrink: 0 }}
            />
            <div style={{ minWidth: 0 }}>
              <Text
                fz="sm"
                fw={500}
                c={playerElimination ? "dimmed" : ""}
                lh={1.2}
                truncate
              >
                {displayName}
              </Text>
              {draftedBy && (
                <Text fz="xs" c="dimmed" lh={1.2} truncate>
                  {draftedBy.displayName || draftedBy.email}
                </Text>
              )}
            </div>
          </Group>
        </Table.Td>

        <Table.Td ta="center">
          <Text span fw={700} size="sm">
            {total}
          </Text>
        </Table.Td>

        <Table.Td ta="center">
          <Text span size="sm" c="dimmed">
            {getNumberWithOrdinal(draftOrder)}
          </Text>
        </Table.Td>

        {episodeScores.map((s, idx) => (
          <Table.Td key={idx}>
            <Stack gap={2}>
              {s.actions.map((x, actionIdx) => {
                return (
                  <Tooltip
                    label={scoringDescriptionLookup[x.action]}
                    key={actionIdx}
                  >
                    <Badge
                      size="xs"
                      variant="light"
                      color={getBadgeColor(x.action)}
                      style={{
                        cursor: "pointer",
                      }}
                    >
                      {x.action.replace(/_/g, " ")} +{x.points_awarded}
                    </Badge>
                  </Tooltip>
                );
              })}
            </Stack>
          </Table.Td>
        ))}
        <Table.Td ta="center">
          {playerElimination && (
            <Badge
              size="xs"
              variant="light"
              color={isRemovedFromGame ? "red" : "gray"}
            >
              {isRemovedFromGame
                ? "Removed"
                : `Out ${getNumberWithOrdinal(playerElimination.order)}`}
            </Badge>
          )}
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <>
      <Group gap="md" mb="xs" px="md" wrap="wrap">
        <Group gap={4}>
          <Box
            w={12}
            h={12}
            style={{
              backgroundColor: "var(--mantine-color-green-light)",
              borderRadius: 2,
              border: "1px solid var(--mantine-color-green-light-color)",
            }}
          />
          <Text size="xs" c="dimmed">
            Winner
          </Text>
        </Group>
        <Group gap={4}>
          <Box
            w={12}
            h={12}
            style={{
              backgroundColor: "var(--mantine-color-gray-light)",
              borderRadius: 2,
              border: "1px solid var(--mantine-color-default-border)",
            }}
          />
          <Text size="xs" c="dimmed">
            Eliminated
          </Text>
        </Group>
        <Group gap={4}>
          <Badge size="xs" variant="light" color="red">
            Elimination
          </Badge>
        </Group>
        <Group gap={4}>
          <Badge size="xs" variant="light" color="blue">
            Challenge
          </Badge>
        </Group>
        <Group gap={4}>
          <Badge size="xs" variant="light" color="violet">
            Idol / Advantage
          </Badge>
        </Group>
        <Group gap={4}>
          <Badge size="xs" variant="light" color="gray">
            Other
          </Badge>
        </Group>
      </Group>
      <Table.ScrollContainer minWidth={500 + filteredEpisodes.length * 170}>
        <Table
          highlightOnHover
          verticalSpacing="xs"
          horizontalSpacing="sm"
          withColumnBorders
        >
          <Table.Thead>
            <Table.Tr>
              <SortableHeader
                label="Rank"
                field="rank"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
                width="70px"
              />
              <SortableHeader
                label="Player"
                field="player"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Total"
                field="total"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
                width="70px"
              />
              <SortableHeader
                label="Pick"
                field="draft"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
                width="60px"
              />
              {filteredEpisodes.map((x) => (
                <Table.Th key={x.id} w={160}>
                  Ep {x.order}
                </Table.Th>
              ))}
              <Table.Th w={80}>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </>
  );
};
