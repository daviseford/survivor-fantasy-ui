export type Season = {
  id: number;
  name: string;
};

export type Episode = {
  season_id: `/seasons/season_${number}`;

  order: number;
  name: string;

  finale: boolean;
  post_merge: boolean;
  merge_occurs: boolean;
};

export type Elimination<T extends string> = {
  season_id: `/seasons/season_${number}`;
  episode_id: string;
  player_name: T;

  order: number;
  variant: "tribal" | "medical" | "final_tribal_council" | "other";
  votes_received?: number;
};

export type Player<T extends string> = {
  season_id: `/seasons/season_${number}`;
  name: T;
  winner: boolean;
};

export type Challenge<PlayerNames extends string> = {
  season_id: `/seasons/season_${number}`;
  episode_id: string;

  order: number;
  variant: "reward" | "immunity" | "combined";

  /**
   * List of player names who won
   */
  winning_players: PlayerNames[];

  post_merge: boolean;
};
