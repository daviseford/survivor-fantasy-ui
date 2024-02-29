import { countBy, entries } from "lodash-es";
import { PropBetsQuestions } from "../data/propbets";
import { BASE_PLAYER_SCORING } from "../data/scoring";
import {
  Challenge,
  Competition,
  Elimination,
  GameEvent,
  PlayerAction,
  Season,
  SlimUser,
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

export const getPerUserPropPoints = (
  uid: SlimUser["uid"],
  events: Record<GameEvent["id"], GameEvent>,
  eliminations: Record<Elimination["id"], Elimination>,
  challenges: Record<Challenge["id"], Challenge>,
  competition?: Competition,
) => {
  if (!competition?.prop_bets) return 0;

  const myPropBets = competition.prop_bets.find(
    (x) => x.user_uid === uid,
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

  if (idolWinners.some((x) => x === myPropBets?.propbet_idols)) {
    total += PropBetsQuestions.propbet_idols.point_value;
  }

  return total;
};

export type PropBetAnswer = {
  user_uid: SlimUser["uid"];
  user_name: SlimUser["displayName"];
  correct: boolean;
  answer: string;
  points_awarded: number;
};

type PropBetScores = Record<keyof typeof PropBetsQuestions, PropBetAnswer>;

type PropBetScoresByUser = Record<SlimUser["uid"], PropBetScores>;

export const getPropBetScoresByUser = (
  events: Record<GameEvent["id"], GameEvent>,
  eliminations: Record<Elimination["id"], Elimination>,
  challenges: Record<Challenge["id"], Challenge>,
  competition?: Competition,
): PropBetScoresByUser => {
  if (!competition?.participant_uids) return {};

  return competition.participant_uids.reduce<PropBetScoresByUser>((a, b) => {
    const scores = getPropBetScoresForUser(
      b,
      events,
      eliminations,
      challenges,
      competition,
    );
    if (scores) {
      a[b] = scores;
    }
    return a;
  }, {});
};

export const getPropBetScoresForUser = (
  uid: SlimUser["uid"],
  events: Record<GameEvent["id"], GameEvent>,
  eliminations: Record<Elimination["id"], Elimination>,
  challenges: Record<Challenge["id"], Challenge>,
  competition: Competition,
): PropBetScores | undefined => {
  const myPropBets = competition.prop_bets.find(
    (x) => x.user_uid === uid,
  )?.values;

  // bail if no data
  if (!myPropBets) return;

  const emptyAnswer: PropBetAnswer = {
    user_uid: uid,
    user_name:
      competition.participants.find((x) => x.uid === uid)?.displayName || uid,
    correct: false,
    points_awarded: 0,
    answer: "",
  };

  const total = {
    propbet_first_vote: {
      ...emptyAnswer,
      answer: myPropBets.propbet_first_vote,
    },
    propbet_ftc: { ...emptyAnswer, answer: myPropBets.propbet_ftc },
    propbet_idols: { ...emptyAnswer, answer: myPropBets.propbet_idols },
    propbet_immunities: {
      ...emptyAnswer,
      answer: myPropBets.propbet_immunities,
    },
    propbet_medical_evac: {
      ...emptyAnswer,
      answer: myPropBets.propbet_medical_evac,
    },
    propbet_winner: { ...emptyAnswer, answer: myPropBets.propbet_winner },
  } satisfies PropBetScores;

  const addCorrect = (key: keyof typeof total) => {
    total[key].correct = true;
    total[key].points_awarded = PropBetsQuestions[key].point_value;
  };

  const _events = Object.values(events);
  const _elims = Object.values(eliminations);

  // First one out
  const firstEpisodeElim = _elims.find((x) => x.order === 1);
  if (firstEpisodeElim?.player_name === myPropBets?.propbet_first_vote) {
    addCorrect("propbet_first_vote");
  }

  // Are we a winner?
  if (
    _events.find(
      (x) =>
        x.action === "win_survivor" &&
        x.player_name === myPropBets?.propbet_winner,
    )
  ) {
    addCorrect("propbet_winner");
  }

  // Did we make FTC?
  if (
    _events.find(
      (x) =>
        x.action === "make_final_tribal_council" &&
        x.player_name === myPropBets?.propbet_ftc,
    )
  ) {
    addCorrect("propbet_ftc");
  }

  // Was there a medical evac?
  const hasEvac = _elims.some((x) => x.variant === "medical");
  if (
    (hasEvac && myPropBets?.propbet_medical_evac === "Yes") ||
    (!hasEvac && myPropBets?.propbet_medical_evac === "No")
  ) {
    addCorrect("propbet_medical_evac");
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
    addCorrect("propbet_immunities");
  }

  // who  found the most idols?
  const idols = _events.filter((x) => x.action === "find_idol");
  const allIdolFinders = idols.map((x) => x.player_name);
  const rankedFinders = entries(countBy(allIdolFinders));
  const highestIdolCount = rankedFinders?.[0]?.[1];
  const idolWinners = rankedFinders
    .filter((x) => x[1] === highestIdolCount)
    .map((x) => x[0]);

  if (idolWinners.some((x) => x === myPropBets?.propbet_idols)) {
    addCorrect("propbet_idols");
  }

  return total;
};
