import { describe, expect, it } from "vitest";
import type {
  ScrapedChallenge,
  ScrapedElimination,
  ScrapedEpisode,
  ScrapedGameEvent,
  ScrapedPlayer,
  ScrapeResult,
  ScrapeResultsOutput,
} from "../types";
import { validateSeasonData } from "../validate-season";

function makePlayer(overrides: Partial<ScrapedPlayer> = {}): ScrapedPlayer {
  return {
    wikiPageTitle: "Test Player",
    localName: "Test Player",
    castawayId: "US0001",
    matchStatus: "exact",
    ...overrides,
  };
}

function makePlayerData(
  players: ScrapedPlayer[] = [makePlayer()],
): ScrapeResult {
  return { seasonNum: 50, scrapedAt: "", players, unmatched: [] };
}

function makeResultsData(
  overrides: Partial<ScrapeResultsOutput> = {},
): ScrapeResultsOutput {
  return {
    seasonNum: 50,
    scrapedAt: "",
    episodes: [
      {
        order: 1,
        title: "Ep 1",
        airDate: "",
        isCombinedChallenge: false,
        isFinale: false,
        postMerge: false,
        mergeOccurs: false,
      },
    ],
    challenges: [],
    eliminations: [],
    events: [],
    warnings: [],
    ...overrides,
  };
}

describe("validateSeasonData", () => {
  it("passes for valid season data with all gameplay sections", () => {
    const players = [
      makePlayer({ castawayId: "US0001" }),
      makePlayer({ castawayId: "US0002", localName: "Player 2" }),
    ];
    const challenges: ScrapedChallenge[] = [
      {
        episodeNum: 1,
        variant: "immunity",
        winnerCastawayIds: ["US0001"],
        winnerTribe: null,
        order: 1,
      },
    ];
    const eliminations: ScrapedElimination[] = [
      {
        episodeNum: 1,
        castawayId: "US0002",
        voteString: "5-2",
        variant: "tribal",
        finishText: "Voted Out",
        order: 1,
      },
    ];
    const events: ScrapedGameEvent[] = [
      {
        episodeNum: 1,
        castawayId: "US0001",
        action: "find_idol",
        multiplier: null,
      },
    ];

    const result = validateSeasonData(
      makePlayerData(players),
      makeResultsData({ challenges, eliminations, events }),
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("passes for new season with no existing episode count", () => {
    const result = validateSeasonData(makePlayerData(), makeResultsData());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("passes when episode count equals existing count", () => {
    const result = validateSeasonData(makePlayerData(), makeResultsData(), 1);
    expect(result.valid).toBe(true);
  });

  it("passes when episode count increases from existing", () => {
    const episodes: ScrapedEpisode[] = [
      {
        order: 1,
        title: "Ep 1",
        airDate: "",
        isCombinedChallenge: false,
        isFinale: false,
        postMerge: false,
        mergeOccurs: false,
      },
      {
        order: 2,
        title: "Ep 2",
        airDate: "",
        isCombinedChallenge: false,
        isFinale: false,
        postMerge: false,
        mergeOccurs: false,
      },
    ];
    const result = validateSeasonData(
      makePlayerData(),
      makeResultsData({ episodes }),
      1,
    );
    expect(result.valid).toBe(true);
  });

  it("passes for season with empty challenges/eliminations/events (early-season state)", () => {
    const result = validateSeasonData(
      makePlayerData(),
      makeResultsData({ challenges: [], eliminations: [], events: [] }),
    );
    expect(result.valid).toBe(true);
  });

  it("fails when episode count decreased", () => {
    const result = validateSeasonData(
      makePlayerData(),
      makeResultsData({
        episodes: [
          {
            order: 1,
            title: "Ep 1",
            airDate: "",
            isCombinedChallenge: false,
            isFinale: false,
            postMerge: false,
            mergeOccurs: false,
          },
        ],
      }),
      5,
    );

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Episode count decreased from 5 to 1");
  });

  it("fails when challenge references unknown castaway_id", () => {
    const challenges: ScrapedChallenge[] = [
      {
        episodeNum: 1,
        variant: "immunity",
        winnerCastawayIds: ["US9999"],
        winnerTribe: null,
        order: 1,
      },
    ];

    const result = validateSeasonData(
      makePlayerData(),
      makeResultsData({ challenges }),
    );

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("US9999");
  });

  it("fails when duplicate challenge IDs exist", () => {
    const challenge: ScrapedChallenge = {
      episodeNum: 1,
      variant: "immunity",
      winnerCastawayIds: ["US0001"],
      winnerTribe: null,
      order: 1,
    };
    const challenges = [challenge, { ...challenge }];

    const result = validateSeasonData(
      makePlayerData(),
      makeResultsData({ challenges }),
    );

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Duplicate challenge");
  });

  it("fails when duplicate elimination IDs exist", () => {
    const players = [
      makePlayer({ castawayId: "US0001" }),
      makePlayer({ castawayId: "US0002", localName: "P2" }),
    ];
    const elim: ScrapedElimination = {
      episodeNum: 1,
      castawayId: "US0001",
      voteString: "5-2",
      variant: "tribal",
      finishText: "Voted Out",
      order: 1,
    };

    const result = validateSeasonData(
      makePlayerData(players),
      makeResultsData({ eliminations: [elim, { ...elim }] }),
    );

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Duplicate elimination");
  });

  it("warns on duplicate event IDs", () => {
    const event: ScrapedGameEvent = {
      episodeNum: 1,
      castawayId: "US0001",
      action: "find_idol",
      multiplier: null,
    };

    const result = validateSeasonData(
      makePlayerData(),
      makeResultsData({ events: [event, { ...event }] }),
    );

    // Duplicate events are warnings, not errors
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Duplicate event");
  });

  it("fails when elimination references unknown castaway_id", () => {
    const eliminations: ScrapedElimination[] = [
      {
        episodeNum: 1,
        castawayId: "US9999",
        voteString: "5-2",
        variant: "tribal",
        finishText: "Voted Out",
        order: 1,
      },
    ];

    const result = validateSeasonData(
      makePlayerData(),
      makeResultsData({ eliminations }),
    );

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain(
      'references unknown castaway_id "US9999"',
    );
  });

  it("fails when event references unknown castaway_id", () => {
    const events: ScrapedGameEvent[] = [
      {
        episodeNum: 1,
        castawayId: "US8888",
        action: "find_idol",
        multiplier: null,
      },
    ];

    const result = validateSeasonData(
      makePlayerData(),
      makeResultsData({ events }),
    );

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('"US8888"');
  });

  it("fails when elimination missing castaway_id", () => {
    const eliminations: ScrapedElimination[] = [
      {
        episodeNum: 1,
        castawayId: "",
        voteString: "5-2",
        variant: "tribal",
        finishText: "Voted Out",
        order: 1,
      },
    ];

    const result = validateSeasonData(
      makePlayerData(),
      makeResultsData({ eliminations }),
    );

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("missing required castaway_id");
  });

  it("reports multiple validation errors together", () => {
    const challenges: ScrapedChallenge[] = [
      {
        episodeNum: 1,
        variant: "immunity",
        winnerCastawayIds: ["US9999"],
        winnerTribe: null,
        order: 1,
      },
    ];
    const eliminations: ScrapedElimination[] = [
      {
        episodeNum: 1,
        castawayId: "",
        voteString: "",
        variant: "tribal",
        finishText: "",
        order: 1,
      },
    ];

    const result = validateSeasonData(
      makePlayerData(),
      makeResultsData({ challenges, eliminations }),
      10, // episode count decreased too
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(3);
  });
});
