import { PlayerAction } from "../types";
import { EnhancedScores } from "./scoringUtils";

export type ScoringCategory =
  | "immunity"
  | "reward"
  | "idols"
  | "advantages"
  | "milestones"
  | "eliminations"
  | "other";

export type CategoryBreakdown = {
  category: ScoringCategory;
  points: number;
};

export const ScoringCategoryMap: Record<PlayerAction, ScoringCategory> = {
  // Challenges
  duel: "reward",
  reward: "reward",
  team_reward: "reward",
  immunity: "immunity",
  team_immunity: "immunity",

  // Idols — Find / Use / Win
  find_idol: "idols",
  use_idol: "idols",
  win_idol: "idols",
  votes_negated_by_idol: "idols",
  find_idol_nullifier: "idols",
  use_idol_nullifier: "idols",

  // Advantages — Find
  find_extra_vote: "advantages",
  find_steal_a_vote: "advantages",
  find_block_a_vote: "advantages",
  find_bank_your_vote: "advantages",
  find_knowledge_is_power: "advantages",
  find_safety_without_power: "advantages",
  find_control_the_vote: "advantages",
  find_amulet: "advantages",
  find_challenge_advantage: "advantages",
  find_other_advantage: "advantages",
  find_beware_advantage: "advantages",
  accept_beware_advantage: "advantages",
  fulfill_beware_advantage: "advantages",

  // Advantages — Use
  use_amulet: "advantages",
  use_challenge_advantage: "advantages",
  use_extra_vote: "advantages",
  use_steal_a_vote: "advantages",
  use_block_a_vote: "advantages",
  use_bank_your_vote: "advantages",
  use_knowledge_is_power: "advantages",
  use_safety_without_power: "advantages",
  use_control_the_vote: "advantages",
  use_other_advantage: "advantages",
  voted_out_with_advantage: "advantages",
  voted_out_with_idol: "idols",

  // Advantages — Win
  win_extra_vote: "advantages",
  win_steal_a_vote: "advantages",
  win_block_a_vote: "advantages",
  win_other_advantage: "advantages",

  // Milestones
  make_merge: "milestones",
  make_final_tribal_council: "milestones",
  win_survivor: "milestones",

  // Eliminations
  ejected: "eliminations",
  eliminated: "eliminations",
  medically_evacuated: "eliminations",
  quitter: "eliminations",

  // Other
  use_shot_in_the_dark_successfully: "other",
  use_shot_in_the_dark_unsuccessfully: "other",
  journey_lost_vote: "other",
  journey_risked_vote: "other",
  journey_won_game: "other",
  win_fire_making: "other",
};

export const CategoryColors: Record<ScoringCategory, string> = {
  immunity: "var(--mantine-color-blue-6)",
  reward: "var(--mantine-color-yellow-4)",
  idols: "var(--mantine-color-violet-6)",
  advantages: "var(--mantine-color-grape-6)",
  milestones: "var(--mantine-color-lime-6)",
  eliminations: "var(--mantine-color-red-6)",
  other: "var(--mantine-color-gray-6)",
};

export const CategoryLabels: Record<ScoringCategory, string> = {
  immunity: "Immunity",
  reward: "Reward",
  idols: "Idols",
  advantages: "Advantages",
  milestones: "Milestones",
  eliminations: "Elimination",
  other: "Other",
};

export const ScoringCategories: ScoringCategory[] = [
  "immunity",
  "reward",
  "idols",
  "advantages",
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
    idols: 0,
    advantages: 0,
    milestones: 0,
    eliminations: 0,
    other: 0,
  };

  for (const episode of enhancedScores) {
    for (const { action, points_awarded } of episode.actions) {
      const category = ScoringCategoryMap[action];
      if (!category) continue;
      totals[category] += points_awarded;
    }
  }

  return ScoringCategories.map((category) => ({
    category,
    points: totals[category],
  }));
};
