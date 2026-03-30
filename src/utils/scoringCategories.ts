import { PlayerAction } from "../types";
import { EnhancedScores } from "./scoringUtils";

export type ScoringCategory =
  | "immunity"
  | "reward"
  | "combined"
  | "idolsAndAdvantages"
  | "milestones"
  | "eliminations"
  | "other";

export type CategoryBreakdown = {
  category: ScoringCategory;
  points: number;
};

export const ScoringCategoryMap: Record<PlayerAction, ScoringCategory> = {
  // Challenges
  reward: "reward",
  combined: "combined",
  immunity: "immunity",

  // Idols & Advantages
  find_idol: "idolsAndAdvantages",
  find_advantage: "idolsAndAdvantages",
  use_idol: "idolsAndAdvantages",
  use_advantage: "idolsAndAdvantages",
  votes_negated_by_idol: "idolsAndAdvantages",
  win_advantage: "idolsAndAdvantages",
  find_beware_advantage: "idolsAndAdvantages",
  accept_beware_advantage: "idolsAndAdvantages",
  fulfill_beware_advantage: "idolsAndAdvantages",

  // Milestones
  make_merge: "milestones",
  make_final_tribal_council: "milestones",
  win_survivor: "milestones",

  // Eliminations
  eliminated: "eliminations",
  medically_evacuated: "eliminations",
  quitter: "eliminations",

  // Other
  use_shot_in_the_dark_successfully: "other",
  use_shot_in_the_dark_unsuccessfully: "other",
  go_on_journey: "other",
  complete_sweat_or_savvy_task: "other",
};

export const CategoryColors: Record<ScoringCategory, string> = {
  immunity: "var(--mantine-color-blue-6)",
  reward: "var(--mantine-color-cyan-6)",
  combined: "var(--mantine-color-indigo-6)",
  idolsAndAdvantages: "var(--mantine-color-violet-6)",
  milestones: "var(--mantine-color-green-6)",
  eliminations: "var(--mantine-color-red-6)",
  other: "var(--mantine-color-gray-6)",
};

export const CategoryLabels: Record<ScoringCategory, string> = {
  immunity: "Immunity",
  reward: "Reward",
  combined: "Immunity + Reward",
  idolsAndAdvantages: "Idols & Advantages",
  milestones: "Milestones",
  eliminations: "Eliminations",
  other: "Other",
};

export const ScoringCategories: ScoringCategory[] = [
  "immunity",
  "reward",
  "combined",
  "idolsAndAdvantages",
  "milestones",
  "eliminations",
  "other",
];

export const aggregateByScoringCategory = (
  enhancedScores: EnhancedScores[],
): CategoryBreakdown[] => {
  const totals: Record<ScoringCategory, number> = {
    immunity: 0,
    reward: 0,
    combined: 0,
    idolsAndAdvantages: 0,
    milestones: 0,
    eliminations: 0,
    other: 0,
  };

  for (const episode of enhancedScores) {
    for (const { action, points_awarded } of episode.actions) {
      const category = ScoringCategoryMap[action];
      totals[category] += points_awarded;
    }
  }

  return ScoringCategories.map((category) => ({
    category,
    points: totals[category],
  }));
};
