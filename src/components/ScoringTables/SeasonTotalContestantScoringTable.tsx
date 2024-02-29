import { Avatar, Badge, Group, Table, Text } from "@mantine/core";
import { sum } from "lodash-es";
import { useChallenges } from "../../hooks/useChallenges";
import { useCompetition } from "../../hooks/useCompetition";
import { useEliminations } from "../../hooks/useEliminations";
import { useEvents } from "../../hooks/useEvents";
import { useSeason } from "../../hooks/useSeason";
import { getNumberWithOrdinal } from "../../utils/misc";
import { getEnhancedSurvivorPoints } from "../../utils/scoringUtils";

export const SeasonTotalContestantScoringTable = () => {
  const { data: competition } = useCompetition();
  const { data: season } = useSeason(competition?.season_id);
  const { data: challenges } = useChallenges(competition?.season_id);
  const { data: eliminations } = useEliminations(competition?.season_id);
  const { data: events } = useEvents(season?.id);

  const pointsByPlayer = season?.players?.reduce(
    (accum, player) => {
      accum[player.name] = season?.episodes.map((x) => {
        return getEnhancedSurvivorPoints(
          Object.values(challenges || {}),
          Object.values(eliminations || {}),
          Object.values(events || {}),
          x.order,
          player.name,
        ).total;
      });

      return accum;
    },
    {} as Record<string, number[]>,
  );

  console.log({ pointsByPlayer, competition });

  const rows = Object.entries(pointsByPlayer || {})
    .sort((a, b) => sum(b[1]) - sum(a[1])) // sort by highest
    .map(([playerName, value]) => {
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
            <Group gap="sm">
              <Avatar size={40} src={playerData?.img} radius={40} />

              <Text fz="sm" fw={500}>
                {playerName}
              </Text>
            </Group>
          </Table.Td>
          <Table.Td>{sum(value)}</Table.Td>
          <Table.Td>{draftedBy?.displayName || draftedBy?.email}</Table.Td>
          <Table.Td>{draftPick?.order}</Table.Td>
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
    <Table highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Player Name</Table.Th>
          <Table.Th>Total Points</Table.Th>
          <Table.Th>Drafted By</Table.Th>
          <Table.Th>Pick #</Table.Th>
          <Table.Th></Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
};
