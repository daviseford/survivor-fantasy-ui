import { BASE_PLAYER_SCORING } from "../data/scoring";
import {
  Challenge,
  Elimination,
  GameEvent,
  PlayerAction,
  Season,
} from "../types";

const addFixedActionPoints = (action: PlayerAction) =>
  BASE_PLAYER_SCORING.find((x) => x.action === action)?.fixed_value || 0;

export const getSurvivorPointsPerEpisode = (
  season: Season,
  challenges: Challenge[],
  eliminations: Elimination[],
  events: GameEvent[],
  episodeNumber: number,
  playerName?: string,
) => {
  if (!season || !playerName) return 0;

  // const { episodes } = season;

  // const _episode = episodes.find((x) => x.order === episodeNumber);
  const _eliminations = eliminations?.filter(
    (x) => x.episode_num === episodeNumber,
  );
  const _challenges = challenges?.filter(
    (x) => x.episode_num === episodeNumber,
  );
  const _events = events?.filter((x) => x.episode_num === episodeNumber);

  let total = 0;

  _challenges?.forEach((c) => {
    // Exit early for losers
    if (!c.winning_players.includes(playerName)) return;
    total += addFixedActionPoints(c.variant);
  });

  // if the player was eliminated, give them points based on episode number
  _eliminations?.forEach((e) => {
    if (e.player_name !== playerName) return;
    total += e.episode_num;

    if (e.variant === "medical") {
      total += addFixedActionPoints("medically_evacuated");
    } else if (e.variant === "quitter") {
      total += addFixedActionPoints("quitter");
    }
  });

  // Handle game events like finding idols etc
  _events.forEach((e) => {
    if (e.player_name !== playerName) return;

    if (e.multiplier) {
      total += addFixedActionPoints(e.action) * e.multiplier;
    } else {
      total += addFixedActionPoints(e.action);
    }
  });

  // todo: post-merge stuff

  return total;
};

export type ScoringActionEntry = {
  action: string;
  points_awarded: number;
};

export type EnhancedScores = {
  episode_num: number;
  total: number;
  actions: ScoringActionEntry[];
};

export const getEnhancedSurvivorPoints = (
  season: Season,
  challenges: Challenge[],
  eliminations: Elimination[],
  events: GameEvent[],
  episodeNumber: number,
  playerName?: string,
) => {
  if (!season || !playerName) return 0;

  const scores: EnhancedScores = {
    episode_num: episodeNumber,
    total: 0,
    actions: [],
  };

  const addToScores = (action: string, points_awarded: number) => {
    scores.actions.push({ action, points_awarded });
    scores.total += points_awarded;
  };

  const _eliminations = eliminations?.filter(
    (x) => x.episode_num === episodeNumber,
  );
  const _challenges = challenges?.filter(
    (x) => x.episode_num === episodeNumber,
  );
  const _events = events?.filter((x) => x.episode_num === episodeNumber);

  _challenges?.forEach((c) => {
    if (c.winning_players.includes(playerName)) {
      addToScores(c.variant, addFixedActionPoints(c.variant));
    }
  });

  // if the player was eliminated, give them points based on episode number
  _eliminations?.forEach((e) => {
    if (e.player_name !== playerName) return;

    addToScores("eliminated", e.episode_num);

    if (e.variant === "medical") {
      addToScores(
        "medically_evacuated",
        addFixedActionPoints("medically_evacuated"),
      );
    } else if (e.variant === "quitter") {
      addToScores("quitter", addFixedActionPoints("quitter"));
    }
  });

  // Handle game events like finding idols etc
  _events.forEach((e) => {
    if (e.player_name !== playerName) return;

    if (e.multiplier) {
      addToScores(e.action, addFixedActionPoints(e.action) * e.multiplier);
    } else {
      addToScores(e.action, addFixedActionPoints(e.action));
    }
  });

  // todo: post-merge stuff

  return scores;
};
