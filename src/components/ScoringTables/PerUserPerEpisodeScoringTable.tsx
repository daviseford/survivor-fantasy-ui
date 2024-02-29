import { Table } from "@mantine/core";
import { sum } from "lodash-es";
import { useChallenges } from "../../hooks/useChallenges";
import { useCompetition } from "../../hooks/useCompetition";
import { useEliminations } from "../../hooks/useEliminations";
import { useEvents } from "../../hooks/useEvents";
import { usePropBetScoring } from "../../hooks/useGetPropBetScoring";
import { useSeason } from "../../hooks/useSeason";
import {
  EnhancedScores,
  getEnhancedSurvivorPoints,
} from "../../utils/scoringUtils";

export const PerUserPerEpisodeScoringTable = () => {
  const { data: competition } = useCompetition();
  const { data: season } = useSeason(competition?.season_id);
  const { data: challenges } = useChallenges(competition?.season_id);
  const { data: eliminations } = useEliminations(competition?.season_id);
  const { data: events } = useEvents(season?.id);

  const propBetScores = usePropBetScoring();

  const survivorPointsByEpisode = season?.players.reduce(
    (accum, player) => {
      const p = (season?.episodes || []).map((e) =>
        getEnhancedSurvivorPoints(
          Object.values(challenges || {}),
          Object.values(eliminations || {}),
          Object.values(events || {}),
          e.order,
          player.name,
        ),
      );

      accum[player.name] = p;

      return accum;
    },
    {} as Record<string, EnhancedScores[]>,
  );

  const pointsByUserPerEpisode = competition?.participants.reduce(
    (accum, participant) => {
      const { uid } = participant;

      const myPlayerNames = competition.draft_picks
        .filter((x) => x.user_uid === uid)
        .map((x) => x.player_name);

      const playerPointsPerEpisode = (season?.episodes || []).map((e) => {
        return sum(
          myPlayerNames.flatMap(
            (p) =>
              (survivorPointsByEpisode || {})?.[p]?.[e.order - 1]?.total || 0,
          ),
        );
      });

      accum[uid] = playerPointsPerEpisode;

      return accum;
    },
    {} as Record<string, number[]>,
  );

  const rows = Object.entries(pointsByUserPerEpisode || {})
    .sort((a, b) => sum(b[1]) - sum(a[1])) // sort by highest
    .map(([uid, value], i) => {
      const propBetPoints = propBetScores[uid];

      const user = competition?.participants.find((x) => x.uid === uid);

      return (
        <Table.Tr key={uid}>
          <Table.Td>{i + 1}</Table.Td>
          <Table.Td>{user?.displayName || user?.email}</Table.Td>

          {value.map((x) => (
            <Table.Td>{x}</Table.Td>
          ))}

          <Table.Td>{propBetPoints.total}</Table.Td>

          <Table.Td>{sum(value) + propBetPoints.total}</Table.Td>
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
          <Table.Th>Prop Bet Points</Table.Th>
          <Table.Th>Total</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
};
