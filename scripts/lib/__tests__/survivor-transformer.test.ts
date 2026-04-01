import { describe, expect, it } from "vitest";
import { fetchSeasonData } from "../survivor-client";
import { transformPlayers, transformResults } from "../survivor-transformer";

// Integration tests using real survivoR data

describe("transformPlayers", { timeout: 60000 }, () => {
  it("transforms Season 46 castaways into Player array with castawayId", async () => {
    const data = await fetchSeasonData(46);
    const result = transformPlayers(data, 46);

    expect(result.seasonNum).toBe(46);
    expect(result.players.length).toBe(18);
    expect(result.unmatched.length).toBe(0);

    // Check first player has expected fields
    const player = result.players[0];
    expect(player.localName).toBeTruthy();
    expect(player.castawayId).toMatch(/^US\d+$/);
    expect(player.matchStatus).toBe("exact");
  });

  it("transforms Season 1 castaways (16 players)", async () => {
    const data = await fetchSeasonData(1);
    const result = transformPlayers(data, 1);

    expect(result.players.length).toBe(16);

    // Verify Sonja Christopher is in the list
    const sonja = result.players.find((p) => p.localName.includes("Sonja"));
    expect(sonja).toBeDefined();
    expect(sonja!.localName).toBe("Sonja Christopher");
    expect(sonja!.castawayId).toMatch(/^US\d+$/);
  });

  it("transforms Season 48 castaways into 18 players with castaway IDs", async () => {
    const data = await fetchSeasonData(48);
    const result = transformPlayers(data, 48);

    expect(result.seasonNum).toBe(48);
    expect(result.players.length).toBe(18);
    expect(result.unmatched.length).toBe(0);

    for (const player of result.players) {
      expect(player.localName).toBeTruthy();
      expect(player.castawayId).toMatch(/^US\d+$/);
      // Full names should have at least first + last
      expect(player.localName).toContain(" ");
    }
  });

  it("returning players with same name have distinct castaway_id values", async () => {
    // Season 50 has returning players
    const data = await fetchSeasonData(50);
    const result = transformPlayers(data, 50);

    const ids = result.players.map((p) => p.castawayId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe("transformResults", { timeout: 60000 }, () => {
  it("transforms Season 46 episodes", async () => {
    const data = await fetchSeasonData(46);
    const result = transformResults(data, 46);

    expect(result.episodes.length).toBe(13);
    expect(result.episodes[0].order).toBe(1);
    expect(result.episodes[0].title).toBeTruthy();

    // Should have a finale
    const finale = result.episodes.find((e) => e.isFinale);
    expect(finale).toBeDefined();

    // Should detect merge at episode 6 (Mergatory), not 7 (Merged)
    const mergeEp = result.episodes.find((e) => e.mergeOccurs);
    expect(mergeEp).toBeDefined();
    expect(mergeEp!.order).toBe(6);

    // Episodes 6-13 should be post-merge
    const postMerge = result.episodes.filter((e) => e.postMerge);
    expect(postMerge.length).toBe(8); // episodes 6-13
  });

  it("transforms Season 46 challenges with winning castaway IDs", async () => {
    const data = await fetchSeasonData(46);
    const result = transformResults(data, 46);

    expect(result.challenges.length).toBeGreaterThan(0);

    // Tribal challenges should have winning tribe set and reasonable winner counts
    const tribalChallenges = result.challenges.filter(
      (c) => c.winnerTribe !== null,
    );
    expect(tribalChallenges.length).toBeGreaterThan(0);
    for (const c of tribalChallenges) {
      expect(c.winnerCastawayIds.length).toBeLessThanOrEqual(8);
      expect(c.winnerCastawayIds.length).toBeGreaterThan(0);
    }

    // Combined challenges should be split — no "combined" variant in output
    const combined = result.challenges.filter((c) => c.variant === "combined");
    expect(combined.length).toBe(0);

    // Should have both immunity and reward challenges
    const immunities = result.challenges.filter(
      (c) => c.variant === "immunity",
    );
    expect(immunities.length).toBeGreaterThan(0);

    const rewards = result.challenges.filter((c) => c.variant === "reward");
    expect(rewards.length).toBeGreaterThan(0);
  });

  it("uses castaway IDs (not names) for challenge winners and events", async () => {
    const data = await fetchSeasonData(46);
    const playerResult = transformPlayers(data, 46);
    const result = transformResults(data, 46);

    const castawayIds = new Set(
      playerResult.players.map((p) => p.castawayId),
    );

    // Every challenge winner ID should be in the castaway IDs set
    for (const chal of result.challenges) {
      for (const id of chal.winnerCastawayIds) {
        expect(castawayIds.has(id)).toBe(true);
      }
    }

    // Every event castaway ID should be in the castaway IDs set
    for (const ev of result.events) {
      expect(castawayIds.has(ev.castawayId)).toBe(true);
    }
  });

  it("transforms Season 46 eliminations with correct variants", async () => {
    const data = await fetchSeasonData(46);
    const result = transformResults(data, 46);

    // Winner should NOT be in eliminations (17, not 18)
    expect(result.eliminations.length).toBe(17);

    // The winner (Kenzie Petty) should not appear — check by ID
    const playerResult = transformPlayers(data, 46);
    const kenzie = playerResult.players.find((p) =>
      p.localName.includes("Kenzie"),
    );
    const winnerElim = result.eliminations.find(
      (e) => e.castawayId === kenzie?.castawayId,
    );
    expect(winnerElim).toBeUndefined();

    // Should have tribal eliminations
    const tribals = result.eliminations.filter((e) => e.variant === "tribal");
    expect(tribals.length).toBeGreaterThan(0);

    // Should have FTC runner-ups as final_tribal_council
    const ftc = result.eliminations.filter(
      (e) => e.variant === "final_tribal_council",
    );
    expect(ftc.length).toBeGreaterThanOrEqual(2);

    // No eliminations should have variant "other" for fire-making
    const others = result.eliminations.filter((e) => e.variant === "other");
    expect(others.length).toBe(0);
  });

  it("transforms Season 46 events (advantages, journeys, merge, winner)", async () => {
    const data = await fetchSeasonData(46);
    const result = transformResults(data, 46);

    expect(result.events.length).toBeGreaterThan(0);

    // Should have journey events (S46 has 9 journey records)
    const journeyEvents = result.events.filter(
      (e) => e.action === "go_on_journey",
    );
    expect(journeyEvents.length).toBe(9);

    // Journey advantage winners should get specific win actions (e.g., win_extra_vote)
    const journeyWins = result.events.filter(
      (e) =>
        e.action.startsWith("win_") &&
        e.action !== "win_survivor" &&
        journeyEvents.some(
          (j) =>
            j.castawayId === e.castawayId && j.episodeNum === e.episodeNum,
        ),
    );
    expect(journeyWins.length).toBeGreaterThan(0);

    // Should have beware advantage lifecycle events (S46 has 4 beware idols)
    const findBeware = result.events.filter(
      (e) => e.action === "find_beware_advantage",
    );
    expect(findBeware.length).toBe(4);

    const acceptBeware = result.events.filter(
      (e) => e.action === "accept_beware_advantage",
    );
    expect(acceptBeware.length).toBe(4);

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
    expect(genericActions.length).toBe(0);

    // Moriah's Shot in the Dark (ep6, unsuccessful)
    const sitd = result.events.filter(
      (e) =>
        e.action === "use_shot_in_the_dark_successfully" ||
        e.action === "use_shot_in_the_dark_unsuccessfully",
    );
    expect(sitd.length).toBe(1);
    expect(sitd[0].action).toBe("use_shot_in_the_dark_unsuccessfully");
    expect(sitd[0].episodeNum).toBe(6);

    // Should detect merge event on episode 6 (not 7)
    const mergeEvents = result.events.filter((e) => e.action === "make_merge");
    expect(mergeEvents.length).toBeGreaterThan(0);
    for (const e of mergeEvents) {
      expect(e.episodeNum).toBe(6);
    }

    // Should detect winner
    const winEvents = result.events.filter((e) => e.action === "win_survivor");
    expect(winEvents.length).toBe(1);
  });

  it("handles Season 1 with no advantages (empty, not error)", async () => {
    const data = await fetchSeasonData(1);
    const result = transformResults(data, 1);

    // Season 1 has no advantage events
    const idolEvents = result.events.filter(
      (e) => e.action === "find_idol" || e.action === "use_idol",
    );
    expect(idolEvents.length).toBe(0);

    // But should still have merge and winner events
    const mergeEvents = result.events.filter((e) => e.action === "make_merge");
    expect(mergeEvents.length).toBeGreaterThan(0);
  });

  it("transforms Season 48 episodes", async () => {
    const data = await fetchSeasonData(48);
    const result = transformResults(data, 48);

    expect(result.episodes.length).toBeGreaterThanOrEqual(13);
    expect(result.episodes[0].order).toBe(1);
    expect(result.episodes[0].title).toBeTruthy();
  });

  it("transforms Season 48 challenges with winning castaway IDs", async () => {
    const data = await fetchSeasonData(48);
    const result = transformResults(data, 48);

    expect(result.challenges.length).toBeGreaterThan(0);

    const withWinners = result.challenges.filter(
      (c) => c.winnerCastawayIds.length > 0,
    );
    expect(withWinners.length).toBeGreaterThan(0);
  });

  it("all S48 challenge winner IDs and event castaway IDs exist in the player list", async () => {
    const data = await fetchSeasonData(48);
    const playerResult = transformPlayers(data, 48);
    const result = transformResults(data, 48);

    const castawayIds = new Set(
      playerResult.players.map((p) => p.castawayId),
    );

    for (const chal of result.challenges) {
      for (const id of chal.winnerCastawayIds) {
        expect(castawayIds.has(id)).toBe(true);
      }
    }

    for (const ev of result.events) {
      expect(castawayIds.has(ev.castawayId)).toBe(true);
    }
  });
});
