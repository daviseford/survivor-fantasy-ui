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
  id: `episode_${string}`;

  season_id: Season["id"];
  season_num: SeasonNumber;

  order: number;
  name: string;

  finale: boolean;
  post_merge: boolean;
  merge_occurs: boolean;
};

export const EliminationVariants = [
  "final_tribal_council",
  "medical",
  "other",
  "quitter",
  "tribal",
] as const;

export type EliminationVariant = (typeof EliminationVariants)[number];

export type Elimination<PlayerName = string, SeasonNumber = number> = {
  id: `elimination_${string}`;

  season_id: Season["id"];
  season_num: SeasonNumber;

  episode_id: Episode["id"];
  episode_num: number;

  player_name: PlayerName;

  order: number;
  variant: EliminationVariant;
  votes_received?: number;
};

export type Player<PlayerName = string, SeasonNumber = number> = {
  season_id: Season["id"];
  season_num: SeasonNumber;
  name: PlayerName;
  img: string;
  description?: string;
};

export type Challenge<PlayerNames = string, SeasonNumber = number> = {
  id: `challenge_${string}`;

  season_id: Season["id"];
  season_num: SeasonNumber;

  episode_id: Episode["id"];
  episode_num: number;

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
  id: `draft_${string}`;

  season_id: Season["id"];
  season_num: number;

  // creator's uid
  creator_uid: string;
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
  season_id: Season["id"];
  season_num: number;
  order: number;
  user_name: string;
  user_uid: string;
  player_name: string;
};

// todo
export type PropBet = {
  id: `propbet_${string}`;

  season_id: Season["id"];
  season_num: number;
  draft_id: Draft["id"];

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
  id: `competition_${string}`;
  competition_name: string;

  season_id: Season["id"];
  season_num: number;
  draft_id: Draft["id"];

  // creator's uid
  creator_uid: string;
  participant_uids: string[];
  participants: SlimUser[];
  draft_picks: DraftPick[];
  started: boolean;
  current_episode: number | null;
  finished: boolean;
};

export type GameEvent<PlayerName = string, SeasonNumber = number> = {
  id: `event_${string}`;

  season_id: Season["id"];
  season_num: SeasonNumber;

  episode_id: Episode["id"];
  episode_num: number;

  action: GameEventAction;
  multiplier: number | null;
  player_name: PlayerName;
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
