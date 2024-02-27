import { Avatar, Group, Table, Text } from "@mantine/core";
import { sum } from "lodash-es";
import { useChallenges } from "../../hooks/useChallenges";
import { useCompetition } from "../../hooks/useCompetition";
import { useEliminations } from "../../hooks/useEliminations";
import { useEvents } from "../../hooks/useEvents";
import { useSeason } from "../../hooks/useSeason";
import { getSurvivorPointsPerEpisode } from "./utils";

export const SeasonTotalContestantScoringTable = () => {
  const { data: competition } = useCompetition();
  const { data: season } = useSeason(competition?.season_id);
  const { data: challenges } = useChallenges(competition?.season_id);
  const { data: eliminations } = useEliminations(competition?.season_id);
  const { data: events } = useEvents(competition?.season_id, true);

  const pointsByPlayer = season?.players?.reduce(
    (accum, player) => {
      accum[player.name] = season?.episodes.map((x) => {
        return getSurvivorPointsPerEpisode(
          season,
          challenges || [],
          eliminations || [],
          events || [],
          x.order,
          player.name,
        );
      });

      return accum;
    },
    {} as Record<string, number[]>,
  );

  console.log({ pointsByPlayer, competition });

  const rows = Object.entries(pointsByPlayer || {})
    .sort((a, b) => sum(b[1]) - sum(a[1])) // sort by highest
    .map(([key, value]) => {
      const playerData = season?.players.find((x) => x.name === key);

      const draftPick = competition?.draft_picks.find(
        (x) => x.player_name === key,
      );

      const draftedBy = competition?.participants.find(
        (x) => x.uid === draftPick?.user_uid,
      )?.displayName;

      return (
        <Table.Tr key={key}>
          <Table.Td>
            <Group gap="sm">
              <Avatar size={40} src={playerData?.img} radius={40} />

              <Text fz="sm" fw={500}>
                {key}
              </Text>
            </Group>
          </Table.Td>
          <Table.Td>{sum(value)}</Table.Td>
          <Table.Td>{draftedBy}</Table.Td>
          <Table.Td>{draftPick?.order}</Table.Td>
        </Table.Tr>
      );
    });

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Player Name</Table.Th>
          <Table.Th>Total Points</Table.Th>
          <Table.Th>Drafted By</Table.Th>
          <Table.Th>Pick #</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
};
