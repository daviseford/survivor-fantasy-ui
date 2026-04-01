import { describe, expect, it } from "vitest";
import { fetchSeasonData } from "../survivoR2py-client";
import { transformPlayers, transformResults } from "../survivoR2py-transformer";

// Integration tests using real survivoR2py data

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

  it("transforms Season 46 events (advantages, merge, winner)", async () => {
    const data = await fetchSeasonData(46);
    const result = transformResults(data, 46);

    expect(result.events.length).toBeGreaterThan(0);

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
});
