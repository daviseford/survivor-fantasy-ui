import { countBy, entries } from "lodash-es";
import { PropBetsQuestions } from "../data/propbets";
import {
  Challenge,
  Competition,
  Elimination,
  GameEvent,
  SlimUser,
} from "../types";

export type PropBetStatus =
  | "definitive_correct"
  | "definitive_incorrect"
  | "leading"
  | "pending";

export type PropBetAnswer = {
  user_uid: SlimUser["uid"];
  user_name: SlimUser["displayName"];
  status: PropBetStatus;
  correct: boolean;
  answer: string;
  points_awarded: number;
};

type PropBetScores = Record<keyof typeof PropBetsQuestions, PropBetAnswer> & {
  total: number;
};

export type PropBetScoresByUser = Record<SlimUser["uid"], PropBetScores>;

export const getPropBetScoresByUser = (
  events: Record<GameEvent["id"], GameEvent>,
  eliminations: Record<Elimination["id"], Elimination>,
  challenges: Record<Challenge["id"], Challenge>,
  hasFinaleOccurred: boolean,
  competition?: Competition,
): PropBetScoresByUser => {
  if (!competition?.participant_uids || !competition.prop_bets) return {};

  return competition.participant_uids.reduce<PropBetScoresByUser>((a, b) => {
    const scores = getPropBetScoresForUser(
      b,
      events,
      eliminations,
      challenges,
      hasFinaleOccurred,
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
  hasFinaleOccurred: boolean,
  competition: Competition,
): PropBetScores => {
  const myPropBets = (competition?.prop_bets || []).find(
    (x) => x.user_uid === uid,
  )?.values;

  const _user = competition.participants.find((x) => x.uid === uid);

  const emptyAnswer: PropBetAnswer = {
    user_uid: uid,
    user_name: _user?.displayName || _user?.email || uid,
    status: "pending",
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

  const setStatus = (
    key: Exclude<keyof typeof scores, "total">,
    status: PropBetStatus,
  ) => {
    scores[key].status = status;
    scores[key].correct = status === "definitive_correct";
    if (status === "definitive_correct") {
      scores[key].points_awarded = PropBetsQuestions[key].point_value;
      scores.total += PropBetsQuestions[key].point_value;
    }
  };

  const _events = Object.values(events);
  const _elims = Object.values(eliminations);

  // --- propbet_first_vote ---
  const firstEpisodeElim = _elims.find((x) => x.order === 1);
  if (firstEpisodeElim) {
    if (firstEpisodeElim.player_name === myPropBets.propbet_first_vote) {
      setStatus("propbet_first_vote", "definitive_correct");
    } else {
      setStatus("propbet_first_vote", "definitive_incorrect");
    }
  }
  // else: pending (no elimination data yet)

  // --- propbet_winner ---
  const winSurvivorEvent = _events.find((x) => x.action === "win_survivor");
  const winnerPickEliminated = _elims.some(
    (x) => x.player_name === myPropBets.propbet_winner,
  );
  if (winSurvivorEvent) {
    if (winSurvivorEvent.player_name === myPropBets.propbet_winner) {
      setStatus("propbet_winner", "definitive_correct");
    } else {
      setStatus("propbet_winner", "definitive_incorrect");
    }
  } else if (winnerPickEliminated) {
    setStatus("propbet_winner", "definitive_incorrect");
  }
  // else: pending (player still alive, no finale yet)

  // --- propbet_ftc ---
  const ftcEvent = _events.find(
    (x) =>
      x.action === "make_final_tribal_council" &&
      x.player_name === myPropBets.propbet_ftc,
  );
  const ftcPickEliminated = _elims.some(
    (x) =>
      x.player_name === myPropBets.propbet_ftc &&
      x.variant !== "final_tribal_council",
  );
  if (ftcEvent) {
    setStatus("propbet_ftc", "definitive_correct");
  } else if (ftcPickEliminated) {
    setStatus("propbet_ftc", "definitive_incorrect");
  } else if (hasFinaleOccurred) {
    // Finale happened but no make_final_tribal_council event for this pick
    setStatus("propbet_ftc", "definitive_incorrect");
  }
  // else: pending (player still alive, no finale yet)

  // --- propbet_medical_evac ---
  const hasEvac = _elims.some((x) => x.variant === "medical");
  if (myPropBets.propbet_medical_evac === "Yes") {
    if (hasEvac) {
      setStatus("propbet_medical_evac", "definitive_correct");
    } else if (hasFinaleOccurred) {
      setStatus("propbet_medical_evac", "definitive_incorrect");
    }
    // else: pending
  } else if (myPropBets.propbet_medical_evac === "No") {
    if (hasEvac) {
      setStatus("propbet_medical_evac", "definitive_incorrect");
    } else if (hasFinaleOccurred) {
      setStatus("propbet_medical_evac", "definitive_correct");
    }
    // else: pending
  }

  // --- propbet_immunities ---
  const immunities = Object.values(challenges).filter(
    (x) => x.variant === "combined" || x.variant === "immunity",
  );
  const allImmunityWinners = immunities.flatMap((x) => x.winning_players);
  const rankedImmunityWinners = entries(countBy(allImmunityWinners));
  const topImmunityCount = rankedImmunityWinners?.[0]?.[1] ?? 0;
  const immunityLeaders = rankedImmunityWinners
    .filter((x) => x[1] === topImmunityCount)
    .map((x) => x[0]);

  const immunityPickLeading =
    topImmunityCount > 0 &&
    immunityLeaders.some((x) => x === myPropBets.propbet_immunities);
  const immunityPickEliminated = _elims.some(
    (x) => x.player_name === myPropBets.propbet_immunities,
  );
  const immunityPickCount =
    allImmunityWinners.filter((x) => x === myPropBets.propbet_immunities)
      .length ?? 0;

  if (hasFinaleOccurred) {
    if (immunityPickLeading) {
      setStatus("propbet_immunities", "definitive_correct");
    } else {
      setStatus("propbet_immunities", "definitive_incorrect");
    }
  } else if (immunityPickLeading) {
    setStatus("propbet_immunities", "leading");
  } else if (
    immunityPickEliminated &&
    immunityPickCount < topImmunityCount
  ) {
    // Pick is eliminated and behind the leader — can never catch up
    setStatus("propbet_immunities", "definitive_incorrect");
  }
  // else: pending

  // --- propbet_idols ---
  const idols = _events.filter((x) => x.action === "find_idol");
  const allIdolFinders = idols.map((x) => x.player_name);
  const rankedFinders = entries(countBy(allIdolFinders));
  const topIdolCount = rankedFinders?.[0]?.[1] ?? 0;
  const idolLeaders = rankedFinders
    .filter((x) => x[1] === topIdolCount)
    .map((x) => x[0]);

  const idolPickLeading =
    topIdolCount > 0 &&
    idolLeaders.some((x) => x === myPropBets.propbet_idols);
  const idolPickEliminated = _elims.some(
    (x) => x.player_name === myPropBets.propbet_idols,
  );
  const idolPickCount =
    allIdolFinders.filter((x) => x === myPropBets.propbet_idols).length ?? 0;

  if (hasFinaleOccurred) {
    if (idolPickLeading) {
      setStatus("propbet_idols", "definitive_correct");
    } else {
      setStatus("propbet_idols", "definitive_incorrect");
    }
  } else if (idolPickLeading) {
    setStatus("propbet_idols", "leading");
  } else if (idolPickEliminated && idolPickCount < topIdolCount) {
    // Pick is eliminated and behind the leader — can never catch up
    setStatus("propbet_idols", "definitive_incorrect");
  }
  // else: pending

  return scores;
};
