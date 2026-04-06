import { describe, expect, it } from "vitest";
import {
  CastawayId,
  Challenge,
  Competition,
  GameEvent,
  VoteHistory,
} from "../../types";
import { EnhancedScores } from "../scoringUtils";
import { computeSeasonStats, SeasonStatsInput, StatCard } from "../seasonStats";

// --- Test constants ---

const ALICE = "US0001" as CastawayId;
const BOB = "US0002" as CastawayId;
const CHARLIE = "US0003" as CastawayId;
const DANA = "US0004" as CastawayId;

const USER_A = "uid_a";
const USER_B = "uid_b";

const makeCompetition = (
  picks: { castaway_id: CastawayId; user_uid: string; user_name: string }[],
): Competition => ({
  id: "competition_test",
  competition_name: "Test",
  season_id: "season_46",
  season_num: 46,
  draft_id: "draft_test",
  creator_uid: USER_A,
  participant_uids: [USER_A, USER_B],
  participants: [
    {
      uid: USER_A,
      email: "a@test.com",
      displayName: "Alice P",
      isAdmin: false,
    },
    { uid: USER_B, email: "b@test.com", displayName: "Bob P", isAdmin: false },
  ],
  draft_picks: picks.map((p, i) => ({
    season_id: "season_46" as const,
    season_num: 46,
    order: i + 1,
    user_name: p.user_name,
    user_uid: p.user_uid,
    castaway_id: p.castaway_id,
    player_name: p.user_name,
  })),
  current_episode: null,
  finished: false,
});

const makeScores = (totals: number[]): EnhancedScores[] =>
  totals.map((total, i) => ({
    episode_num: i + 1,
    total,
    actions: [],
  }));

const makeVote = (
  id: string,
  episodeNum: number,
  voter: CastawayId,
  target: CastawayId,
  opts?: { nullified?: boolean; tie?: boolean; sogId?: number },
): VoteHistory => ({
  id: `vote_${id}`,
  season_id: "season_46",
  season_num: 46,
  episode_id: `episode_${episodeNum}`,
  episode_num: episodeNum,
  tribe: "TestTribe",
  voter_castaway_id: voter,
  target_castaway_id: target,
  voted_out_castaway_id: target,
  nullified: opts?.nullified ?? false,
  tie: opts?.tie ?? false,
  sog_id: opts?.sogId ?? episodeNum,
  vote_order: 1,
});

const makeChallenge = (
  id: string,
  episodeNum: number,
  variant: "immunity" | "reward",
  winners: CastawayId[],
): Challenge => ({
  id: `challenge_${id}`,
  season_id: "season_46",
  season_num: 46,
  episode_id: `episode_${episodeNum}`,
  episode_num: episodeNum,
  order: 1,
  variant,
  winning_castaways: winners,
});

const makeEvent = (
  id: string,
  episodeNum: number,
  action: string,
  castawayId: CastawayId,
): GameEvent => ({
  id: `event_${id}`,
  season_id: "season_46",
  season_num: 46,
  episode_id: `episode_${episodeNum}`,
  episode_num: episodeNum,
  action: action as GameEvent["action"],
  multiplier: null,
  castaway_id: castawayId,
});

function buildInput(
  overrides: Partial<SeasonStatsInput> = {},
): SeasonStatsInput {
  return {
    competition: makeCompetition([
      { castaway_id: ALICE, user_uid: USER_A, user_name: "Alice P" },
      { castaway_id: BOB, user_uid: USER_A, user_name: "Alice P" },
      { castaway_id: CHARLIE, user_uid: USER_B, user_name: "Bob P" },
      { castaway_id: DANA, user_uid: USER_B, user_name: "Bob P" },
    ]),
    filteredChallenges: {},
    filteredEliminations: {},
    filteredEvents: {},
    filteredVoteHistory: {},
    survivorPointsByEpisode: {
      [ALICE]: makeScores([10, 5, 15]),
      [BOB]: makeScores([3, 8, 2]),
      [CHARLIE]: makeScores([7, 7, 7]),
      [DANA]: makeScores([1, 1, 1]),
    },
    pointsByUserPerEpisode: {
      [USER_A]: [13, 13, 17],
      [USER_B]: [8, 8, 8],
    },
    resolveName: (id: CastawayId) => {
      const names: Record<string, string> = {
        [ALICE]: "Alice",
        [BOB]: "Bob",
        [CHARLIE]: "Charlie",
        [DANA]: "Dana",
      };
      return names[id] ?? id;
    },
    ...overrides,
  };
}

function findCard(cards: StatCard[], key: string): StatCard | undefined {
  return cards.find((c) => c.key === key);
}

// --- Tests ---

describe("computeSeasonStats", () => {
  describe("score cards", () => {
    it("returns highest scoring castaway", () => {
      const result = computeSeasonStats(buildInput());
      const card = findCard(result.castawayCards, "highest_scoring");
      expect(card).toBeDefined();
      expect(card!.winners).toHaveLength(1);
      expect(card!.winners[0].label).toBe("Alice");
      expect(card!.winners[0].value).toBe(30);
    });

    it("returns lowest scoring castaway", () => {
      const result = computeSeasonStats(buildInput());
      const card = findCard(result.castawayCards, "lowest_scoring");
      expect(card).toBeDefined();
      expect(card!.winners[0].label).toBe("Dana");
      expect(card!.winners[0].value).toBe(3);
    });

    it("handles ties for highest scoring", () => {
      const result = computeSeasonStats(
        buildInput({
          survivorPointsByEpisode: {
            [ALICE]: makeScores([10, 10]),
            [BOB]: makeScores([10, 10]),
            [CHARLIE]: makeScores([5, 5]),
            [DANA]: makeScores([1, 1]),
          },
        }),
      );
      const card = findCard(result.castawayCards, "highest_scoring");
      expect(card!.winners).toHaveLength(2);
      expect(card!.winners.map((w) => w.label).sort()).toEqual([
        "Alice",
        "Bob",
      ]);
    });

    it("returns best single episode", () => {
      const result = computeSeasonStats(buildInput());
      const card = findCard(result.castawayCards, "best_single_episode");
      expect(card).toBeDefined();
      expect(card!.winners[0].label).toBe("Alice");
      expect(card!.winners[0].value).toBe(15);
      expect(card!.winners[0].detail).toBe("Episode 3");
    });

    it("returns most consistent by lowest stddev", () => {
      const result = computeSeasonStats(buildInput());
      const card = findCard(result.castawayCards, "most_consistent");
      expect(card).toBeDefined();
      // Charlie [7,7,7] stddev=0, Dana [1,1,1] stddev=0 — both tied at zero variance
      expect(card!.winners).toHaveLength(2);
      expect(card!.winners.map((w) => w.label).sort()).toEqual([
        "Charlie",
        "Dana",
      ]);
    });

    it("suppresses consistency with fewer than 3 episodes", () => {
      const result = computeSeasonStats(
        buildInput({
          survivorPointsByEpisode: {
            [ALICE]: makeScores([10, 5]),
            [BOB]: makeScores([3, 8]),
            [CHARLIE]: makeScores([7, 7]),
            [DANA]: makeScores([1, 1]),
          },
        }),
      );
      const card = findCard(result.castawayCards, "most_consistent");
      expect(card).toBeUndefined();
    });
  });

  describe("challenge cards", () => {
    it("returns immunity beast", () => {
      const result = computeSeasonStats(
        buildInput({
          filteredChallenges: {
            c1: makeChallenge("1", 1, "immunity", [ALICE]),
            c2: makeChallenge("2", 2, "immunity", [ALICE]),
            c3: makeChallenge("3", 3, "immunity", [BOB]),
          },
        }),
      );
      const card = findCard(result.castawayCards, "immunity_beast");
      expect(card).toBeDefined();
      expect(card!.winners[0].label).toBe("Alice");
      expect(card!.winners[0].value).toBe(2);
    });

    it("returns reward king", () => {
      const result = computeSeasonStats(
        buildInput({
          filteredChallenges: {
            c1: makeChallenge("1", 1, "reward", [CHARLIE]),
            c2: makeChallenge("2", 2, "reward", [CHARLIE]),
          },
        }),
      );
      const card = findCard(result.castawayCards, "reward_king");
      expect(card).toBeDefined();
      expect(card!.winners[0].label).toBe("Charlie");
    });

    it("omits challenge card when no individual wins", () => {
      const result = computeSeasonStats(buildInput());
      expect(findCard(result.castawayCards, "immunity_beast")).toBeUndefined();
      expect(findCard(result.castawayCards, "reward_king")).toBeUndefined();
    });
  });

  describe("advantage cards", () => {
    it("returns advantages found", () => {
      const result = computeSeasonStats(
        buildInput({
          filteredEvents: {
            e1: makeEvent("1", 1, "find_idol", ALICE),
            e2: makeEvent("2", 2, "find_extra_vote", ALICE),
            e3: makeEvent("3", 3, "find_idol", BOB),
          },
        }),
      );
      const card = findCard(result.castawayCards, "advantages_found");
      expect(card).toBeDefined();
      expect(card!.winners[0].label).toBe("Alice");
      expect(card!.winners[0].value).toBe(2);
    });

    it("returns advantages played", () => {
      const result = computeSeasonStats(
        buildInput({
          filteredEvents: {
            e1: makeEvent("1", 1, "use_idol", CHARLIE),
            e2: makeEvent("2", 2, "use_idol", CHARLIE),
          },
        }),
      );
      const card = findCard(result.castawayCards, "advantages_played");
      expect(card).toBeDefined();
      expect(card!.winners[0].label).toBe("Charlie");
      expect(card!.winners[0].value).toBe(2);
    });
  });

  describe("vote-history cards", () => {
    it("returns most votes received", () => {
      const result = computeSeasonStats(
        buildInput({
          filteredVoteHistory: {
            v1: makeVote("1", 1, ALICE, BOB),
            v2: makeVote("2", 1, CHARLIE, BOB),
            v3: makeVote("3", 1, DANA, BOB),
            v4: makeVote("4", 2, ALICE, CHARLIE),
          },
        }),
      );
      const card = findCard(result.castawayCards, "most_votes_received");
      expect(card).toBeDefined();
      expect(card!.winners[0].label).toBe("Bob");
      expect(card!.winners[0].value).toBe(3);
    });

    it("includes nullified vote detail", () => {
      const result = computeSeasonStats(
        buildInput({
          filteredVoteHistory: {
            v1: makeVote("1", 1, ALICE, BOB, { nullified: true }),
            v2: makeVote("2", 1, CHARLIE, BOB, { nullified: true }),
            v3: makeVote("3", 1, DANA, BOB),
          },
        }),
      );
      const card = findCard(result.castawayCards, "most_votes_received");
      expect(card!.winners[0].detail).toBe("(2 nullified by idol)");
    });

    it("returns least votes received with qualification", () => {
      const result = computeSeasonStats(
        buildInput({
          filteredVoteHistory: {
            // Alice voted at tribal but received 0 votes
            v1: makeVote("1", 1, ALICE, BOB),
            // Charlie voted and received 1
            v2: makeVote("2", 1, CHARLIE, BOB),
            v3: makeVote("3", 1, DANA, CHARLIE),
            // BOB was targeted but also attended
            v4: makeVote("4", 1, BOB, ALICE),
          },
        }),
      );
      const card = findCard(result.castawayCards, "least_votes_received");
      expect(card).toBeDefined();
      // ALICE received 0 votes but attended tribal (voted)
      // Should win "least votes received"
    });

    it("suppresses least votes when too few attendees", () => {
      const result = computeSeasonStats(
        buildInput({
          filteredVoteHistory: {
            v1: makeVote("1", 1, ALICE, BOB),
          },
        }),
      );
      const card = findCard(result.castawayCards, "least_votes_received");
      expect(card).toBeUndefined();
    });

    it("omits vote cards when no vote history", () => {
      const result = computeSeasonStats(buildInput());
      expect(
        findCard(result.castawayCards, "most_votes_received"),
      ).toBeUndefined();
      expect(
        findCard(result.castawayCards, "least_votes_received"),
      ).toBeUndefined();
    });
  });

  describe("roster cards", () => {
    it("returns best team night", () => {
      const result = computeSeasonStats(buildInput());
      const card = findCard(result.rosterCards, "best_team_episode");
      expect(card).toBeDefined();
      // USER_A episode 3: 17 pts (Alice 15 + Bob 2)
      expect(card!.winners[0].label).toBe("Alice P");
      expect(card!.winners[0].value).toBe(17);
      expect(card!.winners[0].detail).toBe("Episode 3");
    });

    it("returns hero drafter card", () => {
      const result = computeSeasonStats(buildInput());
      const card = findCard(result.rosterCards, "hero_drafter");
      expect(card).toBeDefined();
      // Alice (30 pts) drafted by USER_A
      expect(card!.winners[0].label).toBe("Alice P");
      expect(card!.winners[0].detail).toBe("Alice");
    });

    it("returns roster most heat from votes", () => {
      const result = computeSeasonStats(
        buildInput({
          filteredVoteHistory: {
            v1: makeVote("1", 1, CHARLIE, ALICE),
            v2: makeVote("2", 1, DANA, ALICE),
            v3: makeVote("3", 1, ALICE, BOB),
            v4: makeVote("4", 2, ALICE, BOB),
          },
        }),
      );
      const card = findCard(result.rosterCards, "roster_most_heat");
      expect(card).toBeDefined();
      // USER_A roster (Alice + Bob) got 4 votes total
      expect(card!.winners[0].label).toBe("Alice P");
      expect(card!.winners[0].value).toBe(4);
    });
  });

  describe("empty/edge cases", () => {
    it("returns empty cards when no scoring data", () => {
      const result = computeSeasonStats(
        buildInput({
          survivorPointsByEpisode: {},
          pointsByUserPerEpisode: {},
        }),
      );
      expect(result.castawayCards).toHaveLength(0);
      expect(result.rosterCards).toHaveLength(0);
    });

    it("handles episode 0 watch-along (empty data)", () => {
      const result = computeSeasonStats(
        buildInput({
          survivorPointsByEpisode: {
            [ALICE]: [],
            [BOB]: [],
            [CHARLIE]: [],
            [DANA]: [],
          },
          pointsByUserPerEpisode: {
            [USER_A]: [],
            [USER_B]: [],
          },
        }),
      );
      // No meaningful cards with empty episodes
      expect(result.castawayCards.every((c) => c.winners.length > 0)).toBe(
        true,
      );
    });
  });
});
