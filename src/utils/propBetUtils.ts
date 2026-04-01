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

/**
 * Resolves the status of a cumulative leaderboard bet (most idols, most immunities).
 * Given a list of occurrences per player (sorted by count descending), determines
 * whether the picked player is leading, definitively behind, or pending.
 */
const resolveLeaderboardBetStatus = (
  rankedPlayers: [string, number][],
  pickedPlayer: string,
  isPickEliminated: boolean,
  hasFinaleOccurred: boolean,
): PropBetStatus => {
  const topCount = rankedPlayers[0]?.[1] ?? 0;
  const leaders = rankedPlayers
    .filter(([, count]) => count === topCount)
    .map(([name]) => name);

  const isLeading = topCount > 0 && leaders.includes(pickedPlayer);
  const pickCount =
    rankedPlayers.find(([name]) => name === pickedPlayer)?.[1] ?? 0;

  if (hasFinaleOccurred) {
    return isLeading ? "definitive_correct" : "definitive_incorrect";
  }
  if (isLeading) {
    return "leading";
  }
  if (isPickEliminated && pickCount < topCount) {
    return "definitive_incorrect";
  }
  return "pending";
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
    if (firstEpisodeElim.castaway_id === myPropBets.propbet_first_vote) {
      setStatus("propbet_first_vote", "definitive_correct");
    } else {
      setStatus("propbet_first_vote", "definitive_incorrect");
    }
  }
  // else: pending (no elimination data yet)

  // --- propbet_winner ---
  const winSurvivorEvent = _events.find((x) => x.action === "win_survivor");
  const winnerPickEliminated = _elims.some(
    (x) => x.castaway_id === myPropBets.propbet_winner,
  );
  if (winSurvivorEvent) {
    if (winSurvivorEvent.castaway_id === myPropBets.propbet_winner) {
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
      x.castaway_id === myPropBets.propbet_ftc,
  );
  const ftcPickEliminated = _elims.some(
    (x) =>
      x.castaway_id === myPropBets.propbet_ftc &&
      x.variant !== "final_tribal_council",
  );
  if (ftcEvent) {
    setStatus("propbet_ftc", "definitive_correct");
  } else if (ftcPickEliminated) {
    setStatus("propbet_ftc", "definitive_incorrect");
  } else if (hasFinaleOccurred) {
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
    (x) => x.variant === "immunity",
  );
  const allImmunityWinners = immunities.flatMap((x) => x.winning_castaways);
  const rankedImmunityWinners = entries(countBy(allImmunityWinners)).sort(
    (a, b) => b[1] - a[1],
  );
  setStatus(
    "propbet_immunities",
    resolveLeaderboardBetStatus(
      rankedImmunityWinners,
      myPropBets.propbet_immunities,
      _elims.some((x) => x.castaway_id === myPropBets.propbet_immunities),
      hasFinaleOccurred,
    ),
  );

  // --- propbet_idols ---
  const idols = _events.filter((x) => x.action === "find_idol");
  const allIdolFinders = idols.map((x) => x.castaway_id);
  const rankedIdolFinders = entries(countBy(allIdolFinders)).sort(
    (a, b) => b[1] - a[1],
  );
  setStatus(
    "propbet_idols",
    resolveLeaderboardBetStatus(
      rankedIdolFinders,
      myPropBets.propbet_idols,
      _elims.some((x) => x.castaway_id === myPropBets.propbet_idols),
      hasFinaleOccurred,
    ),
  );

  return scores;
};
