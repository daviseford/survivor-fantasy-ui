import { Avatar, Badge, Group, Table, Text } from "@mantine/core";
import { useCompetition } from "../../hooks/useCompetition";
import { useEliminations } from "../../hooks/useEliminations";
import { useEvents } from "../../hooks/useEvents";
import { useScoringCalculations } from "../../hooks/useScoringCalculations";
import { useSeason } from "../../hooks/useSeason";
import { getNumberWithOrdinal } from "../../utils/misc";

export const SeasonTotalContestantScoringTable = () => {
  const { data: competition } = useCompetition();
  const { data: season } = useSeason(competition?.season_id);
  const { data: eliminations } = useEliminations(competition?.season_id);
  const { data: events } = useEvents(season?.id);

  const { survivorPointsTotalSeason } = useScoringCalculations();

  const rows = Object.entries(survivorPointsTotalSeason)
    .sort((a, b) => b[1] - a[1]) // sort by highest
    .map(([playerName, seasonScore]) => {
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
        playerElimination &&
        playerElimination.variant === "final_tribal_council";

      const isWinner = Object.values(events).some(
        (x) => x.player_name === playerName && x.action === "win_survivor",
      );

      return (
        <Table.Tr
          key={playerName}
          style={{
            backgroundColor: playerElimination
              ? "var(--mantine-color-gray-3)"
              : isWinner
                ? "var(--mantine-color-green-1)"
                : "",
          }}
        >
          <Table.Td>
            <Group gap={6} wrap="nowrap">
              <Avatar size={26} src={playerData?.img} radius={26} />
              <div>
                <Text fz="sm" fw={500} lh={1.2}>
                  {playerName}
                </Text>
                {draftedBy && (
                  <Text fz="xs" c="dimmed" lh={1.2}>
                    {draftedBy.displayName || draftedBy.email}
                  </Text>
                )}
              </div>
            </Group>
          </Table.Td>
          <Table.Td>{seasonScore}</Table.Td>
          <Table.Td>
            {draftPick?.order ? getNumberWithOrdinal(draftPick.order) : ""}
            {playerElimination && (
              <>
                {" · "}
                <Badge
                  size="xs"
                  color={
                    isFTCEliminated
                      ? "blue"
                      : isRemovedFromGame
                        ? "red"
                        : "gray"
                  }
                >
                  {isFTCEliminated
                    ? "FTC"
                    : isRemovedFromGame
                      ? "Removed"
                      : `Out ${getNumberWithOrdinal(playerElimination.order)}`}
                </Badge>
              </>
            )}
          </Table.Td>
        </Table.Tr>
      );
    });

  return (
    <Table highlightOnHover verticalSpacing="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Player</Table.Th>
          <Table.Th>Total</Table.Th>
          <Table.Th>Pick / Status</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
};
