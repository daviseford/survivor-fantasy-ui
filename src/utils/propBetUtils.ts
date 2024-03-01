import { countBy, entries } from "lodash-es";
import { PropBetsQuestions } from "../data/propbets";
import {
  Challenge,
  Competition,
  Elimination,
  GameEvent,
  Season,
  SlimUser,
} from "../types";

export type PropBetAnswer = {
  user_uid: SlimUser["uid"];
  user_name: SlimUser["displayName"];
  correct: boolean;
  answer: string;
  points_awarded: number;
};

type PropBetScores = Record<keyof typeof PropBetsQuestions, PropBetAnswer> & {
  total: number;
};

type PropBetScoresByUser = Record<SlimUser["uid"], PropBetScores>;

export const getPropBetScoresByUser = (
  events: Record<GameEvent["id"], GameEvent>,
  eliminations: Record<Elimination["id"], Elimination>,
  challenges: Record<Challenge["id"], Challenge>,
  competition?: Competition,
  season?: Season,
): PropBetScoresByUser => {
  if (!competition?.participant_uids || !season || !competition.prop_bets)
    return {};

  return competition.participant_uids.reduce<PropBetScoresByUser>((a, b) => {
    const scores = getPropBetScoresForUser(
      b,
      events,
      eliminations,
      challenges,
      competition,
      season,
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
  season: Season,
): PropBetScores => {
  const myPropBets = (competition?.prop_bets || []).find(
    (x) => x.user_uid === uid,
  )?.values;

  const _user = competition.participants.find((x) => x.uid === uid);

  const emptyAnswer: PropBetAnswer = {
    user_uid: uid,
    user_name: _user?.displayName || _user?.email || uid,
    correct: false,
    points_awarded: 0,
    answer: "",
  };

  const scores = {
    total: 0,
    propbet_first_vote: {
      ...emptyAnswer,
      answer: myPropBets?.propbet_first_vote || "",
    },
    propbet_ftc: { ...emptyAnswer, answer: myPropBets?.propbet_ftc || "" },
    propbet_idols: { ...emptyAnswer, answer: myPropBets?.propbet_idols || "" },
    propbet_immunities: {
      ...emptyAnswer,
      answer: myPropBets?.propbet_immunities || "",
    },
    propbet_medical_evac: {
      ...emptyAnswer,
      answer: myPropBets?.propbet_medical_evac || "",
    },
    propbet_winner: {
      ...emptyAnswer,
      answer: myPropBets?.propbet_winner || "",
    },
  } satisfies PropBetScores;

  // bail if no data
  if (!myPropBets) return scores;

  const addCorrect = (key: Exclude<keyof typeof scores, "total">) => {
    scores[key].correct = true;
    scores[key].points_awarded = PropBetsQuestions[key].point_value;
    scores.total += PropBetsQuestions[key].point_value;
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
  // Wait until finale to declare right or wrong for "No" answer
  const hasFinaleOccurred = season.episodes.some((x) => x.finale);

  if (
    (hasEvac && myPropBets?.propbet_medical_evac === "Yes") ||
    (!hasEvac && myPropBets?.propbet_medical_evac === "No" && hasFinaleOccurred)
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

  return scores;
};
