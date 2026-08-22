import { describe, expect, it } from "vitest";
import {
  claimStaleChunkReload,
  STALE_CHUNK_RELOAD_KEY,
  STALE_CHUNK_RELOAD_WINDOW_MS,
} from "../staleChunkReload";

const makeStorage = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    data,
  };
};

describe("claimStaleChunkReload", () => {
  it("allows the first reload and records when it happened", () => {
    const storage = makeStorage();

    expect(claimStaleChunkReload(storage, 1_000)).toBe(true);
    expect(storage.data.get(STALE_CHUNK_RELOAD_KEY)).toBe("1000");
  });

  it("refuses a second reload inside the cooldown window", () => {
    const storage = makeStorage({ [STALE_CHUNK_RELOAD_KEY]: "1000" });

    expect(
      claimStaleChunkReload(storage, 1_000 + STALE_CHUNK_RELOAD_WINDOW_MS - 1),
    ).toBe(false);
    // The refused attempt must not extend the cooldown.
    expect(storage.data.get(STALE_CHUNK_RELOAD_KEY)).toBe("1000");
  });

  it("allows a reload again once the cooldown has elapsed", () => {
    const storage = makeStorage({ [STALE_CHUNK_RELOAD_KEY]: "1000" });
    const later = 1_000 + STALE_CHUNK_RELOAD_WINDOW_MS;

    expect(claimStaleChunkReload(storage, later)).toBe(true);
    expect(storage.data.get(STALE_CHUNK_RELOAD_KEY)).toBe(String(later));
  });

  it("treats a corrupt stored value as no prior attempt", () => {
    const storage = makeStorage({ [STALE_CHUNK_RELOAD_KEY]: "not-a-number" });

    expect(claimStaleChunkReload(storage, 5_000)).toBe(true);
    expect(storage.data.get(STALE_CHUNK_RELOAD_KEY)).toBe("5000");
  });
});
