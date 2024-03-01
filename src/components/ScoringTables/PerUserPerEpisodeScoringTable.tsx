import { Table } from "@mantine/core";
import { useCompetition } from "../../hooks/useCompetition";
import { useScoringCalculations } from "../../hooks/useScoringCalculations";
import { useSeason } from "../../hooks/useSeason";

export const PerUserPerEpisodeScoringTable = () => {
  const { data: competition } = useCompetition();
  const { data: season } = useSeason(competition?.season_id);

  const { pointsByUserPerEpisodeWithPropBets } = useScoringCalculations();

  const rows = Object.entries(pointsByUserPerEpisodeWithPropBets)
    .sort((a, b) => b[1].total - a[1].total) // sort by highest
    .map(([uid, values], i) => {
      const user = competition?.participants.find((x) => x.uid === uid);

      return (
        <Table.Tr key={uid}>
          <Table.Td>{i + 1}</Table.Td>
          <Table.Td>{user?.displayName || user?.email}</Table.Td>

          {values.episodePoints.map((x) => (
            <Table.Td>{x}</Table.Td>
          ))}

          {competition?.prop_bets && (
            <Table.Td>{values.propBetPoints}</Table.Td>
          )}

          <Table.Td>{values.total}</Table.Td>
        </Table.Tr>
      );
    });

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Rank</Table.Th>
          <Table.Th>User Name</Table.Th>
          {season?.episodes.map((x) => <Table.Th>Ep. {x.order}</Table.Th>)}
          {competition?.prop_bets && <Table.Th>Prop Bet Points</Table.Th>}
          <Table.Th>Total</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
};
