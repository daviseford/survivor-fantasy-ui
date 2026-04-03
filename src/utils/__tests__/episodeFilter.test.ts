import { describe, expect, it } from "vitest";
import {
  CastawayId,
  Challenge,
  Elimination,
  Episode,
  GameEvent,
} from "../../types";
import { filterEpisodesByMax, filterRecordByEpisode } from "../episodeFilter";

const ALICE = "US0001" as CastawayId;
const BOB = "US0002" as CastawayId;

const makeEpisode = (order: number): Episode => ({
  id: `episode_${order}`,
  season_id: "season_46",
  season_num: 46,
  order,
  name: `Episode ${order}`,
  finale: false,
  post_merge: false,
  merge_occurs: false,
});

const makeChallenge = (id: string, episodeNum: number): Challenge => ({
  id: `challenge_${id}`,
  season_id: "season_46",
  season_num: 46,
  episode_id: `episode_${episodeNum}`,
  episode_num: episodeNum,
  order: 1,
  variant: "immunity",
  winning_castaways: [ALICE],
});

const makeElimination = (id: string, episodeNum: number): Elimination => ({
  id: `elimination_${id}`,
  season_id: "season_46",
  season_num: 46,
  episode_id: `episode_${episodeNum}`,
  episode_num: episodeNum,
  castaway_id: BOB,
  order: 1,
  variant: "tribal",
});

const makeEvent = (id: string, episodeNum: number): GameEvent => ({
  id: `event_${id}`,
  season_id: "season_46",
  season_num: 46,
  episode_id: `episode_${episodeNum}`,
  episode_num: episodeNum,
  action: "find_idol",
  multiplier: null,
  castaway_id: ALICE,
});

describe("filterEpisodesByMax", () => {
  const episodes = [makeEpisode(1), makeEpisode(2), makeEpisode(3)];

  it("returns all episodes when maxEpisode is null (live mode)", () => {
    expect(filterEpisodesByMax(episodes, null)).toEqual(episodes);
  });

  it("returns episodes up to maxEpisode", () => {
    const result = filterEpisodesByMax(episodes, 2);
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.order)).toEqual([1, 2]);
  });

  it("returns empty array when maxEpisode is 0", () => {
    expect(filterEpisodesByMax(episodes, 0)).toEqual([]);
  });

  it("returns all episodes when maxEpisode exceeds episode count", () => {
    expect(filterEpisodesByMax(episodes, 10)).toEqual(episodes);
  });

  it("returns empty array for empty input", () => {
    expect(filterEpisodesByMax([], 3)).toEqual([]);
  });

  it("handles non-sequential order values", () => {
    const gapped = [makeEpisode(1), makeEpisode(3), makeEpisode(5)];
    const result = filterEpisodesByMax(gapped, 3);
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.order)).toEqual([1, 3]);
  });
});

describe("filterRecordByEpisode", () => {
  const challenges: Record<string, Challenge> = {
    challenge_1: makeChallenge("1", 1),
    challenge_2: makeChallenge("2", 2),
    challenge_3: makeChallenge("3", 3),
    challenge_4: makeChallenge("4", 4),
  };

  it("returns all entries when maxEpisode is null (live mode)", () => {
    expect(filterRecordByEpisode(challenges, null)).toEqual(challenges);
  });

  it("returns only entries with episode_num <= maxEpisode", () => {
    const result = filterRecordByEpisode(challenges, 2);
    expect(Object.keys(result)).toEqual(["challenge_1", "challenge_2"]);
  });

  it("returns empty record when maxEpisode is 0", () => {
    expect(filterRecordByEpisode(challenges, 0)).toEqual({});
  });

  it("works with elimination records", () => {
    const elims: Record<string, Elimination> = {
      elimination_1: makeElimination("1", 3),
      elimination_2: makeElimination("2", 5),
    };
    const result = filterRecordByEpisode(elims, 3);
    expect(Object.keys(result)).toEqual(["elimination_1"]);
  });

  it("works with event records", () => {
    const events: Record<string, GameEvent> = {
      event_1: makeEvent("1", 1),
      event_2: makeEvent("2", 4),
    };
    const result = filterRecordByEpisode(events, 2);
    expect(Object.keys(result)).toEqual(["event_1"]);
  });

  it("returns empty record for empty input", () => {
    expect(filterRecordByEpisode({}, 3)).toEqual({});
  });
});

describe("mode toggle: rewatch scenario", () => {
  const episodes = [makeEpisode(1), makeEpisode(2), makeEpisode(3)];
  const events: Record<string, GameEvent> = {
    event_1: makeEvent("1", 1),
    event_2: makeEvent("2", 2),
    event_3: makeEvent("3", 3),
  };

  it("filters correctly when a finished competition switches to Watch-Along mid-season", () => {
    // Simulates a rewatch: finished competition toggled to Watch-Along at episode 2
    const filteredEpisodes = filterEpisodesByMax(episodes, 2);
    const filteredEvents = filterRecordByEpisode(events, 2);
    expect(filteredEpisodes).toHaveLength(2);
    expect(Object.keys(filteredEvents)).toEqual(["event_1", "event_2"]);
  });

  it("reveals all data when switched back to Live (null)", () => {
    // Simulates toggling from Watch-Along back to Live
    const filteredEpisodes = filterEpisodesByMax(episodes, null);
    const filteredEvents = filterRecordByEpisode(events, null);
    expect(filteredEpisodes).toEqual(episodes);
    expect(filteredEvents).toEqual(events);
  });
});
