import { describe, expect, it } from "vitest";
import { fetchSeasonData } from "../survivor-client";

// Integration tests — hit the real survivoR GitHub CDN
// These are slow but verify the actual data source works

describe("fetchSeasonData", { timeout: 60000 }, () => {
  it("fetches Season 48 castaways with expected fields", async () => {
    const data = await fetchSeasonData(48);

    expect(data.castaways.length).toBe(18);
    expect(data.episodes.length).toBeGreaterThanOrEqual(13);

    // Validate castaway_id format
    for (const c of data.castaways) {
      expect(c.castaway_id).toMatch(/^US\d{4}$/);
    }
  });

  it("fetches Season 46 castaways with expected fields", async () => {
    const data = await fetchSeasonData(46);

    expect(data.castaways.length).toBe(18);
    expect(data.castaways[0]).toHaveProperty("castaway_id");
    expect(data.castaways[0]).toHaveProperty("full_name");
    expect(data.castaways[0]).toHaveProperty("age");
    expect(data.castaways[0]).toHaveProperty("original_tribe");

    for (const c of data.castaways) {
      expect(c.castaway_id).toMatch(/^US\d{4}$/);
    }
  });

  it("fetches Season 46 episodes with expected fields", async () => {
    const data = await fetchSeasonData(46);

    expect(data.episodes.length).toBe(13);
    expect(data.episodes[0]).toHaveProperty("episode");
    expect(data.episodes[0]).toHaveProperty("episode_title");
    expect(data.episodes[0]).toHaveProperty("episode_date");
  });

  it("fetches Season 1 with sparse advantage data (empty, not error)", async () => {
    const data = await fetchSeasonData(1);

    expect(data.castaways.length).toBe(16);
    expect(data.advantageMovement.length).toBe(0);
  });

  it("fetches Season 50 (most recent)", async () => {
    const data = await fetchSeasonData(50);

    expect(data.castaways.length).toBeGreaterThan(0);
    for (const c of data.castaways) {
      expect(c.castaway_id).toMatch(/^US\d{4}$/);
    }
  });

  it("returns empty arrays for non-existent season", async () => {
    const data = await fetchSeasonData(999);
    expect(data.castaways.length).toBe(0);
  });
});
