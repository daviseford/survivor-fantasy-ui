export type PropBetAnswerType = "castaway" | "boolean";

export type PropBetQuestionObj = {
  id: `propbet_${string}`;
  point_value: number;
  description: string;
  answer_type: PropBetAnswerType;
};

export const PropBetsQuestions = {
  propbet_winner: {
    id: "propbet_winner",
    point_value: 8,
    description: "Season winner",
    answer_type: "castaway",
  },
  propbet_ftc: {
    id: "propbet_ftc",
    point_value: 5,
    description: "One FTC finalist",
    answer_type: "castaway",
  },
  propbet_first_vote: {
    id: "propbet_first_vote",
    point_value: 4,
    description: "First boot",
    answer_type: "castaway",
  },
  propbet_immunities: {
    id: "propbet_immunities",
    point_value: 5,
    description: "Most individual immunity wins",
    answer_type: "castaway",
  },
  propbet_idols: {
    id: "propbet_idols",
    point_value: 4,
    description: "Most idol finds",
    answer_type: "castaway",
  },
  propbet_medical_evac: {
    id: "propbet_medical_evac",
    point_value: 2,
    description: "Will there be a medical evacuation?",
    answer_type: "boolean",
  },
  propbet_first_idol_found: {
    id: "propbet_first_idol_found",
    point_value: 4,
    description: "First idol found",
    answer_type: "castaway",
  },
  propbet_first_successful_idol_play: {
    id: "propbet_first_successful_idol_play",
    point_value: 4,
    description: "First successful idol play",
    answer_type: "castaway",
  },
  propbet_successful_shot_in_the_dark: {
    id: "propbet_successful_shot_in_the_dark",
    point_value: 3,
    description: "Will anyone successfully play Shot in the Dark?",
    answer_type: "boolean",
  },
  propbet_rewards: {
    id: "propbet_rewards",
    point_value: 3,
    description: "Who will win the most reward challenges after the merge?",
    answer_type: "castaway",
  },
  propbet_quit: {
    id: "propbet_quit",
    point_value: 2,
    description: "Will there be a quit?",
    answer_type: "boolean",
  },
} satisfies Record<`propbet_${string}`, PropBetQuestionObj>;

export type PropBetQuestionKey = keyof typeof PropBetsQuestions;

export const PropBetQuestionKeys = Object.keys(
  PropBetsQuestions,
) as PropBetQuestionKey[];

type PropBetLikeEntry = {
  values?: Partial<Record<PropBetQuestionKey, string>>;
};

export const getActivePropBetKeys = (
  propBets?: PropBetLikeEntry[] | null,
): PropBetQuestionKey[] =>
  PropBetQuestionKeys.filter((key) =>
    (propBets || []).some((entry) => {
      const value = entry.values?.[key];
      return typeof value === "string" && value.trim().length > 0;
    }),
  );
