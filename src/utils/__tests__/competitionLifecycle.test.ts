import { describe, expect, it } from "vitest";
import { shouldAutoFinish } from "../../hooks/useAutoFinishCompetition";
import { Competition, Episode, GameEvent, SlimUser } from "../../types";

const CREATOR_UID = "creator-123";
const ADMIN_UID = "admin-456";
const PARTICIPANT_UID = "participant-789";

const makeCompetition = (
  overrides: Partial<Competition> = {},
): Competition => ({
  id: "competition_test",
  competition_name: "Test",
  season_id: "season_46",
  season_num: 46,
  draft_id: "draft_test",
  creator_uid: CREATOR_UID,
  participant_uids: [CREATOR_UID, ADMIN_UID, PARTICIPANT_UID],
  participants: [],
  draft_picks: [],
  current_episode: null,
  finished: false,
  ...overrides,
});

const makeUser = (overrides: Partial<SlimUser> = {}): SlimUser => ({
  uid: CREATOR_UID,
  email: "test@test.com",
  displayName: "Test",
  isAdmin: false,
  ...overrides,
});

const finaleEpisode: Episode = {
  id: "episode_s46e13",
  season_id: "season_46",
  season_num: 46,
  order: 13,
  name: "Finale",
  finale: true,
  post_merge: true,
  merge_occurs: false,
};

const episodes: Episode[] = [
  {
    id: "episode_s46e1",
    season_id: "season_46",
    season_num: 46,
    order: 1,
    name: "Episode 1",
    finale: false,
    post_merge: false,
    merge_occurs: false,
  },
  finaleEpisode,
];

const winSurvivorEvent: GameEvent = {
  id: "event_win",
  season_id: "season_46",
  season_num: 46,
  episode_id: "episode_s46e13",
  episode_num: 13,
  action: "win_survivor",
  multiplier: null,
  castaway_id: "US0687",
};

const eventsWithWinner: Record<string, GameEvent> = {
  event_win: winSurvivorEvent,
};

const eventsWithoutWinner: Record<string, GameEvent> = {
  event_find: {
    id: "event_find",
    season_id: "season_46",
    season_num: 46,
    episode_id: "episode_s46e1",
    episode_num: 1,
    action: "find_idol",
    multiplier: null,
    castaway_id: "US0687",
  },
};

describe("shouldAutoFinish", () => {
  it("returns true when win_survivor exists, live mode, not finished, viewer is creator", () => {
    expect(
      shouldAutoFinish({
        events: eventsWithWinner,
        competition: makeCompetition(),
        episodes,
        slimUser: makeUser(),
      }),
    ).toBe(true);
  });

  it("returns true when win_survivor exists, watch-along at finale, viewer is admin", () => {
    expect(
      shouldAutoFinish({
        events: eventsWithWinner,
        competition: makeCompetition({ current_episode: 13 }),
        episodes,
        slimUser: makeUser({ uid: ADMIN_UID, isAdmin: true }),
      }),
    ).toBe(true);
  });

  it("returns false when finished is already true", () => {
    expect(
      shouldAutoFinish({
        events: eventsWithWinner,
        competition: makeCompetition({ finished: true }),
        episodes,
        slimUser: makeUser(),
      }),
    ).toBe(false);
  });

  it("returns false when current_episode < finale episode (spoiler protection)", () => {
    expect(
      shouldAutoFinish({
        events: eventsWithWinner,
        competition: makeCompetition({ current_episode: 3 }),
        episodes,
        slimUser: makeUser(),
      }),
    ).toBe(false);
  });

  it("returns false when no win_survivor event exists", () => {
    expect(
      shouldAutoFinish({
        events: eventsWithoutWinner,
        competition: makeCompetition(),
        episodes,
        slimUser: makeUser(),
      }),
    ).toBe(false);
  });

  it("returns false when viewer is neither creator nor admin", () => {
    expect(
      shouldAutoFinish({
        events: eventsWithWinner,
        competition: makeCompetition(),
        episodes,
        slimUser: makeUser({ uid: PARTICIPANT_UID, isAdmin: false }),
      }),
    ).toBe(false);
  });

  it("returns false when slimUser is null (auth not settled)", () => {
    expect(
      shouldAutoFinish({
        events: eventsWithWinner,
        competition: makeCompetition(),
        episodes,
        slimUser: null,
      }),
    ).toBe(false);
  });

  it("returns false when competition is undefined", () => {
    expect(
      shouldAutoFinish({
        events: eventsWithWinner,
        competition: undefined,
        episodes,
        slimUser: makeUser(),
      }),
    ).toBe(false);
  });

  it("returns false when current_episode is 0 (fresh watch-along, spoiler protection)", () => {
    expect(
      shouldAutoFinish({
        events: eventsWithWinner,
        competition: makeCompetition({ current_episode: 0 }),
        episodes,
        slimUser: makeUser(),
      }),
    ).toBe(false);
  });

  it("returns true when current_episode exceeds finale episode (past finale)", () => {
    expect(
      shouldAutoFinish({
        events: eventsWithWinner,
        competition: makeCompetition({ current_episode: 14 }),
        episodes,
        slimUser: makeUser(),
      }),
    ).toBe(true);
  });

  it("returns false when watch-along and no finale episode defined", () => {
    const episodesNoFinale = episodes.map((e) => ({ ...e, finale: false }));
    expect(
      shouldAutoFinish({
        events: eventsWithWinner,
        competition: makeCompetition({ current_episode: 13 }),
        episodes: episodesNoFinale,
        slimUser: makeUser(),
      }),
    ).toBe(false);
  });

  // --- Mode toggle: finished competition scenarios ---

  it("returns false for finished competition in Live mode (current_episode: null)", () => {
    expect(
      shouldAutoFinish({
        events: eventsWithWinner,
        competition: makeCompetition({ finished: true, current_episode: null }),
        episodes,
        slimUser: makeUser(),
      }),
    ).toBe(false);
  });

  it("returns false for finished competition in Watch-Along mode (current_episode: 5)", () => {
    expect(
      shouldAutoFinish({
        events: eventsWithWinner,
        competition: makeCompetition({ finished: true, current_episode: 5 }),
        episodes,
        slimUser: makeUser(),
      }),
    ).toBe(false);
  });

  it("returns false for finished competition in Watch-Along at episode 0", () => {
    expect(
      shouldAutoFinish({
        events: eventsWithWinner,
        competition: makeCompetition({ finished: true, current_episode: 0 }),
        episodes,
        slimUser: makeUser(),
      }),
    ).toBe(false);
  });

  it("returns false for finished competition in Watch-Along at finale", () => {
    expect(
      shouldAutoFinish({
        events: eventsWithWinner,
        competition: makeCompetition({ finished: true, current_episode: 13 }),
        episodes,
        slimUser: makeUser(),
      }),
    ).toBe(false);
  });

  it("returns true when events is empty record but later populated with winner", () => {
    // First call with no events
    expect(
      shouldAutoFinish({
        events: {},
        competition: makeCompetition(),
        episodes,
        slimUser: makeUser(),
      }),
    ).toBe(false);

    // Second call after events load
    expect(
      shouldAutoFinish({
        events: eventsWithWinner,
        competition: makeCompetition(),
        episodes,
        slimUser: makeUser(),
      }),
    ).toBe(true);
  });
});
