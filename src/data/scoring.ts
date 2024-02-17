import { PlayerScoring } from "../types";

export const BASE_PLAYER_SCORING = [
  {
    action: "reward",
    fixed_value: 1,
  },
  {
    action: "combined",
    fixed_value: 3,
    description: "Combined reward + immunity challenge",
  },
  {
    action: "immunity",
    fixed_value: 2,
  },
  {
    action: "votes_negated_by_idol",
    fixed_value: 5,
  },
  {
    action: "medically_evacuated",
    fixed_value: 5,
  },
  {
    action: "make_merge",
    fixed_value: 2,
  },
  {
    action: "make_final_tribal_council",
    fixed_value: 2,
  },
  {
    action: "win_survivor",
    fixed_value: 20,
  },
  {
    action: "find_idol",
    fixed_value: 1,
    description: "Clues do not count",
  },
  {
    action: "find_advantage",
    fixed_value: 1,
    description: "Clues do not count",
  },
  {
    action: "use_idol",
    fixed_value: 2,
  },
  {
    action: "use_advantage",
    fixed_value: 2,
  },
  {
    action: "eliminated",
    description:
      "1 pt per episode number (e.g. 5 pts for Episode 5 elimination)",
  },
] satisfies PlayerScoring[];
