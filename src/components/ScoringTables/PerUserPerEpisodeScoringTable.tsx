import { Table } from "@mantine/core";
import { useCompetition } from "../../hooks/useCompetition";
import { useScoringCalculations } from "../../hooks/useScoringCalculations";
import { useSeason } from "../../hooks/useSeason";
import { useUser } from "../../hooks/useUser";

export const PerUserPerEpisodeScoringTable = () => {
  const { data: competition } = useCompetition();
  const { data: season } = useSeason(competition?.season_id);
  const { slimUser } = useUser();

  const { pointsByUserPerEpisodeWithPropBets } = useScoringCalculations();

  const rows = Object.entries(pointsByUserPerEpisodeWithPropBets)
    .sort((a, b) => b[1].total - a[1].total) // sort by highest
    .map(([uid, values], i) => {
      const user = competition?.participants.find((x) => x.uid === uid);
      const isCurrentUser = uid === slimUser?.uid;
      const isLeader = i === 0;

      return (
        <Table.Tr
          key={uid}
          style={
            isCurrentUser
              ? { backgroundColor: "var(--mantine-color-blue-light)" }
              : undefined
          }
        >
          <Table.Td fw={isLeader ? 700 : undefined}>{i + 1}</Table.Td>
          <Table.Td fw={isLeader ? 600 : undefined}>
            {user?.displayName || user?.email}
          </Table.Td>
          <Table.Td fw={700}>{values.total}</Table.Td>

          {values.episodePoints.map((x, idx) => (
            <Table.Td key={idx}>{x}</Table.Td>
          ))}

          {competition?.prop_bets && (
            <Table.Td>{values.propBetPoints}</Table.Td>
          )}
        </Table.Tr>
      );
    });

  return (
    <Table.ScrollContainer minWidth={300}>
      <Table withColumnBorders style={{ width: "auto" }}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={50}>Rank</Table.Th>
            <Table.Th>User Name</Table.Th>
            <Table.Th w={70}>Points</Table.Th>
            {season?.episodes.map((x) => (
              <Table.Th key={x.id} w={60}>
                Ep. {x.order}
              </Table.Th>
            ))}
            {competition?.prop_bets && <Table.Th w={80}>Props</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
};
