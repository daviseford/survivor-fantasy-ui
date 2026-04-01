import { describe, expect, it } from "vitest";
import { PropBetsQuestions } from "../../data/propbets";
import {
  Challenge,
  Competition,
  Elimination,
  GameEvent,
  Season,
} from "../../types";
import { getPropBetScoresForUser, PropBetStatus } from "../propBetUtils";

// --- Factories ---

const makeElimination = (
  id: string,
  episodeNum: number,
  playerName: string,
  order: number,
  variant: Elimination["variant"] = "tribal",
): Elimination<string, number> => ({
  id: `elimination_${id}`,
  season_id: "season_46",
  season_num: 46,
  episode_id: `episode_${episodeNum}`,
  episode_num: episodeNum,
  player_name: playerName,
  order,
  variant,
});

const makeEvent = (
  id: string,
  episodeNum: number,
  playerName: string,
  action: GameEvent["action"],
): GameEvent<string, number> => ({
  id: `event_${id}`,
  season_id: "season_46",
  season_num: 46,
  episode_id: `episode_${episodeNum}`,
  episode_num: episodeNum,
  action,
  multiplier: null,
  player_name: playerName,
});

const makeChallenge = (
  id: string,
  episodeNum: number,
  winningPlayers: string[],
  variant: Challenge["variant"] = "immunity",
): Challenge<string, number> => ({
  id: `challenge_${id}`,
  season_id: "season_46",
  season_num: 46,
  episode_id: `episode_${episodeNum}`,
  episode_num: episodeNum,
  order: 1,
  variant,
  winning_players: winningPlayers,
});

const baseSeason: Season = {
  id: "season_46",
  season_num: 46,
  name: "Survivor 46",
  players: [
    { name: "Alice", nickname: null },
    { name: "Bob", nickname: null },
    { name: "Charlie", nickname: null },
  ],
  episodes: [
    {
      id: "episode_1",
      season_id: "season_46",
      season_num: 46,
      order: 1,
      name: "Ep 1",
      finale: false,
      post_merge: false,
      merge_occurs: false,
    },
    {
      id: "episode_2",
      season_id: "season_46",
      season_num: 46,
      order: 2,
      name: "Ep 2",
      finale: false,
      post_merge: false,
      merge_occurs: false,
    },
    {
      id: "episode_13",
      season_id: "season_46",
      season_num: 46,
      order: 13,
      name: "Finale",
      finale: true,
      post_merge: true,
      merge_occurs: false,
    },
  ],
};

const baseCompetition: Competition = {
  id: "competition_test",
  competition_name: "Test",
  season_id: "season_46",
  season_num: 46,
  draft_id: "draft_test",
  creator_uid: "user1",
  participant_uids: ["user1"],
  participants: [{ uid: "user1", displayName: "Player One", email: null }],
  draft_picks: [],
  prop_bets: [
    {
      id: "propbet_user1",
      user_name: "Player One",
      user_uid: "user1",
      values: {
        propbet_first_vote: "Bob",
        propbet_winner: "Alice",
        propbet_ftc: "Alice",
        propbet_idols: "Alice",
        propbet_immunities: "Alice",
        propbet_medical_evac: "No",
      },
    },
  ],
  started: true,
  current_episode: null,
  finished: false,
};

const noEvents: Record<string, GameEvent> = {};
const noElims: Record<string, Elimination> = {};
const noChallenges: Record<string, Challenge> = {};

const getStatus = (
  key: keyof typeof PropBetsQuestions,
  overrides?: {
    events?: Record<string, GameEvent>;
    eliminations?: Record<string, Elimination>;
    challenges?: Record<string, Challenge>;
    hasFinaleOccurred?: boolean;
    competition?: Competition;
    season?: Season;
  },
) => {
  const result = getPropBetScoresForUser(
    "user1",
    overrides?.events ?? noEvents,
    overrides?.eliminations ?? noElims,
    overrides?.challenges ?? noChallenges,
    overrides?.hasFinaleOccurred ?? false,
    overrides?.competition ?? baseCompetition,
    overrides?.season ?? baseSeason,
  );
  return result[key];
};

// --- Tests ---

describe("getPropBetScoresForUser", () => {
  describe("propbet_first_vote", () => {
    it("returns pending when no eliminations exist", () => {
      const answer = getStatus("propbet_first_vote");
      expect(answer.status).toBe("pending");
      expect(answer.points_awarded).toBe(0);
    });

    it("returns definitive_correct when pick matches first elimination", () => {
      const elims = {
        e1: makeElimination("1", 1, "Bob", 1),
      };
      const answer = getStatus("propbet_first_vote", { eliminations: elims });
      expect(answer.status).toBe("definitive_correct");
      expect(answer.correct).toBe(true);
      expect(answer.points_awarded).toBe(
        PropBetsQuestions.propbet_first_vote.point_value,
      );
    });

    it("returns definitive_incorrect when pick does not match first elimination", () => {
      const elims = {
        e1: makeElimination("1", 1, "Charlie", 1),
      };
      const answer = getStatus("propbet_first_vote", { eliminations: elims });
      expect(answer.status).toBe("definitive_incorrect");
      expect(answer.correct).toBe(false);
      expect(answer.points_awarded).toBe(0);
    });
  });

  describe("propbet_winner", () => {
    it("returns pending when player is alive and no finale", () => {
      const answer = getStatus("propbet_winner");
      expect(answer.status).toBe("pending");
    });

    it("returns definitive_incorrect when picked player is eliminated", () => {
      const elims = {
        e1: makeElimination("1", 5, "Alice", 3),
      };
      const answer = getStatus("propbet_winner", { eliminations: elims });
      expect(answer.status).toBe("definitive_incorrect");
    });

    it("returns definitive_correct when win_survivor event matches pick", () => {
      const events = {
        ev1: makeEvent("1", 13, "Alice", "win_survivor"),
      };
      const answer = getStatus("propbet_winner", {
        events,
        hasFinaleOccurred: true,
      });
      expect(answer.status).toBe("definitive_correct");
      expect(answer.points_awarded).toBe(
        PropBetsQuestions.propbet_winner.point_value,
      );
    });

    it("returns definitive_incorrect when someone else wins", () => {
      const events = {
        ev1: makeEvent("1", 13, "Charlie", "win_survivor"),
      };
      const answer = getStatus("propbet_winner", {
        events,
        hasFinaleOccurred: true,
      });
      expect(answer.status).toBe("definitive_incorrect");
    });
  });

  describe("propbet_ftc", () => {
    it("returns pending when player is alive and no finale", () => {
      const answer = getStatus("propbet_ftc");
      expect(answer.status).toBe("pending");
    });

    it("returns definitive_incorrect when picked player eliminated (non-FTC)", () => {
      const elims = {
        e1: makeElimination("1", 5, "Alice", 3, "tribal"),
      };
      const answer = getStatus("propbet_ftc", { eliminations: elims });
      expect(answer.status).toBe("definitive_incorrect");
    });

    it("does not mark as incorrect when elimination variant is final_tribal_council", () => {
      const elims = {
        e1: makeElimination("1", 13, "Alice", 10, "final_tribal_council"),
      };
      const answer = getStatus("propbet_ftc", { eliminations: elims });
      // Not incorrectly eliminated — FTC elimination means they made FTC
      expect(answer.status).not.toBe("definitive_incorrect");
    });

    it("returns definitive_correct when make_final_tribal_council event matches", () => {
      const events = {
        ev1: makeEvent("1", 13, "Alice", "make_final_tribal_council"),
      };
      const answer = getStatus("propbet_ftc", {
        events,
        hasFinaleOccurred: true,
      });
      expect(answer.status).toBe("definitive_correct");
      expect(answer.points_awarded).toBe(
        PropBetsQuestions.propbet_ftc.point_value,
      );
    });

    it("returns definitive_incorrect when finale occurred but no FTC event for pick", () => {
      const answer = getStatus("propbet_ftc", { hasFinaleOccurred: true });
      expect(answer.status).toBe("definitive_incorrect");
    });
  });

  describe("propbet_medical_evac", () => {
    it("returns definitive_correct for Yes when evac occurred", () => {
      const comp = {
        ...baseCompetition,
        prop_bets: [
          {
            ...baseCompetition.prop_bets![0],
            values: {
              ...baseCompetition.prop_bets![0].values,
              propbet_medical_evac: "Yes",
            },
          },
        ],
      };
      const elims = {
        e1: makeElimination("1", 3, "Charlie", 2, "medical"),
      };
      const answer = getStatus("propbet_medical_evac", {
        competition: comp,
        eliminations: elims,
      });
      expect(answer.status).toBe("definitive_correct");
    });

    it("returns definitive_incorrect for No when evac occurred", () => {
      const elims = {
        e1: makeElimination("1", 3, "Charlie", 2, "medical"),
      };
      const answer = getStatus("propbet_medical_evac", { eliminations: elims });
      expect(answer.status).toBe("definitive_incorrect");
    });

    it("returns pending for Yes when no evac and no finale", () => {
      const comp = {
        ...baseCompetition,
        prop_bets: [
          {
            ...baseCompetition.prop_bets![0],
            values: {
              ...baseCompetition.prop_bets![0].values,
              propbet_medical_evac: "Yes",
            },
          },
        ],
      };
      const answer = getStatus("propbet_medical_evac", { competition: comp });
      expect(answer.status).toBe("pending");
    });

    it("returns definitive_correct for No when no evac and finale reached", () => {
      const answer = getStatus("propbet_medical_evac", {
        hasFinaleOccurred: true,
      });
      expect(answer.status).toBe("definitive_correct");
    });

    it("returns definitive_incorrect for Yes when no evac and finale reached", () => {
      const comp = {
        ...baseCompetition,
        prop_bets: [
          {
            ...baseCompetition.prop_bets![0],
            values: {
              ...baseCompetition.prop_bets![0].values,
              propbet_medical_evac: "Yes",
            },
          },
        ],
      };
      const answer = getStatus("propbet_medical_evac", {
        competition: comp,
        hasFinaleOccurred: true,
      });
      expect(answer.status).toBe("definitive_incorrect");
    });
  });

  describe("propbet_idols", () => {
    it("returns pending when no idol events exist", () => {
      const answer = getStatus("propbet_idols");
      expect(answer.status).toBe("pending");
    });

    it("returns leading when picked player leads mid-season", () => {
      const events = {
        ev1: makeEvent("1", 2, "Alice", "find_idol"),
      };
      const answer = getStatus("propbet_idols", { events });
      expect(answer.status).toBe("leading");
      expect(answer.points_awarded).toBe(0);
    });

    it("returns leading when picked player tied for lead mid-season", () => {
      const events = {
        ev1: makeEvent("1", 2, "Alice", "find_idol"),
        ev2: makeEvent("2", 3, "Bob", "find_idol"),
      };
      const answer = getStatus("propbet_idols", { events });
      expect(answer.status).toBe("leading");
    });

    it("returns leading when picked player eliminated but was leading", () => {
      const events = {
        ev1: makeEvent("1", 2, "Alice", "find_idol"),
      };
      const elims = {
        e1: makeElimination("1", 5, "Alice", 3),
      };
      const answer = getStatus("propbet_idols", {
        events,
        eliminations: elims,
      });
      // Alice is still the leader even though eliminated — no one has surpassed her
      expect(answer.status).toBe("leading");
    });

    it("returns definitive_incorrect when picked player eliminated with 0 finds and others have finds", () => {
      const events = {
        ev1: makeEvent("1", 2, "Bob", "find_idol"),
      };
      const elims = {
        e1: makeElimination("1", 5, "Alice", 3),
      };
      const answer = getStatus("propbet_idols", {
        events,
        eliminations: elims,
      });
      expect(answer.status).toBe("definitive_incorrect");
    });

    it("returns definitive_correct at finale when picked player leads", () => {
      const events = {
        ev1: makeEvent("1", 2, "Alice", "find_idol"),
        ev2: makeEvent("2", 5, "Alice", "find_idol"),
        ev3: makeEvent("3", 7, "Bob", "find_idol"),
      };
      const answer = getStatus("propbet_idols", {
        events,
        hasFinaleOccurred: true,
      });
      expect(answer.status).toBe("definitive_correct");
      expect(answer.points_awarded).toBe(
        PropBetsQuestions.propbet_idols.point_value,
      );
    });

    it("returns definitive_incorrect at finale when picked player does not lead", () => {
      const events = {
        ev1: makeEvent("1", 2, "Bob", "find_idol"),
        ev2: makeEvent("2", 5, "Bob", "find_idol"),
        ev3: makeEvent("3", 7, "Alice", "find_idol"),
      };
      const answer = getStatus("propbet_idols", {
        events,
        hasFinaleOccurred: true,
      });
      expect(answer.status).toBe("definitive_incorrect");
    });
  });

  describe("propbet_immunities", () => {
    it("returns pending when no immunity challenges exist", () => {
      const answer = getStatus("propbet_immunities");
      expect(answer.status).toBe("pending");
    });

    it("returns leading when picked player leads mid-season", () => {
      const challenges = {
        c1: makeChallenge("1", 2, ["Alice"], "immunity"),
      };
      const answer = getStatus("propbet_immunities", { challenges });
      expect(answer.status).toBe("leading");
      expect(answer.points_awarded).toBe(0);
    });

    it("returns definitive_correct at finale when picked player leads", () => {
      const challenges = {
        c1: makeChallenge("1", 2, ["Alice"], "immunity"),
        c2: makeChallenge("2", 5, ["Alice"], "immunity"),
        c3: makeChallenge("3", 7, ["Bob"], "immunity"),
      };
      const answer = getStatus("propbet_immunities", {
        challenges,
        hasFinaleOccurred: true,
      });
      expect(answer.status).toBe("definitive_correct");
      expect(answer.points_awarded).toBe(
        PropBetsQuestions.propbet_immunities.point_value,
      );
    });

    it("returns definitive_incorrect when eliminated and behind leader", () => {
      const challenges = {
        c1: makeChallenge("1", 2, ["Bob"], "immunity"),
        c2: makeChallenge("2", 3, ["Bob"], "immunity"),
      };
      const elims = {
        e1: makeElimination("1", 4, "Alice", 2),
      };
      const answer = getStatus("propbet_immunities", {
        challenges,
        eliminations: elims,
      });
      expect(answer.status).toBe("definitive_incorrect");
    });

    it("handles combined challenge variant", () => {
      const challenges = {
        c1: makeChallenge("1", 2, ["Alice"], "combined"),
      };
      const answer = getStatus("propbet_immunities", { challenges });
      expect(answer.status).toBe("leading");
    });
  });

  describe("points_awarded", () => {
    it("only awards points for definitive_correct status", () => {
      // Set up a scenario where first_vote is correct but everything else is pending
      const elims = {
        e1: makeElimination("1", 1, "Bob", 1),
      };
      const result = getPropBetScoresForUser(
        "user1",
        noEvents,
        elims,
        noChallenges,
        false,
        baseCompetition,
        baseSeason,
      );

      expect(result.propbet_first_vote.status).toBe("definitive_correct");
      expect(result.propbet_first_vote.points_awarded).toBeGreaterThan(0);

      // All others should be pending with 0 points
      expect(result.propbet_winner.points_awarded).toBe(0);
      expect(result.propbet_ftc.points_awarded).toBe(0);
      expect(result.propbet_idols.points_awarded).toBe(0);
      expect(result.propbet_immunities.points_awarded).toBe(0);
      expect(result.propbet_medical_evac.points_awarded).toBe(0);

      expect(result.total).toBe(
        PropBetsQuestions.propbet_first_vote.point_value,
      );
    });
  });

  describe("no prop bets submitted", () => {
    it("returns all pending with empty answers when user has no prop bets", () => {
      const comp = {
        ...baseCompetition,
        prop_bets: [],
      };
      const result = getPropBetScoresForUser(
        "user1",
        noEvents,
        noElims,
        noChallenges,
        false,
        comp,
        baseSeason,
      );
      expect(result.propbet_first_vote.status).toBe("pending");
      expect(result.propbet_first_vote.answer).toBe("");
      expect(result.total).toBe(0);
    });
  });
});
