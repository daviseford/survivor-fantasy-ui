import { describe, expect, it } from "vitest";
import { PlayerActions } from "../../types";
import {
  ScoringCategories,
  ScoringCategoryMap,
  aggregateByScoringCategory,
} from "../scoringCategories";
import { EnhancedScores } from "../scoringUtils";

describe("ScoringCategoryMap", () => {
  it("maps every PlayerAction to exactly one category", () => {
    for (const action of PlayerActions) {
      expect(ScoringCategoryMap[action]).toBeDefined();
      expect(ScoringCategories).toContain(ScoringCategoryMap[action]);
    }
  });

  it("has no extra keys beyond PlayerActions", () => {
    const mappedActions = Object.keys(ScoringCategoryMap);
    expect(mappedActions.length).toBe(PlayerActions.length);
    for (const action of mappedActions) {
      expect(PlayerActions).toContain(action);
    }
  });
});

describe("aggregateByScoringCategory", () => {
  it("aggregates actions across all 7 categories", () => {
    const scores: EnhancedScores[] = [
      {
        episode_num: 1,
        total: 12.5,
        actions: [
          { action: "immunity", points_awarded: 2 },
          { action: "reward", points_awarded: 1 },
          { action: "combined", points_awarded: 3 },
          { action: "find_idol", points_awarded: 1 },
          { action: "make_merge", points_awarded: 2 },
          { action: "eliminated", points_awarded: 3 },
          { action: "go_on_journey", points_awarded: 0.5 },
        ],
      },
    ];

    const result = aggregateByScoringCategory(scores);

    expect(result).toEqual([
      { category: "immunity", points: 2 },
      { category: "reward", points: 1 },
      { category: "combined", points: 3 },
      { category: "idolsAndAdvantages", points: 1 },
      { category: "milestones", points: 2 },
      { category: "eliminations", points: 3 },
      { category: "other", points: 0.5 },
    ]);
  });

  it("sums points across multiple episodes", () => {
    const scores: EnhancedScores[] = [
      {
        episode_num: 1,
        total: 3,
        actions: [
          { action: "reward", points_awarded: 1 },
          { action: "find_idol", points_awarded: 1 },
        ],
      },
      {
        episode_num: 2,
        total: 5,
        actions: [
          { action: "combined", points_awarded: 3 },
          { action: "use_idol", points_awarded: 2 },
        ],
      },
    ];

    const result = aggregateByScoringCategory(scores);

    expect(result.find((r) => r.category === "reward")?.points).toBe(1);
    expect(result.find((r) => r.category === "combined")?.points).toBe(3);
    expect(
      result.find((r) => r.category === "idolsAndAdvantages")?.points,
    ).toBe(3);
    expect(result.find((r) => r.category === "immunity")?.points).toBe(0);
    expect(result.find((r) => r.category === "milestones")?.points).toBe(0);
    expect(result.find((r) => r.category === "eliminations")?.points).toBe(0);
    expect(result.find((r) => r.category === "other")?.points).toBe(0);
  });

  it("returns all categories with 0 points for empty actions", () => {
    const scores: EnhancedScores[] = [
      { episode_num: 1, total: 0, actions: [] },
    ];

    const result = aggregateByScoringCategory(scores);

    expect(result).toHaveLength(7);
    for (const breakdown of result) {
      expect(breakdown.points).toBe(0);
    }
  });

  it("returns all categories with 0 points for empty array", () => {
    const result = aggregateByScoringCategory([]);

    expect(result).toHaveLength(7);
    for (const breakdown of result) {
      expect(breakdown.points).toBe(0);
    }
  });

  it("returns 0 for categories with no matching actions", () => {
    const scores: EnhancedScores[] = [
      {
        episode_num: 1,
        total: 2,
        actions: [{ action: "immunity", points_awarded: 2 }],
      },
    ];

    const result = aggregateByScoringCategory(scores);

    expect(result.find((r) => r.category === "immunity")?.points).toBe(2);
    expect(result.find((r) => r.category === "reward")?.points).toBe(0);
    expect(result.find((r) => r.category === "combined")?.points).toBe(0);
    expect(
      result.find((r) => r.category === "idolsAndAdvantages")?.points,
    ).toBe(0);
    expect(result.find((r) => r.category === "milestones")?.points).toBe(0);
    expect(result.find((r) => r.category === "eliminations")?.points).toBe(0);
    expect(result.find((r) => r.category === "other")?.points).toBe(0);
  });
});
