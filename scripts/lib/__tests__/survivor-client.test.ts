import { describe, expect, it } from "vitest";
import { fetchSeasonData } from "../survivor-client";

const CASTAWAY_ID_FORMAT = /^US\d{4}$/;

function expectValidCastawayIds(
  castaways: { castaway_id: string }[],
): void {
  for (const c of castaways) {
    expect(c.castaway_id).toMatch(CASTAWAY_ID_FORMAT);
  }
}

// Integration tests — hit the real survivoR GitHub CDN
// These are slow but verify the actual data source works

describe("fetchSeasonData", { timeout: 60000 }, () => {
  it("fetches Season 48 castaways with expected fields", async () => {
    const data = await fetchSeasonData(48);

    expect(data.castaways).toHaveLength(18);
    expect(data.episodes.length).toBeGreaterThanOrEqual(13);
    expectValidCastawayIds(data.castaways);
  });

  it("fetches Season 46 castaways with expected fields", async () => {
    const data = await fetchSeasonData(46);

    expect(data.castaways).toHaveLength(18);
    expect(data.castaways[0]).toEqual(
      expect.objectContaining({
        castaway_id: expect.stringMatching(CASTAWAY_ID_FORMAT),
        full_name: expect.any(String),
        age: expect.any(Number),
        original_tribe: expect.any(String),
      }),
    );
    expectValidCastawayIds(data.castaways);
  });

  it("fetches Season 46 episodes with expected fields", async () => {
    const data = await fetchSeasonData(46);

    expect(data.episodes).toHaveLength(13);
    expect(data.episodes[0]).toEqual(
      expect.objectContaining({
        episode: expect.any(Number),
        episode_title: expect.any(String),
        episode_date: expect.any(String),
      }),
    );
  });

  it("fetches Season 1 with sparse advantage data (empty, not error)", async () => {
    const data = await fetchSeasonData(1);

    expect(data.castaways).toHaveLength(16);
    expect(data.advantageMovement).toHaveLength(0);
  });

  it("fetches Season 50 (most recent)", async () => {
    const data = await fetchSeasonData(50);

    expect(data.castaways.length).toBeGreaterThan(0);
    expectValidCastawayIds(data.castaways);
  });

  it("returns empty arrays for non-existent season", async () => {
    const data = await fetchSeasonData(999);
    expect(data.castaways).toHaveLength(0);
  });
});
