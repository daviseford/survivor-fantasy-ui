import { PlayerScoring } from "../types";

export const BASE_PLAYER_SCORING = [
  {
    action: "reward",
    fixed_value: 1,
    description: "Win a reward challenge",
  },
  {
    action: "combined",
    fixed_value: 3,
    description: "Win a combined reward + immunity challenge",
  },
  {
    action: "immunity",
    fixed_value: 2,
    description: "Win an immunity challenge",
  },
  {
    action: "votes_negated_by_idol",
    fixed_value: 1,
    multiplier: true,
    description: "Any votes negated by playing an idol",
  },
  {
    action: "medically_evacuated",
    fixed_value: 5,
    description: "Production pulls them out for medical reasons.",
  },
  {
    action: "quitter",
    fixed_value: 3,
    description:
      "Contestant makes production pull them out because they are a crybaby.",
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
    description:
      "Player gets credit for playing an idol on themself or another player.",
  },
  {
    action: "use_advantage",
    fixed_value: 2,
    description:
      "Whether it's at tribal or pre-challenge or any other time. Using an advantage triggers this.",
  },
  {
    action: "eliminated",
    description:
      "1 pt per episode number (e.g. 5 pts for Episode 5 elimination)",
  },
  {
    action: "use_shot_in_the_dark_unsuccessfully",
    fixed_value: 1,
  },
  {
    action: "use_shot_in_the_dark_successfully",
    fixed_value: 6,
  },
  {
    action: "accept_beware_advantage",
    fixed_value: 0.5,
    description:
      "The player accepts the Beware advantage and begins playing under its conditions.",
  },
  {
    action: "fulfill_beware_advantage",
    fixed_value: 0.5,
    description:
      "The player fulfills the terms and escapes the Beware part of the advantage.",
  },
  {
    action: "go_on_journey",
    fixed_value: 0.5,
    description: "This one's easy. Just go on a boat ride.",
  },
  {
    action: "complete_sweat_or_savvy_task",
    fixed_value: 0.5,
    description: "Successfully complete Sweat or Savvy task",
  },
] satisfies PlayerScoring[];
