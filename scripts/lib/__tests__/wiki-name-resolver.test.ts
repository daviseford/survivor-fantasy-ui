import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScrapedPlayer } from "../types";
import {
  extractLastName,
  resolveWikiPageTitle,
  WIKI_NAME_OVERRIDES,
} from "../wiki-api";

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

  it("falls through to Layer 2 when override map entry fetch fails", async () => {
    // "Andria Herd" is in override map, but wiki fetch for "Dreamz Herd" fails
    mockFetch.mockResolvedValueOnce(null); // Override fetch fails
    mockFetch.mockResolvedValueOnce(null); // full_name fails
    mockFetch.mockResolvedValueOnce("{{Contestant}}"); // castaway+last succeeds

    const player = makePlayer({
      wikiPageTitle: "Andria Herd",
      castawayShortName: "Dreamz",
    });
    const result = await resolveWikiPageTitle(player, mockFetch);

    expect(result).not.toBeNull();
    expect(result!.title).toBe("Dreamz Herd");
    expect(result!.layer).toBe("castaway");
    // Called 3 times: override, full_name, castaway+last
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
