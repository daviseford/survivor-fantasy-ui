import { Table } from "@mantine/core";
import { sum } from "lodash-es";
import { useChallenges } from "../../hooks/useChallenges";
import { useCompetition } from "../../hooks/useCompetition";
import { useEliminations } from "../../hooks/useEliminations";
import { useEvents } from "../../hooks/useEvents";
import { useSeason } from "../../hooks/useSeason";
import { getSurvivorPointsPerEpisode } from "./utils";

export const PerPlayerPerEpisodeScoringTable = () => {
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

  const pointsByPlayer = competition?.participants.reduce(
    (accum, participant) => {
      const { uid, displayName, email } = participant;

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

      accum[displayName || email || uid] = playerPointsPerEpisode;

      return accum;
    },
    {} as Record<string, number[]>,
  );

  console.log({ pointsBySurvivor, pointsByPlayer });

  const rows = Object.entries(pointsByPlayer || {})
    .sort((a, b) => sum(b[1]) - sum(a[1])) // sort by highest
    .map(([key, value]) => {
      return (
        <Table.Tr key={key}>
          <Table.Td>{key}</Table.Td>

          {value.map((x) => (
            <Table.Td>{x}</Table.Td>
          ))}

          <Table.Td>{sum(value)}</Table.Td>
        </Table.Tr>
      );
    });

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Player Name</Table.Th>
          {season?.episodes.map((x) => <Table.Th>Ep. {x.order}</Table.Th>)}
          <Table.Th>Total</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
};
