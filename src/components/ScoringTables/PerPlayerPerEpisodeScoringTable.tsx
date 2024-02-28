import { Table } from "@mantine/core";
import { countBy, entries, sum } from "lodash-es";
import { PropBetsQuestions } from "../../data/propbets";
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

  const pointsByUser = competition?.participants.reduce(
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


  const perUserPropPoints = () => {
    const myPropBets = competition?.prop_bets?.find(
      (x) => x.user_uid === competition.participant_uids[0],
    )?.values;

    const _events = Object.values(events);
    const _elims = Object.values(eliminations);

    let total = 0;

    // First one out
    const firstEpisodeElim = _elims.find((x) => x.order === 1);
    if (firstEpisodeElim?.player_name === myPropBets?.propbet_first_vote) {
      total += PropBetsQuestions.propbet_first_vote.point_value;
    }

    // Are we a winner?
    if (
      _events.find(
        (x) =>
          x.action === "win_survivor" &&
          x.player_name === myPropBets?.propbet_winner,
      )
    ) {
      total += PropBetsQuestions.propbet_winner.point_value;
    }

    // Did we make FTC?
    if (
      _events.find(
        (x) =>
          x.action === "make_final_tribal_council" &&
          x.player_name === myPropBets?.propbet_ftc,
      )
    ) {
      total += PropBetsQuestions.propbet_ftc.point_value;
    }

    // Was there a medical evac?
    const hasEvac = _elims.some((x) => x.variant === "medical");
    if (
      (hasEvac && myPropBets?.propbet_medical_evac === "Yes") ||
      (!hasEvac && myPropBets?.propbet_medical_evac === "No")
    ) {
      total += PropBetsQuestions.propbet_medical_evac.point_value;
    }

    // who won the most immunities?
    const immunities = Object.values(challenges).filter(
      (x) => x.variant === "combined" || x.variant === "immunity",
    );
    const allWinners = immunities.flatMap((x) => x.winning_players);
    const rankedWinners = entries(countBy(allWinners));
    const winnerCount = rankedWinners?.[0]?.[1];
    const winners = rankedWinners
      .filter((x) => x[1] === winnerCount)
      .map((x) => x[0]);

    // console.log({
    //   immunities,
    //   allWinners,
    //   rankedWinners,
    //   winnerCount,
    //   winners,
    // });

    if (winners.some((x) => x === myPropBets?.propbet_immunities)) {
      total += PropBetsQuestions.propbet_immunities.point_value;
    }

    // who  found the most idols?
    const idols = _events.filter((x) => x.action === "find_idol");
    const allIdolFinders = idols.map((x) => x.player_name);
    const rankedFinders = entries(countBy(allIdolFinders));
    const highestIdolCount = rankedFinders?.[0]?.[1];
    const idolWinners = rankedFinders
      .filter((x) => x[1] === highestIdolCount)
      .map((x) => x[0]);

    // console.log({
    //   immunities,
    //   allWinners,
    //   rankedWinners,
    //   winnerCount,
    //   winners,
    // });

    if (idolWinners.some((x) => x === myPropBets?.propbet_idols)) {
      total += PropBetsQuestions.propbet_idols.point_value;
    }

    return total;
  };

  console.log({ davis: perUserPropPoints() });

  console.log({ pointsBySurvivor, pointsByPlayer: pointsByUser });

  const rows = Object.entries(pointsByUser || {})
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
