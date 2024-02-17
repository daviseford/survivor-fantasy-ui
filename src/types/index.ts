import { User } from "firebase/auth";

export type Season = {
  id: `season_${number}`;
  order: number;
  name: string;
  img: string;

  players: Player[];
  episodes: Episode[];
};

export type Episode = {
  season_id: number;

  order: number;
  name: string;

  finale: boolean;
  post_merge: boolean;
  merge_occurs: boolean;
};

export type Elimination<T extends string> = {
  season_id: number;
  episode_id: number;
  player_name: T;

  order: number;
  variant: "tribal" | "medical" | "final_tribal_council" | "other";
  votes_received?: number;
};

export type Player<T = string> = {
  season_id: number;
  name: T;
  img: string;
};

export type Challenge<PlayerNames extends string> = {
  season_id: number;
  episode_id: number;

  order: number;
  variant: "reward" | "immunity" | "combined";

  /**
   * List of player names who won
   */
  winning_players: PlayerNames[];

  post_merge: boolean;
};

type DraftUser = Pick<User, "email" | "uid" | "displayName">;

export type Draft = {
  id: string;
  season_id: number;
  participants: DraftUser[];
  total_players: number;
  current_pick_number: number;
  current_picker: DraftUser | null;
  /** List of user uids */
  pick_order: DraftUser[];
  draft_picks: DraftPick[];
  started: boolean;
  finished: boolean;
};

export type DraftPick = {
  season_id: number;
  order: number;
  user_uid: string;
  player_name: string;
};

export type Competitions = {
  id: string;
  season_id: number;
  participants: DraftUser[];
  finished: boolean;
};
