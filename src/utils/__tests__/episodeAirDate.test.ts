import { describe, expect, it } from "vitest";
import {
  CastawayId,
  Challenge,
  Elimination,
  Episode,
  GameEvent,
  Season,
} from "../../types";
import {
  getAwaitingDataEpisode,
  getCompetitionAwaitingDataEpisode,
  getLatestDataEpisode,
  getNextAiringEpisode,
} from "../episodeAirDate";

const ALICE = "US0001" as CastawayId;

const makeEpisode = (order: number, airDate?: string): Episode => ({
  id: `episode_${order}`,
  season_id: "season_50",
  season_num: 50,
  order,
  name: `Episode ${order}`,
  ...(airDate !== undefined ? { air_date: airDate } : {}),
  finale: false,
  post_merge: false,
  merge_occurs: false,
});

const makeSeason = (episodes: Episode[]): Season => ({
  id: "season_50",
  order: 50,
  name: "Survivor 50",
  img: "",
  players: [],
  episodes,
  castawayLookup: {},
});

const makeChallenge = (id: string, episodeNum: number): Challenge => ({
  id: `challenge_${id}`,
  season_id: "season_50",
  season_num: 50,
  episode_id: `episode_${episodeNum}`,
  episode_num: episodeNum,
  order: 1,
  variant: "immunity",
  winning_castaways: [ALICE],
});

const makeElimination = (id: string, episodeNum: number): Elimination => ({
  id: `elimination_${id}`,
  season_id: "season_50",
  season_num: 50,
  episode_id: `episode_${episodeNum}`,
  episode_num: episodeNum,
  castaway_id: ALICE,
  order: 1,
  variant: "tribal",
});

const makeEvent = (id: string, episodeNum: number): GameEvent => ({
  id: `event_${id}`,
  season_id: "season_50",
  season_num: 50,
  episode_id: `episode_${episodeNum}`,
  episode_num: episodeNum,
  action: "find_idol",
  multiplier: null,
  castaway_id: ALICE,
});

// Fixed instants so tests are deterministic in every local timezone.
const BEFORE_BROADCAST = new Date("2026-03-12T19:59:00-07:00");
const AFTER_BROADCAST = new Date("2026-03-12T20:00:00-07:00");

describe("getLatestDataEpisode", () => {
  it("returns 0 when there is no scoring data", () => {
    expect(getLatestDataEpisode({}, {}, {})).toBe(0);
  });

  it("returns the max episode_num across all record types", () => {
    const challenges = { challenge_1: makeChallenge("1", 3) };
    const eliminations = { elimination_1: makeElimination("1", 5) };
    const events = { event_1: makeEvent("1", 4) };
    expect(getLatestDataEpisode(challenges, eliminations, events)).toBe(5);
  });
});

describe("getAwaitingDataEpisode", () => {
  it("returns null when episodes have no air dates", () => {
    const season = makeSeason([makeEpisode(1), makeEpisode(2)]);
    expect(getAwaitingDataEpisode(season, 1, BEFORE_BROADCAST)).toBeNull();
  });

  it("returns the aired episode that has no data yet", () => {
    const season = makeSeason([
      makeEpisode(1, "2026-02-25"),
      makeEpisode(2, "2026-03-04"),
      makeEpisode(3, "2026-03-11"), // aired yesterday, no data
      makeEpisode(4, "2026-03-18"), // future
    ]);
    const latest = 2;
    const result = getAwaitingDataEpisode(season, latest, BEFORE_BROADCAST);
    expect(result?.order).toBe(3);
  });

  it("returns null when data is caught up with aired episodes", () => {
    const season = makeSeason([
      makeEpisode(1, "2026-02-25"),
      makeEpisode(2, "2026-03-04"),
      makeEpisode(3, "2026-03-18"), // future
    ]);
    expect(getAwaitingDataEpisode(season, 2, BEFORE_BROADCAST)).toBeNull();
  });

  it("does not treat an episode as aired before its 8 PM PT broadcast", () => {
    const season = makeSeason([
      makeEpisode(1, "2026-02-25"),
      makeEpisode(2, "2026-03-12"),
    ]);
    expect(getAwaitingDataEpisode(season, 1, BEFORE_BROADCAST)).toBeNull();
  });

  it("treats an episode as aired at its 8 PM PT broadcast", () => {
    const season = makeSeason([
      makeEpisode(1, "2026-02-25"),
      makeEpisode(2, "2026-03-12"),
    ]);
    expect(getAwaitingDataEpisode(season, 1, AFTER_BROADCAST)?.order).toBe(2);
  });

  it("returns the earliest awaiting episode when several are missing", () => {
    const season = makeSeason([
      makeEpisode(1, "2026-02-25"),
      makeEpisode(2, "2026-03-04"),
      makeEpisode(3, "2026-03-11"),
    ]);
    expect(getAwaitingDataEpisode(season, 1, BEFORE_BROADCAST)?.order).toBe(2);
  });

  it("returns null before the premiere when there is no data", () => {
    const season = makeSeason([makeEpisode(1, "2026-03-18")]);
    expect(getAwaitingDataEpisode(season, 0, BEFORE_BROADCAST)).toBeNull();
  });

  it("returns the premiere once it has aired but data is missing", () => {
    const season = makeSeason([makeEpisode(1, "2026-03-11")]);
    expect(getAwaitingDataEpisode(season, 0, BEFORE_BROADCAST)?.order).toBe(1);
  });
});

describe("getCompetitionAwaitingDataEpisode", () => {
  const season = makeSeason([
    makeEpisode(1, "2026-03-04"),
    makeEpisode(2, "2026-03-11"),
  ]);

  const getResult = (
    overrides: Partial<
      Parameters<typeof getCompetitionAwaitingDataEpisode>[0]
    > = {},
  ) =>
    getCompetitionAwaitingDataEpisode({
      season,
      latestDataEpisode: 1,
      isScoringDataReady: true,
      currentEpisode: null,
      finished: false,
      hasWinner: false,
      now: BEFORE_BROADCAST,
      ...overrides,
    });

  it("waits for every scoring document before showing the banner", () => {
    expect(getResult({ isScoringDataReady: false })).toBeNull();
  });

  it("shows the banner for live and legacy competitions", () => {
    expect(getResult({ currentEpisode: null })?.order).toBe(2);
    expect(getResult({ currentEpisode: undefined })?.order).toBe(2);
  });

  it("does not show the banner to a behind watch-along competition", () => {
    expect(getResult({ currentEpisode: 0 })).toBeNull();
  });

  it("does not show the banner after the competition or season ends", () => {
    expect(getResult({ finished: true })).toBeNull();
    expect(getResult({ hasWinner: true })).toBeNull();
  });
});

describe("getNextAiringEpisode", () => {
  it("returns the first future-dated episode", () => {
    const season = makeSeason([
      makeEpisode(1, "2026-02-25"),
      makeEpisode(2, "2026-03-18"),
      makeEpisode(3, "2026-03-25"),
    ]);
    expect(getNextAiringEpisode(season, BEFORE_BROADCAST)?.order).toBe(2);
  });

  it("returns null when no episodes are future-dated", () => {
    const season = makeSeason([
      makeEpisode(1, "2026-02-25"),
      makeEpisode(2, "2026-03-11"),
    ]);
    expect(getNextAiringEpisode(season, BEFORE_BROADCAST)).toBeNull();
  });

  it("returns null when episodes have no air dates", () => {
    const season = makeSeason([makeEpisode(1), makeEpisode(2)]);
    expect(getNextAiringEpisode(season, BEFORE_BROADCAST)).toBeNull();
  });
});
