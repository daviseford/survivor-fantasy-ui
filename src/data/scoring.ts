import { PlayerScoring } from "../types";

export const BASE_PLAYER_SCORING = [
  {
    action: "reward",
    fixed_value: 1,
    description: "Win a reward challenge.",
  },
  {
    action: "immunity",
    fixed_value: 2,
    description: "Win an immunity challenge.",
  },
  {
    action: "votes_negated_by_idol",
    fixed_value: 1,
    multiplier: true,
    description: "Number of votes negated by playing an idol at Tribal.",
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
    description: "Make it to the merge.",
  },
  {
    action: "make_final_tribal_council",
    fixed_value: 4,
    description: "Make it to the Final Tribal Council. Even as a goat.",
  },
  {
    action: "win_survivor",
    fixed_value: 20,
    description: "Become the Sole Survivor.",
  },
  // --- Find actions (1 pt each) ---
  {
    action: "find_idol",
    fixed_value: 1,
    description: "Find a Hidden Immunity Idol.",
  },
  {
    action: "find_extra_vote",
    fixed_value: 1,
    description: "Find an Extra Vote advantage.",
  },
  {
    action: "find_steal_a_vote",
    fixed_value: 1,
    description: "Find a Steal a Vote advantage.",
  },
  {
    action: "find_block_a_vote",
    fixed_value: 1,
    description: "Find a Block a Vote advantage.",
  },
  {
    action: "find_bank_your_vote",
    fixed_value: 1,
    description: "Find a Bank your Vote advantage.",
  },
  {
    action: "find_idol_nullifier",
    fixed_value: 1,
    description: "Find an Idol Nullifier.",
  },
  {
    action: "find_knowledge_is_power",
    fixed_value: 1,
    description: "Find a Knowledge is Power advantage.",
  },
  {
    action: "find_safety_without_power",
    fixed_value: 1,
    description: "Find a Safety without Power advantage.",
  },
  {
    action: "find_control_the_vote",
    fixed_value: 1,
    description: "Find a Control the Vote advantage.",
  },
  {
    action: "find_amulet",
    fixed_value: 1,
    description: "Find an Amulet advantage.",
  },
  {
    action: "find_challenge_advantage",
    fixed_value: 1,
    description: "Find a Challenge Advantage.",
  },
  {
    action: "find_other_advantage",
    fixed_value: 1,
    description: "Find a rare or one-off advantage.",
  },
  // --- Use actions (2 pts each) ---
  {
    action: "use_idol",
    fixed_value: 2,
    description: "Play a Hidden Immunity Idol at Tribal Council.",
  },
  {
    action: "use_extra_vote",
    fixed_value: 2,
    description: "Play an Extra Vote at Tribal Council.",
  },
  {
    action: "use_steal_a_vote",
    fixed_value: 2,
    description: "Play a Steal a Vote at Tribal Council.",
  },
  {
    action: "use_block_a_vote",
    fixed_value: 2,
    description: "Play a Block a Vote at Tribal Council.",
  },
  {
    action: "use_bank_your_vote",
    fixed_value: 2,
    description: "Bank your vote for a future Tribal Council.",
  },
  {
    action: "use_idol_nullifier",
    fixed_value: 2,
    description: "Play an Idol Nullifier against another player.",
  },
  {
    action: "use_knowledge_is_power",
    fixed_value: 2,
    description: "Play Knowledge is Power to steal an idol or advantage.",
  },
  {
    action: "use_safety_without_power",
    fixed_value: 2,
    description: "Use Safety without Power to be safe but lose your vote.",
  },
  {
    action: "use_control_the_vote",
    fixed_value: 2,
    description: "Use Control the Vote at Tribal Council.",
  },
  // --- Win actions (1 pt each) ---
  {
    action: "win_extra_vote",
    fixed_value: 1,
    description: "Win an Extra Vote from a journey or challenge.",
  },
  {
    action: "win_steal_a_vote",
    fixed_value: 1,
    description: "Win a Steal a Vote from a journey or challenge.",
  },
  {
    action: "win_block_a_vote",
    fixed_value: 1,
    description: "Win a Block a Vote from a journey or challenge.",
  },
  {
    action: "win_idol",
    fixed_value: 1,
    description: "Win an idol from a journey or challenge.",
  },
  {
    action: "win_other_advantage",
    fixed_value: 1,
    description: "Win a rare or one-off advantage from a journey or challenge.",
  },
  // --- Other scoring events ---
  {
    action: "eliminated",
    description:
      "1 point awarded per episode number (e.g. 6 points for Episode 6 elimination).",
  },
  {
    action: "use_shot_in_the_dark_unsuccessfully",
    fixed_value: 1,
    description: "It was worth a shot.",
  },
  {
    action: "use_shot_in_the_dark_successfully",
    fixed_value: 6,
    description: "Buy a lottery ticket if you pull this off.",
  },
  {
    action: "find_beware_advantage",
    fixed_value: 0.5,
    description:
      "The player finds the Beware advantage. They can pass it to someone else with no penalty.",
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
