import { describe, expect, it } from "vitest";
import { generateEpisodeSection } from "../codegen";
import type { ScrapedEpisode } from "../types";

const makeEpisode = (
  overrides: Partial<ScrapedEpisode> = {},
): ScrapedEpisode => ({
  order: 1,
  title: "Premiere",
  airDate: "2026-02-25",
  isFinale: false,
  postMerge: false,
  mergeOccurs: false,
  ...overrides,
});

describe("generateEpisodeSection", () => {
  it("emits a known episode air date", () => {
    const output = generateEpisodeSection([makeEpisode()], 50);

    expect(output).toContain('air_date: "2026-02-25"');
  });

  it("omits the field when the source has no air date", () => {
    const output = generateEpisodeSection([makeEpisode({ airDate: "" })], 50);

    expect(output).not.toContain("air_date:");
  });
});
