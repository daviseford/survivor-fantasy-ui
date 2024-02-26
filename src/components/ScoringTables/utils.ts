import { BASE_PLAYER_SCORING } from "../../data/scoring";
import { Challenge, Elimination, PlayerAction, Season } from "../../types";

const addFixedActionPoints = (action: PlayerAction) =>
  BASE_PLAYER_SCORING.find((x) => x.action === action)?.fixed_value || 0;

export const getSurvivorPointsPerEpisode = (
  season: Season,
  challenges: Challenge[],
  eliminations: Elimination[],
  episodeNumber: number,
  playerName?: string,
) => {
  if (!season || !playerName) return 0;

  const { episodes } = season;

  const _episode = episodes.find((x) => x.order === episodeNumber);
  const _eliminations = eliminations?.filter(
    (x) => x.episode_id === episodeNumber,
  );
  const _challenges = challenges?.filter((x) => x.episode_id === episodeNumber);

  // console.log(
  //   "There is a total of " +
  //     _challenges?.length +
  //     " challenges for this episode",
  // );

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

    if (e.variant === "medical") {
      total += addFixedActionPoints("medically_evacuated");
    } else if (e.variant === "quitter") {
      total += addFixedActionPoints("quitter");
    }
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
