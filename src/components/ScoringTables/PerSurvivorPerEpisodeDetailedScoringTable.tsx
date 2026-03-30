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
import { useEliminations } from "../../hooks/useEliminations";
import { useEvents } from "../../hooks/useEvents";
import { useScoringCalculations } from "../../hooks/useScoringCalculations";
import { useSeason } from "../../hooks/useSeason";
import { PlayerAction } from "../../types";
import { getNumberWithOrdinal } from "../../utils/misc";

type SortField = "rank" | "player" | "total" | "draft";
type SortDir = "asc" | "desc";

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
  const { data: eliminations } = useEliminations(competition?.season_id);
  const { data: events } = useEvents(season?.id);

  const { survivorPointsByEpisode, survivorPointsTotalSeason } =
    useScoringCalculations();

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
      .map(([playerName, episodeScores]) => {
        const total = survivorPointsTotalSeason[playerName] ?? 0;
        const draftPick = competition?.draft_picks.find(
          (x) => x.player_name === playerName,
        );
        return {
          playerName,
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
          cmp = a.playerName.localeCompare(b.playerName);
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
    const { playerName, episodeScores, total, defaultRank, draftOrder } = entry;
    const playerData = season?.players.find((x) => x.name === playerName);

    const draftPick = competition?.draft_picks.find(
      (x) => x.player_name === playerName,
    );
    const draftedBy = competition?.participants.find(
      (x) => x.uid === draftPick?.user_uid,
    );

    const playerElimination = Object.values(eliminations).find(
      (x) => x.player_name === playerName,
    );

    const isRemovedFromGame =
      playerElimination &&
      (playerElimination.variant === "medical" ||
        playerElimination.variant === "quitter");

    const isFTCEliminated =
      playerElimination && playerElimination.variant === "final_tribal_council";

    const isWinner = Object.values(events).some(
      (x) => x.player_name === playerName && x.action === "win_survivor",
    );

    const trStyle = {
      backgroundColor: playerElimination
        ? "var(--mantine-color-gray-2)"
        : isWinner
          ? "var(--mantine-color-green-1)"
          : "",
    };
    const avatarStyle = playerElimination ? { filter: "grayscale(1)" } : {};

    return (
      <Table.Tr key={playerName} style={trStyle}>
        <Table.Td width="20px">{defaultRank}</Table.Td>
        <Table.Td width="240px">
          <Group gap="sm">
            <Avatar
              size={40}
              src={playerData?.img}
              radius={40}
              style={avatarStyle}
            />
            <Text fz="sm" fw={500} c={playerElimination ? "dimmed" : ""}>
              {playerName}
            </Text>
          </Group>
        </Table.Td>

        <Table.Td width="40px">{total}</Table.Td>

        {episodeScores.map((s, idx) => (
          <Table.Td width="120px" key={idx}>
            <Stack gap="xs">
              {s.actions.map((x, actionIdx) => {
                const badgeColor = x.action === "eliminated" ? "red" : "dark";
                return (
                  <Tooltip
                    label={scoringDescriptionLookup[x.action]}
                    key={actionIdx}
                  >
                    <Badge
                      size="sm"
                      color={badgeColor}
                      style={{ cursor: "pointer" }}
                    >
                      {x.action.replace(/_/g, " ")} +{x.points_awarded}
                    </Badge>
                  </Tooltip>
                );
              })}
            </Stack>
          </Table.Td>
        ))}
        <Table.Td width="150px">
          Drafted {getNumberWithOrdinal(draftOrder)} by{" "}
          {draftedBy?.displayName || draftedBy?.email}
        </Table.Td>
        <Table.Td>
          {playerElimination && (
            <Badge
              color={
                isFTCEliminated
                  ? "blue"
                  : isRemovedFromGame
                    ? "red"
                    : playerElimination
                      ? "gray"
                      : ""
              }
            >
              {isFTCEliminated
                ? "Final Tribal"
                : isRemovedFromGame
                  ? "Removed"
                  : "Eliminated"}{" "}
              {!isFTCEliminated
                ? getNumberWithOrdinal(playerElimination.order)
                : ""}
            </Badge>
          )}
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <>
      <Group gap="md" mb="xs" px="md">
        <Group gap={4}>
          <Box
            w={12}
            h={12}
            style={{
              backgroundColor: "var(--mantine-color-green-1)",
              borderRadius: 2,
            }}
          />
          <Text size="xs">Winner</Text>
        </Group>
        <Group gap={4}>
          <Box
            w={12}
            h={12}
            style={{
              backgroundColor: "var(--mantine-color-gray-2)",
              borderRadius: 2,
            }}
          />
          <Text size="xs">Eliminated</Text>
        </Group>
        <Group gap={4}>
          <Badge size="xs" color="red">
            Elimination pts
          </Badge>
        </Group>
        <Group gap={4}>
          <Badge size="xs" color="dark">
            Event pts
          </Badge>
        </Group>
      </Group>
      <Table.ScrollContainer minWidth={300}>
        <Table
          highlightOnHover
          verticalSpacing="md"
          horizontalSpacing="md"
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
              />
              {season?.episodes.map((x) => (
                <Table.Th key={x.id}>Ep {x.order}</Table.Th>
              ))}
              <SortableHeader
                label="Draft Pick"
                field="draft"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
                width="150px"
              />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </>
  );
};
