import { SimpleGrid, Table } from "@mantine/core";
import { sum } from "lodash-es";
import { BASE_PLAYER_SCORING } from "../data/scoring";
import { useChallenges } from "../hooks/useChallenges";
import { useCompetition } from "../hooks/useCompetition";
import { useEliminations } from "../hooks/useEliminations";
import { useSeason } from "../hooks/useSeason";

export const ScoringTable = () => {
  return (
    <SimpleGrid cols={2}>
      <PerEpisodeScoringTable />
      <ScoringLegendTable />
    </SimpleGrid>
  );
};

const addFixedActionPoints = (action: string) =>
  BASE_PLAYER_SCORING.find((x) => x.action === action)?.fixed_value || 0;

const PerEpisodeScoringTable = () => {
  const { data: competition } = useCompetition();
  const { data: season } = useSeason(competition?.season_id);
  const { data: challenges } = useChallenges(competition?.season_id);
  const { data: eliminations } = useEliminations(competition?.season_id);

  const calculatePlayerPointsPerEpisode = (
    episodeNumber: number,
    playerName?: string,
  ) => {
    if (!season || !playerName) return 0;

    const { episodes } = season;

    console.log({ episodes, challenges, eliminations });

    const _episode = episodes.find((x) => x.order === episodeNumber);
    const _eliminations = eliminations?.filter(
      (x) => x.episode_id === episodeNumber,
    );
    const _challenges = challenges?.filter(
      (x) => x.episode_id === episodeNumber,
    );

    console.log(
      "There is a total of " +
        _challenges?.length +
        " challenges for this episode",
    );

    let total = 0;

    _challenges?.forEach((c) => {
      // Exit early for losers
      if (!c.winning_players.includes(playerName)) return;
      total += addFixedActionPoints(c.variant);
    });

    // if the player was eliminated, give them points based on episode number
    _eliminations?.forEach((e) => {
      if (e.player_name !== playerName) return;
      total += e.episode_id;
    });

    // if the episode is the finale, and this player was never eliminated, they won survivor
    if (
      _episode?.finale &&
      !eliminations?.find((x) => x.player_name === playerName)
    ) {
      total += addFixedActionPoints("win_survivor");
    }

    // todo: advantages, merge stuff, votes, idols, etc

    return total;
  };

  const twilaPoints = season?.episodes.map((x) => {
    return calculatePlayerPointsPerEpisode(x.order, "Twila Tanner");
  });

  console.log({ twilaPoints });

  const pointsByPlayer2 = season?.players?.reduce(
    (accum, player) => {
      accum[player.name] = season?.episodes.map((x) => {
        return calculatePlayerPointsPerEpisode(x.order, player.name);
      });

      return accum;
    },
    {} as Record<string, number[]>,
  );

  console.log({ pointsByPlayer2 });

  const rows = Object.entries(pointsByPlayer2 || {}).map(([key, value]) => {
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

const ScoringLegendTable = () => {
  const rows = BASE_PLAYER_SCORING.map((x) => (
    <Table.Tr key={x.action}>
      <Table.Td>{x.action}</Table.Td>
      <Table.Td>{x.description}</Table.Td>
      <Table.Td>{x.fixed_value}</Table.Td>
    </Table.Tr>
  ));

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Action</Table.Th>
          <Table.Th>Description</Table.Th>
          <Table.Th>Fixed Value</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
};
