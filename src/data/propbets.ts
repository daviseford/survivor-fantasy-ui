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
