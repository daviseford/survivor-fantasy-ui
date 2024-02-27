import { User } from "firebase/auth";

export type Season = {
  id: `season_${number}`;
  order: number;
  name: string;
  img: string;

  players: Player[];
  episodes: Episode[];
};

export type Episode<SeasonNumber = number> = {
  season_id: SeasonNumber;

  order: number;
  name: string;

  finale: boolean;
  post_merge: boolean;
  merge_occurs: boolean;
};

export type Elimination<PlayerName = string, SeasonNumber = number> = {
  season_id: SeasonNumber;
  episode_id: number;
  player_name: PlayerName;

  order: number;
  variant: "tribal" | "medical" | "final_tribal_council" | "quitter" | "other";
  votes_received?: number;
};

export type Player<PlayerName = string, SeasonNumber = number> = {
  season_id: SeasonNumber;
  name: PlayerName;
  img: string;
};

export type Challenge<PlayerNames = string, SeasonNumber = number> = {
  season_id: SeasonNumber;
  episode_id: number;

  order: number;
  variant: ChallengeWinAction;

  /**
   * List of player names who won
   */
  winning_players: PlayerNames[];

  post_merge: boolean;
};

export type SlimUser = Pick<User, "email" | "uid" | "displayName"> & {
  isAdmin: boolean;
};

export type Draft = {
  id: string;
  season_id: number;
  // creator's uid
  creator: string;
  participants: SlimUser[];
  total_players: number;
  current_pick_number: number;
  current_picker: SlimUser | null;
  /** List of user uids */
  pick_order: SlimUser[];
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

// todo
export type PropBet = {
  id: string;
  season_id: number;
  draft_id: string;
  description: string;
  value: number;
  answers: {
    participant_uid: string;
    answer: string | number;
  }[];
  correct_answer: string | number;
  finished: boolean;
};

export type Competition = {
  id: string;
  season_id: number;
  draft_id: string;
  // creator's uid
  creator: string;
  participant_uids: string[];
  participants: SlimUser[];
  draft_picks: DraftPick[];
  started: boolean;
  current_episode: number | null;
  finished: boolean;
};

export type GameEvent<PlayerName = string, SeasonNumber = number> = {
  id: string
  season_id: SeasonNumber;
  episode_id: number;
  action: GameEventAction;
  multiplier: number | null;
  player_name: PlayerName;
  deleted?: boolean
};

export const ChallengeWinActions = ["reward", "combined", "immunity"] as const;

export type ChallengeWinAction = (typeof ChallengeWinActions)[number];

export const GameEventActions = [
  "find_advantage",
  "find_idol",
  "make_final_tribal_council",
  "use_advantage",
  "use_idol",
  "use_shot_in_the_dark_successfully",
  "use_shot_in_the_dark_unsuccessfully",
  "votes_negated_by_idol",
] as const;

export type GameEventAction = (typeof GameEventActions)[number];

export const GameProgressActions = [
  "eliminated",
  "make_merge",
  "medically_evacuated",
  "quitter",
  "win_survivor",
] as const;

export type GameProgressAction = (typeof GameProgressActions)[number];

export const PlayerActions = [
  ...ChallengeWinActions,
  ...GameEventActions,
  ...GameProgressActions,
] as const;

export type PlayerAction = (typeof PlayerActions)[number];

export type PlayerScoring = {
  action: PlayerAction;
  description?: string;
  multiplier?: boolean;
  fixed_value?: number;
};
