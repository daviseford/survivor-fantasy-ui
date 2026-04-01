import { describe, expect, it } from "vitest";
import { fetchSeasonData } from "../survivor-client";
import { transformPlayers, transformResults } from "../survivor-transformer";

// Integration tests using real survivoR data

describe("transformPlayers", { timeout: 60000 }, () => {
  it("transforms Season 46 castaways into Player array", async () => {
    const data = await fetchSeasonData(46);
    const result = transformPlayers(data, 46);

    expect(result.seasonNum).toBe(46);
    expect(result.players.length).toBe(18);
    expect(result.unmatched.length).toBe(0);

    // Check first player has expected fields
    const player = result.players[0];
    expect(player.localName).toBeTruthy();
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
  });

  it("transforms Season 48 castaways into 18 players with full names", async () => {
    const data = await fetchSeasonData(48);
    const result = transformPlayers(data, 48);

    expect(result.seasonNum).toBe(48);
    expect(result.players.length).toBe(18);
    expect(result.unmatched.length).toBe(0);

    for (const player of result.players) {
      expect(player.localName).toBeTruthy();
      // Full names should have at least first + last
      expect(player.localName).toContain(" ");
    }
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

    // Should detect merge
    const mergeEp = result.episodes.find((e) => e.mergeOccurs);
    expect(mergeEp).toBeDefined();
  });

  it("transforms Season 46 challenges with winning players", async () => {
    const data = await fetchSeasonData(46);
    const result = transformResults(data, 46);

    expect(result.challenges.length).toBeGreaterThan(0);

    // Challenges should have winning players (not empty arrays)
    const withWinners = result.challenges.filter(
      (c) => c.winnerNames.length > 0,
    );
    expect(withWinners.length).toBeGreaterThan(0);

    // Should have immunity challenges
    const immunities = result.challenges.filter(
      (c) => c.variant === "immunity" || c.variant === "combined",
    );
    expect(immunities.length).toBeGreaterThan(0);
  });

  it("uses full names (not short names) for challenge winners and events", async () => {
    const data = await fetchSeasonData(46);
    const playerResult = transformPlayers(data, 46);
    const result = transformResults(data, 46);

    const playerNames = new Set(playerResult.players.map((p) => p.localName));

    // Every challenge winner name should be in the player names set
    for (const chal of result.challenges) {
      for (const name of chal.winnerNames) {
        expect(playerNames.has(name)).toBe(true);
      }
    }

    // Every event player name should be in the player names set
    for (const ev of result.events) {
      expect(playerNames.has(ev.playerName)).toBe(true);
    }
  });

  it("transforms Season 46 eliminations with correct variants", async () => {
    const data = await fetchSeasonData(46);
    const result = transformResults(data, 46);

    expect(result.eliminations.length).toBeGreaterThan(0);

    // Should have tribal eliminations
    const tribals = result.eliminations.filter((e) => e.variant === "tribal");
    expect(tribals.length).toBeGreaterThan(0);

    // Should have FTC participants
    const ftc = result.eliminations.filter(
      (e) => e.variant === "final_tribal_council",
    );
    expect(ftc.length).toBeGreaterThanOrEqual(2); // at least winner + runner-up
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

    // Journey advantage winners should also get win_advantage
    // S46: Maria and Tevin got Extra vote on Ep1
    const journeyAdvantages = result.events.filter(
      (e) =>
        e.action === "win_advantage" &&
        journeyEvents.some(
          (j) => j.playerName === e.playerName && j.episodeNum === e.episodeNum,
        ),
    );
    expect(journeyAdvantages.length).toBeGreaterThan(0);

    // Should detect merge event
    const mergeEvents = result.events.filter((e) => e.action === "make_merge");
    expect(mergeEvents.length).toBeGreaterThan(0);

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

  it("transforms Season 48 challenges with winning players", async () => {
    const data = await fetchSeasonData(48);
    const result = transformResults(data, 48);

    expect(result.challenges.length).toBeGreaterThan(0);

    const withWinners = result.challenges.filter(
      (c) => c.winnerNames.length > 0,
    );
    expect(withWinners.length).toBeGreaterThan(0);
  });

  it("all S48 challenge winner names and event player names exist in the player list", async () => {
    const data = await fetchSeasonData(48);
    const playerResult = transformPlayers(data, 48);
    const result = transformResults(data, 48);

    const playerNames = new Set(playerResult.players.map((p) => p.localName));

    for (const chal of result.challenges) {
      for (const name of chal.winnerNames) {
        expect(playerNames.has(name)).toBe(true);
      }
    }

    for (const ev of result.events) {
      expect(playerNames.has(ev.playerName)).toBe(true);
    }
  });
});
