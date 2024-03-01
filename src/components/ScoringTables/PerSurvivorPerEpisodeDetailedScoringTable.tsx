import { Avatar, Badge, Group, Stack, Table, Text } from "@mantine/core";
import { useCompetition } from "../../hooks/useCompetition";
import { useEliminations } from "../../hooks/useEliminations";
import { useEvents } from "../../hooks/useEvents";
import { useScoringCalculations } from "../../hooks/useScoringCalculations";
import { useSeason } from "../../hooks/useSeason";
import { getNumberWithOrdinal } from "../../utils/misc";

export const PerSurvivorPerEpisodeDetailedScoringTable = () => {
  const { data: competition } = useCompetition();
  const { data: season } = useSeason(competition?.season_id);
  const { data: eliminations } = useEliminations(competition?.season_id);
  const { data: events } = useEvents(season?.id);

  const { survivorPointsByEpisode, survivorPointsTotalSeason } =
    useScoringCalculations();

  const rows = Object.entries(survivorPointsByEpisode)
    .sort(
      (a, b) =>
        survivorPointsTotalSeason[b[0]] - survivorPointsTotalSeason[a[0]],
    ) // sort by highest
    .map(([playerName, episodeScores], i) => {
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
          <Table.Td width={"20px"}>{i + 1}</Table.Td>
          <Table.Td width={"240px"}>
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

          {episodeScores.map((s) => {
            return (
              <Table.Td width={"120px"}>
                <Stack gap={"xs"}>
                  {s.actions.map((x) => {
                    const badgeColor =
                      x.action === "eliminated" ? "red" : "dark";

                    return (
                      <Badge size="sm" color={badgeColor}>
                        {x.action.replace(/_/g, " ")} +{x.points_awarded}
                      </Badge>
                    );
                  })}
                </Stack>
              </Table.Td>
            );
          })}
          <Table.Td width={"40px"}>
            {survivorPointsTotalSeason[playerName]}
          </Table.Td>
          <Table.Td width={"150px"}>
            Drafted {getNumberWithOrdinal(draftPick?.order || 0)} by{" "}
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
    <Table.ScrollContainer minWidth={500}>
      <Table
        highlightOnHover
        verticalSpacing={"md"}
        horizontalSpacing={"md"}
        withColumnBorders
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Rank</Table.Th>
            <Table.Th>Player</Table.Th>
            {season?.episodes.map((x) => <Table.Th>Ep {x.order}</Table.Th>)}

            <Table.Th>Total</Table.Th>
            <Table.Th>Draft Pick</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
};
