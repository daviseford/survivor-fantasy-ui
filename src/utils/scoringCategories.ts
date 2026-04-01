import { PlayerAction } from "../types";
import { EnhancedScores } from "./scoringUtils";

export type ScoringCategory =
  | "immunity"
  | "reward"
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
  immunity: "immunity",

  // Idols & Advantages — Find
  find_idol: "idolsAndAdvantages",
  find_extra_vote: "idolsAndAdvantages",
  find_steal_a_vote: "idolsAndAdvantages",
  find_block_a_vote: "idolsAndAdvantages",
  find_bank_your_vote: "idolsAndAdvantages",
  find_idol_nullifier: "idolsAndAdvantages",
  find_knowledge_is_power: "idolsAndAdvantages",
  find_safety_without_power: "idolsAndAdvantages",
  find_control_the_vote: "idolsAndAdvantages",
  find_amulet: "idolsAndAdvantages",
  find_challenge_advantage: "idolsAndAdvantages",
  find_other_advantage: "idolsAndAdvantages",
  find_beware_advantage: "idolsAndAdvantages",
  accept_beware_advantage: "idolsAndAdvantages",
  fulfill_beware_advantage: "idolsAndAdvantages",

  // Idols & Advantages — Use
  use_idol: "idolsAndAdvantages",
  use_extra_vote: "idolsAndAdvantages",
  use_steal_a_vote: "idolsAndAdvantages",
  use_block_a_vote: "idolsAndAdvantages",
  use_bank_your_vote: "idolsAndAdvantages",
  use_idol_nullifier: "idolsAndAdvantages",
  use_knowledge_is_power: "idolsAndAdvantages",
  use_safety_without_power: "idolsAndAdvantages",
  use_control_the_vote: "idolsAndAdvantages",
  votes_negated_by_idol: "idolsAndAdvantages",

  // Idols & Advantages — Win
  win_extra_vote: "idolsAndAdvantages",
  win_steal_a_vote: "idolsAndAdvantages",
  win_block_a_vote: "idolsAndAdvantages",
  win_idol: "idolsAndAdvantages",
  win_other_advantage: "idolsAndAdvantages",

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
  reward: "var(--mantine-color-yellow-4)",
  idolsAndAdvantages: "var(--mantine-color-violet-6)",
  milestones: "var(--mantine-color-lime-6)",
  eliminations: "var(--mantine-color-red-6)",
  other: "var(--mantine-color-gray-6)",
};

export const CategoryLabels: Record<ScoringCategory, string> = {
  immunity: "Immunity",
  reward: "Reward",
  idolsAndAdvantages: "Idols & Advantages",
  milestones: "Milestones",
  eliminations: "Elimination",
  other: "Other",
};

export const ScoringCategories: ScoringCategory[] = [
  "immunity",
  "reward",
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
