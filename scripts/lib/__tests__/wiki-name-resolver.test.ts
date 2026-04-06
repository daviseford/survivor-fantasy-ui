import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScrapedPlayer } from "../types";
import {
  extractLastName,
  resolveWikiPageTitle,
  WIKI_NAME_OVERRIDES,
} from "../wiki-name-resolver";

function makePlayer(
  overrides: Partial<ScrapedPlayer> & { wikiPageTitle: string },
): ScrapedPlayer {
  return {
    localName: overrides.wikiPageTitle,
    castawayId: "US0001",
    matchStatus: "exact",
    ...overrides,
  };
}

describe("WIKI_NAME_OVERRIDES", () => {
  it("contains exactly 33 entries", () => {
    expect(Object.keys(WIKI_NAME_OVERRIDES)).toHaveLength(33);
  });

  it("maps known mismatches correctly (spot check)", () => {
    expect(WIKI_NAME_OVERRIDES["James Thomas Jr."]).toBe("J.T. Thomas");
    expect(WIKI_NAME_OVERRIDES["Andria Herd"]).toBe("Dreamz Herd");
    expect(WIKI_NAME_OVERRIDES["Vince Sly"]).toBe("Vince S.");
    expect(WIKI_NAME_OVERRIDES["Robert Crowley"]).toBe("Bob Crowley");
    expect(WIKI_NAME_OVERRIDES["Ricard Foye"]).toBe("Ricard Foyé");
  });
});

describe("extractLastName", () => {
  it("extracts last name from a standard two-part name", () => {
    expect(extractLastName("Richard Hatch")).toBe("Hatch");
  });

  it("strips Jr. suffix", () => {
    expect(extractLastName("James Thomas Jr.")).toBe("Thomas");
  });

  it("strips Sr. suffix", () => {
    expect(extractLastName("John Smith Sr.")).toBe("Smith");
  });

  it("preserves hyphenated compound last names", () => {
    expect(extractLastName("Wendy-Jo DeSmidt-Kohlhoff")).toBe(
      "DeSmidt-Kohlhoff",
    );
  });

  it("handles three-part names (middle name)", () => {
    expect(extractLastName("Taylor Lee Stocker")).toBe("Stocker");
  });

  it("handles single-word names by returning the word", () => {
    expect(extractLastName("Madonna")).toBe("Madonna");
  });

  it("returns suffix as-is for two-word names (no valid last name to fall back to)", () => {
    // With only two parts, stripping the suffix would return the first name
    expect(extractLastName("Someone Jr.")).toBe("Jr.");
  });
});

describe("resolveWikiPageTitle", () => {
  let mockFetch: ReturnType<
    typeof vi.fn<(name: string) => Promise<string | null>>
  >;

  beforeEach(() => {
    mockFetch = vi.fn<(name: string) => Promise<string | null>>();
  });

  it("resolves via override map (Layer 1)", async () => {
    // "Andria Herd" maps to "Dreamz Herd" in the override map
    mockFetch.mockResolvedValueOnce("{{Contestant|image=Dreamz.jpg}}");

    const player = makePlayer({
      wikiPageTitle: "Andria Herd",
      castawayShortName: "Dreamz",
    });
    const result = await resolveWikiPageTitle(player, mockFetch);

    expect(result).not.toBeNull();
    expect(result!.title).toBe("Dreamz Herd");
    expect(result!.layer).toBe("override");
    expect(result!.wikitext).toContain("Contestant");
    expect(mockFetch).toHaveBeenCalledWith("Dreamz Herd");
  });

  it("resolves via full_name (Layer 2) when not in override map", async () => {
    mockFetch.mockResolvedValueOnce("{{Contestant|image=Richard.jpg}}");

    const player = makePlayer({
      wikiPageTitle: "Richard Hatch",
      castawayShortName: "Richard",
    });
    const result = await resolveWikiPageTitle(player, mockFetch);

    expect(result).not.toBeNull();
    expect(result!.title).toBe("Richard Hatch");
    expect(result!.layer).toBe("full_name");
    expect(mockFetch).toHaveBeenCalledWith("Richard Hatch");
  });

  it("resolves via castaway+last name (Layer 3) when Layers 1-2 fail", async () => {
    mockFetch.mockResolvedValueOnce(null); // full_name fails
    mockFetch.mockResolvedValueOnce("{{Contestant|image=Nickname.jpg}}"); // castaway+last succeeds

    const player = makePlayer({
      wikiPageTitle: "Firstname Lastname",
      castawayShortName: "Nickname",
    });
    const result = await resolveWikiPageTitle(player, mockFetch);

    expect(result).not.toBeNull();
    expect(result!.title).toBe("Nickname Lastname");
    expect(result!.layer).toBe("castaway");
    expect(mockFetch).toHaveBeenNthCalledWith(1, "Firstname Lastname");
    expect(mockFetch).toHaveBeenNthCalledWith(2, "Nickname Lastname");
  });

  it("skips Layer 3 when castawayShortName is undefined", async () => {
    mockFetch.mockResolvedValue(null);

    const player = makePlayer({
      wikiPageTitle: "Richard Hatch",
      // castawayShortName intentionally omitted
    });
    const result = await resolveWikiPageTitle(player, mockFetch);

    expect(result).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("skips Layer 3 when castawayShortName equals first word of full_name", async () => {
    mockFetch.mockResolvedValue(null);

    const player = makePlayer({
      wikiPageTitle: "Richard Hatch",
      castawayShortName: "Richard",
    });
    const result = await resolveWikiPageTitle(player, mockFetch);

    expect(result).toBeNull();
    // Should only have called fetch once (Layer 2), not twice
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("Richard Hatch");
  });

  it("returns null when all layers fail", async () => {
    mockFetch.mockResolvedValue(null);

    const player = makePlayer({
      wikiPageTitle: "Unknown Person",
      castawayShortName: "Mystery",
    });
    const result = await resolveWikiPageTitle(player, mockFetch);

    expect(result).toBeNull();
    // Layer 2 (full_name) + Layer 3 (castaway+last)
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("deduplicates Layer 3 when it would produce the same title as Layer 1", async () => {
    // "Andria Herd" maps to "Dreamz Herd" in override. Layer 3 with
    // castawayShortName="Dreamz" + lastName="Herd" also produces "Dreamz Herd".
    // The dedup logic should skip the redundant fetch.
    mockFetch.mockResolvedValue(null); // All fetches fail

    const player = makePlayer({
      wikiPageTitle: "Andria Herd",
      castawayShortName: "Dreamz",
    });
    const result = await resolveWikiPageTitle(player, mockFetch);

    expect(result).toBeNull();
    // Only 2 calls: override ("Dreamz Herd") + full_name ("Andria Herd")
    // Layer 3 skipped because "Dreamz Herd" was already attempted
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenNthCalledWith(1, "Dreamz Herd");
    expect(mockFetch).toHaveBeenNthCalledWith(2, "Andria Herd");
  });
});
