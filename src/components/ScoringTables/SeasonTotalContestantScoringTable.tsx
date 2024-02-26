import { Table } from "@mantine/core";
import { sum } from "lodash-es";
import { useChallenges } from "../../hooks/useChallenges";
import { useCompetition } from "../../hooks/useCompetition";
import { useEliminations } from "../../hooks/useEliminations";
import { useSeason } from "../../hooks/useSeason";
import { getSurvivorPointsPerEpisode } from "./utils";

export const SeasonTotalContestantScoringTable = () => {
  const { data: competition } = useCompetition();
  const { data: season } = useSeason(competition?.season_id);
  const { data: challenges } = useChallenges(competition?.season_id);
  const { data: eliminations } = useEliminations(competition?.season_id);

  const pointsByPlayer = season?.players?.reduce(
    (accum, player) => {
      accum[player.name] = season?.episodes.map((x) => {
        return getSurvivorPointsPerEpisode(
          season,
          challenges || [],
          eliminations || [],
          x.order,
          player.name,
        );
      });

      return accum;
    },
    {} as Record<string, number[]>,
  );

  console.log({ pointsByPlayer });

  const rows = Object.entries(pointsByPlayer || {})
    .sort((a, b) => sum(b[1]) - sum(a[1])) // sort by highest
    .map(([key, value]) => {
      return (
        <Table.Tr key={key}>
          <Table.Td>{key}</Table.Td>
          <Table.Td>{sum(value)}</Table.Td>
        </Table.Tr>
      );
    });

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Total</Table.Th>
          <Table.Th>Player Name</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
};
