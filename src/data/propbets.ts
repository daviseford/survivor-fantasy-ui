export const PropBetsQuestions = {
  propbet_winner: {
    id: "propbet_winner",
    point_value: 20,
    description: "Who will win Survivor?",
  },
  propbet_idols: {
    id: "propbet_idols",
    point_value: 7,
    description: "Who will find the most idols?",
  },
  propbet_immunities: {
    id: "propbet_immunities",
    point_value: 7,
    description: "Who will win the most immunity challenges?",
  },
  propbet_ftc: {
    id: "propbet_ftc",
    point_value: 13,
    description: "Pick one player who will make Final Tribal Council",
  },
  propbet_first_vote: {
    id: "propbet_first_vote",
    point_value: 9,
    description: "Who will be voted out first?",
  },
  propbet_medical_evac: {
    id: "propbet_medical_evac",
    point_value: 4,
    description: "Will there be a medical evacuation this season?",
  },
} satisfies Record<`propbet_${string}`, PropBetQuestionObj>;

export type PropBetQuestionObj = {
  id: `propbet_${string}`;
  point_value: number;
  description: string;
};
