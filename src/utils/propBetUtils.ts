import { countBy, entries } from "lodash-es";
import {
  getActivePropBetKeys,
  PropBetQuestionKey,
  PropBetQuestionKeys,
  PropBetsQuestions,
} from "../data/propbets";
import {
  CastawayId,
  Challenge,
  Competition,
  Elimination,
  Episode,
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

export type PropBetScores = Record<PropBetQuestionKey, PropBetAnswer> & {
  total: number;
};

export type PropBetScoresByUser = Record<SlimUser["uid"], PropBetScores>;

const makeEmptyAnswer = (
  uid: SlimUser["uid"],
  userName: string,
  answer = "",
): PropBetAnswer => ({
  user_uid: uid,
  user_name: userName,
  status: "pending",
  points_awarded: 0,
  answer,
});

const buildEmptyScores = (
  uid: SlimUser["uid"],
  userName: string,
  answers?: Partial<Record<PropBetQuestionKey, string>>,
): PropBetScores => {
  const propBetScores = PropBetQuestionKeys.reduce<
    Record<PropBetQuestionKey, PropBetAnswer>
  >(
    (accum, key) => {
      accum[key] = makeEmptyAnswer(uid, userName, answers?.[key] || "");
      return accum;
    },
    {} as Record<PropBetQuestionKey, PropBetAnswer>,
  );

  return {
    ...propBetScores,
    total: 0,
  };
};

export const getPropBetScoresByUser = (
  events: Record<GameEvent["id"], GameEvent>,
  eliminations: Record<Elimination["id"], Elimination>,
  challenges: Record<Challenge["id"], Challenge>,
  postMergeEpisodeNumbers: Set<Episode["order"]>,
  hasFinaleOccurred: boolean,
  competition?: Competition,
): PropBetScoresByUser => {
  if (!competition?.participant_uids || !competition.prop_bets) return {};

  const activeKeys = getActivePropBetKeys(competition.prop_bets);

  return competition.participant_uids.reduce<PropBetScoresByUser>((a, b) => {
    const scores = getPropBetScoresForUser(
      b,
      events,
      eliminations,
      challenges,
      postMergeEpisodeNumbers,
      hasFinaleOccurred,
      activeKeys,
      competition,
    );
    if (scores) {
      a[b] = scores;
    }
    return a;
  }, {});
};

/**
 * Determines if a player is currently out of the game.
 * A player who was eliminated but later appears in events or challenge wins
 * (e.g., returned from Edge of Extinction) is NOT currently eliminated.
 */
const isCurrentlyEliminated = (
  castawayId: string,
  elims: Elimination[],
  events: GameEvent[],
  challenges: Record<Challenge["id"], Challenge>,
): boolean => {
  const playerElims = elims.filter((x) => x.castaway_id === castawayId);
  if (playerElims.length === 0) return false;

  const lastElimEpisode = Math.max(...playerElims.map((x) => x.episode_num));

  const hasLaterEvent = events.some(
    (x) => x.castaway_id === castawayId && x.episode_num > lastElimEpisode,
  );
  if (hasLaterEvent) return false;

  const hasLaterChallengeWin = Object.values(challenges).some(
    (x) =>
      x.episode_num > lastElimEpisode &&
      x.winning_castaways?.includes(castawayId as CastawayId),
  );
  if (hasLaterChallengeWin) return false;

  return true;
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

const resolveBinarySeasonBetStatus = (
  answer: string | undefined,
  conditionMet: boolean,
  hasFinaleOccurred: boolean,
): PropBetStatus => {
  if (answer === "Yes") {
    if (conditionMet) return "definitive_correct";
    if (hasFinaleOccurred) return "definitive_incorrect";
    return "pending";
  }

  if (answer === "No") {
    if (conditionMet) return "definitive_incorrect";
    if (hasFinaleOccurred) return "definitive_correct";
  }

  return "pending";
};

export const getPropBetScoresForUser = (
  uid: SlimUser["uid"],
  events: Record<GameEvent["id"], GameEvent>,
  eliminations: Record<Elimination["id"], Elimination>,
  challenges: Record<Challenge["id"], Challenge>,
  postMergeEpisodeNumbers: Set<Episode["order"]>,
  hasFinaleOccurred: boolean,
  activeKeys: PropBetQuestionKey[],
  competition: Competition,
): PropBetScores => {
  const myPropBets = (competition?.prop_bets || []).find(
    (x) => x.user_uid === uid,
  )?.values;

  const _user = competition.participants.find((x) => x.uid === uid);

  const userName = _user?.displayName || _user?.email || uid;
  const scores = buildEmptyScores(uid, userName, myPropBets);

  // bail if no data
  if (!myPropBets) return scores;

  const setStatus = (key: PropBetQuestionKey, status: PropBetStatus) => {
    scores[key].status = status;
    if (activeKeys.includes(key) && status === "definitive_correct") {
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
  if (winSurvivorEvent) {
    if (winSurvivorEvent.castaway_id === myPropBets.propbet_winner) {
      setStatus("propbet_winner", "definitive_correct");
    } else {
      setStatus("propbet_winner", "definitive_incorrect");
    }
  }
  // else: pending (player still alive, no finale yet)

  // --- propbet_ftc ---
  const ftcEvent = _events.find(
    (x) =>
      x.action === "make_final_tribal_council" &&
      x.castaway_id === myPropBets.propbet_ftc,
  );
  if (ftcEvent) {
    setStatus("propbet_ftc", "definitive_correct");
  } else if (hasFinaleOccurred) {
    setStatus("propbet_ftc", "definitive_incorrect");
  }
  // else: pending (player still alive, no finale yet)

  // --- propbet_medical_evac ---
  const hasEvac = _elims.some((x) => x.variant === "medical");
  setStatus(
    "propbet_medical_evac",
    resolveBinarySeasonBetStatus(
      myPropBets.propbet_medical_evac,
      hasEvac,
      hasFinaleOccurred,
    ),
  );

  // --- propbet_first_idol_found ---
  const firstIdolEvent = _events
    .filter((x) => x.action === "find_idol")
    .sort((a, b) => a.episode_num - b.episode_num)[0];
  if (firstIdolEvent) {
    setStatus(
      "propbet_first_idol_found",
      firstIdolEvent.castaway_id === myPropBets.propbet_first_idol_found
        ? "definitive_correct"
        : "definitive_incorrect",
    );
  }

  // --- propbet_first_successful_idol_play ---
  const firstSuccessfulIdolPlay = _events
    .filter((x) => x.action === "use_idol")
    .sort((a, b) => a.episode_num - b.episode_num)[0];
  if (firstSuccessfulIdolPlay) {
    setStatus(
      "propbet_first_successful_idol_play",
      firstSuccessfulIdolPlay.castaway_id ===
        myPropBets.propbet_first_successful_idol_play
        ? "definitive_correct"
        : "definitive_incorrect",
    );
  }

  // --- propbet_successful_shot_in_the_dark ---
  const successfulShotInTheDark = _events.some(
    (x) => x.action === "use_shot_in_the_dark_successfully",
  );
  setStatus(
    "propbet_successful_shot_in_the_dark",
    resolveBinarySeasonBetStatus(
      myPropBets.propbet_successful_shot_in_the_dark,
      successfulShotInTheDark,
      hasFinaleOccurred,
    ),
  );

  // --- propbet_immunities ---
  const immunities = Object.values(challenges).filter(
    (x) =>
      x.variant === "immunity" && postMergeEpisodeNumbers.has(x.episode_num),
  );
  const allImmunityWinners = immunities.flatMap((x) => x.winning_castaways);
  const rankedImmunityWinners = entries(countBy(allImmunityWinners)).sort(
    (a, b) => b[1] - a[1],
  );
  setStatus(
    "propbet_immunities",
    resolveLeaderboardBetStatus(
      rankedImmunityWinners,
      myPropBets.propbet_immunities || "",
      isCurrentlyEliminated(
        myPropBets.propbet_immunities || "",
        _elims,
        _events,
        challenges,
      ),
      hasFinaleOccurred,
    ),
  );

  // --- propbet_rewards ---
  const rewards = Object.values(challenges).filter(
    (x) => x.variant === "reward" && postMergeEpisodeNumbers.has(x.episode_num),
  );
  const allRewardWinners = rewards.flatMap((x) => x.winning_castaways);
  const rankedRewardWinners = entries(countBy(allRewardWinners)).sort(
    (a, b) => b[1] - a[1],
  );
  setStatus(
    "propbet_rewards",
    resolveLeaderboardBetStatus(
      rankedRewardWinners,
      myPropBets.propbet_rewards || "",
      isCurrentlyEliminated(
        myPropBets.propbet_rewards || "",
        _elims,
        _events,
        challenges,
      ),
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
      myPropBets.propbet_idols || "",
      isCurrentlyEliminated(
        myPropBets.propbet_idols || "",
        _elims,
        _events,
        challenges,
      ),
      hasFinaleOccurred,
    ),
  );

  // --- propbet_quit ---
  const hasQuit = _elims.some((x) => x.variant === "quitter");
  setStatus(
    "propbet_quit",
    resolveBinarySeasonBetStatus(
      myPropBets.propbet_quit,
      hasQuit,
      hasFinaleOccurred,
    ),
  );

  return scores;
};
