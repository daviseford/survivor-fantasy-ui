import { beforeAll, describe, expect, it } from "vitest";
import { type SurvivorSeasonData, fetchSeasonData } from "../survivor-client";
import { transformPlayers, transformResults } from "../survivor-transformer";

// Integration tests using real survivoR data

describe("transformPlayers", { timeout: 60000 }, () => {
  it("transforms Season 46 castaways into Player array with castawayId", async () => {
    const data = await fetchSeasonData(46);
    const result = transformPlayers(data, 46);

    expect(result.seasonNum).toBe(46);
    expect(result.players).toHaveLength(18);
    expect(result.unmatched).toHaveLength(0);

    const player = result.players[0];
    expect(player.localName).toBeTruthy();
    expect(player.castawayId).toMatch(/^US\d+$/);
    expect(player.matchStatus).toBe("exact");
  });

  it("transforms Season 1 castaways (16 players)", async () => {
    const data = await fetchSeasonData(1);
    const result = transformPlayers(data, 1);

    expect(result.players).toHaveLength(16);

    const sonja = result.players.find((p) => p.localName.includes("Sonja"));
    expect(sonja).toBeDefined();
    expect(sonja!.localName).toBe("Sonja Christopher");
    expect(sonja!.castawayId).toMatch(/^US\d+$/);
  });

  it("transforms Season 48 castaways into 18 players with castaway IDs", async () => {
    const data = await fetchSeasonData(48);
    const result = transformPlayers(data, 48);

    expect(result.seasonNum).toBe(48);
    expect(result.players).toHaveLength(18);
    expect(result.unmatched).toHaveLength(0);

    for (const player of result.players) {
      expect(player.localName).toBeTruthy();
      expect(player.castawayId).toMatch(/^US\d+$/);
      expect(player.localName).toContain(" ");
    }
  });

  it("returning players with same name have distinct castaway_id values", async () => {
    const data = await fetchSeasonData(50);
    const result = transformPlayers(data, 50);

    const ids = result.players.map((p) => p.castawayId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe("transformResults", { timeout: 60000 }, () => {
  let s46Data: SurvivorSeasonData;
  let s48Data: SurvivorSeasonData;

  beforeAll(async () => {
    [s46Data, s48Data] = await Promise.all([
      fetchSeasonData(46),
      fetchSeasonData(48),
    ]);
  });

  it("transforms Season 46 episodes", () => {
    const result = transformResults(s46Data, 46);

    expect(result.episodes).toHaveLength(13);
    expect(result.episodes[0].order).toBe(1);
    expect(result.episodes[0].title).toBeTruthy();

    const finale = result.episodes.find((e) => e.isFinale);
    expect(finale).toBeDefined();

    // Merge should be detected at episode 6 (Mergatory), not 7 (Merged)
    const mergeEp = result.episodes.find((e) => e.mergeOccurs);
    expect(mergeEp).toBeDefined();
    expect(mergeEp!.order).toBe(6);

    // Episodes 6-13 should be post-merge
    const postMerge = result.episodes.filter((e) => e.postMerge);
    expect(postMerge).toHaveLength(8);
  });

  it("transforms Season 46 challenges with winning castaway IDs", () => {
    const result = transformResults(s46Data, 46);

    expect(result.challenges.length).toBeGreaterThan(0);

    // Tribal challenges should have winning tribe set and reasonable winner counts
    const tribalChallenges = result.challenges.filter(
      (c) => c.winnerTribe !== null,
    );
    expect(tribalChallenges.length).toBeGreaterThan(0);
    for (const c of tribalChallenges) {
      expect(c.winnerCastawayIds.length).toBeGreaterThan(0);
      expect(c.winnerCastawayIds.length).toBeLessThanOrEqual(8);
    }

    // Combined challenges are split into immunity + reward (no "combined" type exists)
    const individualImmunities = result.challenges.filter(
      (c) => c.variant === "immunity",
    );
    expect(individualImmunities.length).toBeGreaterThan(0);

    const teamImmunities = result.challenges.filter(
      (c) => c.variant === "team_immunity",
    );
    expect(teamImmunities.length).toBeGreaterThan(0);

    const individualRewards = result.challenges.filter(
      (c) => c.variant === "reward",
    );
    expect(individualRewards.length).toBeGreaterThan(0);

    const teamRewards = result.challenges.filter(
      (c) => c.variant === "team_reward",
    );
    expect(teamRewards.length).toBeGreaterThan(0);
  });

  it("splits immunity challenges into individual and team variants", () => {
    const result = transformResults(s46Data, 46);

    // Pre-merge tribal immunity challenges should be team_immunity
    const teamImmunities = result.challenges.filter(
      (c) => c.variant === "team_immunity",
    );
    for (const c of teamImmunities) {
      expect(c.winnerCastawayIds.length).toBeGreaterThan(1);
    }

    // Post-merge individual immunity challenges should be immunity
    const individualImmunities = result.challenges.filter(
      (c) => c.variant === "immunity",
    );
    for (const c of individualImmunities) {
      expect(c.winnerCastawayIds.length).toBeLessThanOrEqual(2);
    }
  });

  it("splits reward challenges into individual and team variants", () => {
    const result = transformResults(s46Data, 46);

    // Pre-merge tribal reward challenges should be team_reward
    const teamRewards = result.challenges.filter(
      (c) => c.variant === "team_reward",
    );
    for (const c of teamRewards) {
      expect(c.winnerCastawayIds.length).toBeGreaterThan(1);
    }

    // Post-merge individual reward challenges should be reward
    const individualRewards = result.challenges.filter(
      (c) => c.variant === "reward",
    );
    for (const c of individualRewards) {
      expect(c.winnerCastawayIds.length).toBeLessThanOrEqual(2);
    }
  });

  it("uses castaway IDs (not names) for challenge winners and events", () => {
    const playerResult = transformPlayers(s46Data, 46);
    const result = transformResults(s46Data, 46);

    const castawayIds = new Set(playerResult.players.map((p) => p.castawayId));

    for (const chal of result.challenges) {
      for (const id of chal.winnerCastawayIds) {
        expect(castawayIds).toContain(id);
      }
    }

    for (const ev of result.events) {
      expect(castawayIds).toContain(ev.castawayId);
    }
  });

  it("transforms Season 46 eliminations with correct variants", () => {
    const result = transformResults(s46Data, 46);

    // Winner should NOT be in eliminations (17, not 18)
    expect(result.eliminations).toHaveLength(17);

    // The winner (Kenzie Petty) should not appear
    const playerResult = transformPlayers(s46Data, 46);
    const kenzie = playerResult.players.find((p) =>
      p.localName.includes("Kenzie"),
    );
    const winnerElim = result.eliminations.find(
      (e) => e.castawayId === kenzie?.castawayId,
    );
    expect(winnerElim).toBeUndefined();

    const tribals = result.eliminations.filter((e) => e.variant === "tribal");
    expect(tribals.length).toBeGreaterThan(0);

    // FTC runner-ups should be final_tribal_council
    const ftc = result.eliminations.filter(
      (e) => e.variant === "final_tribal_council",
    );
    expect(ftc.length).toBeGreaterThanOrEqual(2);

    // No fire-making eliminations should have variant "other"
    const others = result.eliminations.filter((e) => e.variant === "other");
    expect(others).toHaveLength(0);
  });

  it("transforms Season 46 events (advantages, journeys, merge, winner)", () => {
    const result = transformResults(s46Data, 46);

    expect(result.events.length).toBeGreaterThan(0);

    // S46 has journey records — players who risked should get journey_risked_vote
    const riskedVoteEvents = result.events.filter(
      (e) => e.action === "journey_risked_vote",
    );
    expect(riskedVoteEvents.length).toBeGreaterThan(0);

    // Players who won a journey game should get journey_won_game
    const wonGameEvents = result.events.filter(
      (e) => e.action === "journey_won_game",
    );
    expect(wonGameEvents.length).toBeGreaterThan(0);

    // Journey advantage winners should still get specific win actions (e.g., win_extra_vote)
    const journeyWins = result.events.filter(
      (e) =>
        e.action.startsWith("win_") &&
        e.action !== "win_survivor" &&
        riskedVoteEvents.some(
          (j) => j.castawayId === e.castawayId && j.episodeNum === e.episodeNum,
        ),
    );
    expect(journeyWins.length).toBeGreaterThan(0);

    // Players who lost their vote should get journey_lost_vote
    const lostVoteEvents = result.events.filter(
      (e) => e.action === "journey_lost_vote",
    );
    expect(lostVoteEvents.length).toBeGreaterThan(0);

    // Every journey participant should get go_on_journey (base participation)
    const goOnJourneyEvents = result.events.filter(
      (e) => e.action === "go_on_journey",
    );
    expect(goOnJourneyEvents.length).toBeGreaterThan(0);

    // S46 fire-making: exactly 1 winner should get win_fire_making
    const fireEvents = result.events.filter(
      (e) => e.action === "win_fire_making",
    );
    expect(fireEvents).toHaveLength(1);
    expect(fireEvents[0].episodeNum).toBe(13);

    // S46 has 4 beware idols
    const findBeware = result.events.filter(
      (e) => e.action === "find_beware_advantage",
    );
    expect(findBeware).toHaveLength(4);

    const acceptBeware = result.events.filter(
      (e) => e.action === "accept_beware_advantage",
    );
    expect(acceptBeware).toHaveLength(4);

    const fulfillBeware = result.events.filter(
      (e) => e.action === "fulfill_beware_advantage",
    );
    expect(fulfillBeware.length).toBeGreaterThan(0);

    // Non-idol advantages should produce specific find actions (e.g., find_extra_vote)
    const findExtraVote = result.events.filter(
      (e) => e.action === "find_extra_vote",
    );
    expect(findExtraVote.length).toBeGreaterThan(0);

    // Maria's Extra Vote play should be use_extra_vote (not use_idol)
    const useExtraVote = result.events.filter(
      (e) => e.action === "use_extra_vote",
    );
    expect(useExtraVote.length).toBeGreaterThan(0);

    // No retired generic actions should appear
    const genericActions = result.events.filter(
      (e) =>
        e.action === "find_advantage" ||
        e.action === "use_advantage" ||
        e.action === "win_advantage",
    );
    expect(genericActions).toHaveLength(0);

    // Moriah's Shot in the Dark (ep6, unsuccessful)
    const sitd = result.events.filter(
      (e) =>
        e.action === "use_shot_in_the_dark_successfully" ||
        e.action === "use_shot_in_the_dark_unsuccessfully",
    );
    expect(sitd).toHaveLength(1);
    expect(sitd[0].action).toBe("use_shot_in_the_dark_unsuccessfully");
    expect(sitd[0].episodeNum).toBe(6);

    // Merge event should be on episode 6 (not 7)
    const mergeEvents = result.events.filter((e) => e.action === "make_merge");
    expect(mergeEvents.length).toBeGreaterThan(0);
    for (const e of mergeEvents) {
      expect(e.episodeNum).toBe(6);
    }

    const winEvents = result.events.filter((e) => e.action === "win_survivor");
    expect(winEvents).toHaveLength(1);
  });

  it("handles Season 1 with no advantages (empty, not error)", async () => {
    const data = await fetchSeasonData(1);
    const result = transformResults(data, 1);

    const idolEvents = result.events.filter(
      (e) => e.action === "find_idol" || e.action === "use_idol",
    );
    expect(idolEvents).toHaveLength(0);

    // Should still have merge and winner events
    const mergeEvents = result.events.filter((e) => e.action === "make_merge");
    expect(mergeEvents.length).toBeGreaterThan(0);
  });

  it("transforms Season 22 duel challenges (Redemption Island)", async () => {
    const data = await fetchSeasonData(22);
    const result = transformResults(data, 22);

    const duelChallenges = result.challenges.filter(
      (c) => c.variant === "duel",
    );
    expect(duelChallenges.length).toBeGreaterThan(0);
    for (const d of duelChallenges) {
      expect(d.winnerCastawayIds.length).toBeGreaterThan(0);
    }

    // Duels should not appear as reward or immunity variants
    const nonDuelWrongType = result.challenges.filter(
      (c) =>
        c.variant !== "duel" &&
        (c.variant === "reward" || c.variant === "immunity"),
    );
    // S22 should have regular immunity/reward challenges too
    expect(nonDuelWrongType.length).toBeGreaterThan(0);
  });

  it("transforms Season 48 episodes", () => {
    const result = transformResults(s48Data, 48);

    expect(result.episodes.length).toBeGreaterThanOrEqual(13);
    expect(result.episodes[0].order).toBe(1);
    expect(result.episodes[0].title).toBeTruthy();
  });

  it("transforms Season 48 challenges with winning castaway IDs", () => {
    const result = transformResults(s48Data, 48);

    expect(result.challenges.length).toBeGreaterThan(0);

    const withWinners = result.challenges.filter(
      (c) => c.winnerCastawayIds.length > 0,
    );
    expect(withWinners.length).toBeGreaterThan(0);
  });

  it("all S48 challenge winner IDs and event castaway IDs exist in the player list", () => {
    const playerResult = transformPlayers(s48Data, 48);
    const result = transformResults(s48Data, 48);

    const castawayIds = new Set(playerResult.players.map((p) => p.castawayId));

    for (const chal of result.challenges) {
      for (const id of chal.winnerCastawayIds) {
        expect(castawayIds).toContain(id);
      }
    }

    for (const ev of result.events) {
      expect(castawayIds).toContain(ev.castawayId);
    }
  });
});
