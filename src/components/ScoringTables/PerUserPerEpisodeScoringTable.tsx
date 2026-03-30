import { Badge, Table, Text } from "@mantine/core";
import { IconTrophy } from "@tabler/icons-react";
import { useCompetition } from "../../hooks/useCompetition";
import { useScoringCalculations } from "../../hooks/useScoringCalculations";
import { useSeason } from "../../hooks/useSeason";
import { useUser } from "../../hooks/useUser";

export const PerUserPerEpisodeScoringTable = () => {
  const { data: competition } = useCompetition();
  const { data: season } = useSeason(competition?.season_id);
  const { slimUser } = useUser();

  const { pointsByUserPerEpisodeWithPropBets } = useScoringCalculations();

  const sortedEntries = Object.entries(pointsByUserPerEpisodeWithPropBets).sort(
    (a, b) => b[1].total - a[1].total,
  );

  const rows = sortedEntries.map(([uid, values], i) => {
    const user = competition?.participants.find((x) => x.uid === uid);
    const isCurrentUser = uid === slimUser?.uid;
    const isLeader = i === 0;

    const bgColor = isLeader
      ? "var(--mantine-color-yellow-0)"
      : isCurrentUser
        ? "var(--mantine-color-blue-0)"
        : undefined;

    return (
      <Table.Tr key={uid} style={{ backgroundColor: bgColor }}>
        <Table.Td fw={600} ta="center">
          {isLeader ? (
            <IconTrophy
              size={16}
              color="var(--mantine-color-yellow-6)"
              style={{ verticalAlign: "middle" }}
            />
          ) : (
            <Text span c="dimmed" size="sm">
              {i + 1}
            </Text>
          )}
        </Table.Td>
        <Table.Td fw={isLeader ? 700 : 500}>
          {user?.displayName || user?.email}
        </Table.Td>
        <Table.Td>
          <Badge
            variant={isLeader ? "filled" : "light"}
            color={isLeader ? "yellow" : "gray"}
            size="lg"
            fw={700}
          >
            {values.total}
          </Badge>
        </Table.Td>

        {values.episodePoints.map((x, idx) => (
          <Table.Td key={idx} ta="center">
            <Text span size="sm" c={x === 0 ? "dimmed" : undefined}>
              {x}
            </Text>
          </Table.Td>
        ))}

        {competition?.prop_bets && (
          <Table.Td ta="center">
            <Text span size="sm" c={values.propBetPoints === 0 ? "dimmed" : undefined}>
              {values.propBetPoints}
            </Text>
          </Table.Td>
        )}
      </Table.Tr>
    );
  });

  return (
    <Table.ScrollContainer minWidth={300}>
      <Table
        withColumnBorders
        highlightOnHover
        verticalSpacing="sm"
        style={{ width: "auto" }}
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={50} ta="center">
              #
            </Table.Th>
            <Table.Th>Player</Table.Th>
            <Table.Th w={80} ta="center">
              Total
            </Table.Th>
            {season?.episodes.map((x) => (
              <Table.Th key={x.id} w={60} ta="center">
                Ep {x.order}
              </Table.Th>
            ))}
            {competition?.prop_bets && (
              <Table.Th w={80} ta="center">
                Props
              </Table.Th>
            )}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
};
