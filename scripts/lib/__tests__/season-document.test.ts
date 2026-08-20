import { describe, expect, it } from "vitest";
import { buildSeasonDocument } from "../season-document";

describe("buildSeasonDocument", () => {
  it("adds one ISO sync timestamp to every season payload", () => {
    const syncedAt = new Date("2026-03-12T14:00:00.000Z");

    expect(
      buildSeasonDocument({
        seasonNum: 50,
        seasonImg: "/season-50.webp",
        players: [],
        episodes: [],
        castawayLookup: {},
        syncedAt,
      }),
    ).toMatchObject({
      id: "season_50",
      order: 50,
      name: "Survivor 50",
      img: "/season-50.webp",
      last_synced_at: "2026-03-12T14:00:00.000Z",
    });
  });
});
