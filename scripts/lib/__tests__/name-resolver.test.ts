import { describe, expect, it } from "vitest";
import { resolveNames } from "../name-resolver";
import { CastTableEntry } from "../wikitext-parser";

function entry(
  wikiPageTitle: string,
  displayName?: string,
): CastTableEntry {
  return {
    wikiPageTitle,
    displayName: displayName ?? wikiPageTitle,
  };
}

describe("resolveNames", () => {
  it("exact match — normalized wiki title matches local name", () => {
    const results = resolveNames(
      ["Ben Katzman", "Charlie Davis"],
      [entry("Ben_Katzman", "Ben Katzman")],
    );
    expect(results).toHaveLength(1);
    expect(results[0].localName).toBe("Ben Katzman");
    expect(results[0].matchStatus).toBe("exact");
  });

  it("exact match — handles quotes in names", () => {
    const results = resolveNames(
      ['Benjamin "Coach" Wade', "Ozzy Lusth"],
      [entry("Coach_Wade", "Coach Wade")],
    );
    // Coach Wade won't exact-match 'Benjamin "Coach" Wade'
    // but fuzzy: last name "Wade" matches, first names include "coach"
    expect(results).toHaveLength(1);
    expect(results[0].localName).toBe('Benjamin "Coach" Wade');
    expect(results[0].matchStatus).toBe("fuzzy");
  });

  it("fuzzy match — Q Burdette variants", () => {
    const results = resolveNames(
      ["Q Burdette"],
      [entry("Q_Burdette", "Q Burdette")],
    );
    expect(results).toHaveLength(1);
    expect(results[0].localName).toBe("Q Burdette");
    expect(results[0].matchStatus).toBe("exact");
  });

  it("fuzzy match — Quintavius Q Burdette matches Q_Burdette", () => {
    const results = resolveNames(
      ['Quintavius "Q" Burdette'],
      [entry("Q_Burdette", "Q Burdette")],
    );
    expect(results).toHaveLength(1);
    expect(results[0].localName).toBe('Quintavius "Q" Burdette');
    // After removing quotes: "Quintavius Q Burdette" has firstNames ["quintavius", "q"]
    // Wiki "Q Burdette" has firstNames ["q"] — overlap on "q"
    expect(results[0].matchStatus).toBe("fuzzy");
  });

  it("unmatched — no match found", () => {
    const results = resolveNames(
      ["Some Player"],
      [entry("Completely_Different", "Completely Different")],
    );
    expect(results).toHaveLength(1);
    expect(results[0].localName).toBe("");
    expect(results[0].matchStatus).toBe("unmatched");
  });

  it("matches multiple players correctly", () => {
    const results = resolveNames(
      ["Ben Katzman", "Charlie Davis", "Kenzie Petty"],
      [
        entry("Ben_Katzman", "Ben Katzman"),
        entry("Charlie_Davis", "Charlie Davis"),
        entry("Kenzie_Petty", "Kenzie Petty"),
      ],
    );
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.matchStatus === "exact")).toBe(true);
  });

  it("Tiffany Ervin matches Tiffany_Nicole_Ervin via fuzzy", () => {
    const results = resolveNames(
      ["Tiffany Ervin"],
      [entry("Tiffany_Nicole_Ervin", "Tiffany Nicole Ervin")],
    );
    expect(results).toHaveLength(1);
    expect(results[0].localName).toBe("Tiffany Ervin");
    expect(results[0].matchStatus).toBe("fuzzy");
  });
});
