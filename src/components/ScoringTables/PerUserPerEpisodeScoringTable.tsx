import { Table } from "@mantine/core";
import { sum } from "lodash-es";
import { useChallenges } from "../../hooks/useChallenges";
import { useCompetition } from "../../hooks/useCompetition";
import { useEliminations } from "../../hooks/useEliminations";
import { useEvents } from "../../hooks/useEvents";
import { useSeason } from "../../hooks/useSeason";
import { getPerUserPropPoints, getSurvivorPointsPerEpisode } from "./utils";

export const PerUserPerEpisodeScoringTable = () => {
  const { data: competition } = useCompetition();
  const { data: season } = useSeason(competition?.season_id);
  const { data: challenges } = useChallenges(competition?.season_id);
  const { data: eliminations } = useEliminations(competition?.season_id);
  const { data: events } = useEvents(season?.id);

  const pointsBySurvivor = season?.players?.reduce(
    (accum, player) => {
      accum[player.name] = season?.episodes.map((x) => {
        return getSurvivorPointsPerEpisode(
          season,
          Object.values(challenges || {}),
          Object.values(eliminations || {}),
          Object.values(events || {}),
          x.order,
          player.name,
        );
      });

      return accum;
    },
    {} as Record<string, number[]>,
  );

  const pointsByUser = competition?.participants.reduce(
    (accum, participant) => {
      const { uid } = participant;

      const survivorNames = competition.draft_picks
        .filter((x) => x.user_uid === uid)
        .map((x) => x.player_name);

      const playerPointsPerEpisode = !season
        ? []
        : season.episodes.map((e) => {
            return sum(
              survivorNames.map((x) => {
                return getSurvivorPointsPerEpisode(
                  season,
                  Object.values(challenges || {}),
                  Object.values(eliminations || {}),
                  Object.values(events || {}),
                  e.order,
                  x,
                );
              }),
            );
          });

      accum[uid] = playerPointsPerEpisode;

      return accum;
    },
    {} as Record<string, number[]>,
  );

  console.log({ pointsBySurvivor, pointsByPlayer: pointsByUser });

  const rows = Object.entries(pointsByUser || {})
    .sort((a, b) => sum(b[1]) - sum(a[1])) // sort by highest
    .map(([uid, value], i) => {
      const propBetPoints = getPerUserPropPoints(
        uid,
        events,
        eliminations,
        challenges,
        competition,
      );
      return (
        <Table.Tr key={uid}>
          <Table.Td>{i + 1}</Table.Td>
          <Table.Td>
            {competition?.participants.find((x) => x.uid === uid)?.displayName}
          </Table.Td>

          {value.map((x) => (
            <Table.Td>{x}</Table.Td>
          ))}

          <Table.Td>{propBetPoints}</Table.Td>

          <Table.Td>{sum(value) + propBetPoints}</Table.Td>
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
