import { User } from "firebase/auth";
import { PropBetQuestionKey } from "../data/propbets";

export type CastawayId = `US${string}`;

export type CastawayLookup = Record<
  CastawayId,
  { full_name: string; castaway: string }
>;

export type Season = {
  id: `season_${number}`;
  order: number;
  name: string;
  img: string;
  players: Player[];
  episodes: Episode[];
  castawayLookup: CastawayLookup;
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

export type Elimination<
  Id extends CastawayId = CastawayId,
  SeasonNumber = number,
> = {
  id: `elimination_${string}`;

  season_id: Season["id"];
  season_num: SeasonNumber;

  episode_id: Episode["id"];
  episode_num: number;

  castaway_id: Id;

  order: number;
  variant: EliminationVariant;
  votes_received?: number;
};

export type Player<
  Id extends CastawayId = CastawayId,
  SeasonNumber = number,
> = {
  season_id: Season["id"];
  season_num: SeasonNumber;
  castaway_id: Id;
  full_name: string;
  img: string;
  description?: string;
  age?: number;
  profession?: string;
  hometown?: string;
  previousSeasons?: number[];
  bio?: string;
  nickname?: string;
};

export type Team = {
  id: `team_${string}`;
  season_id: Season["id"];
  season_num: number;
  name: string;
  color: string;
};

/**
 * A snapshot of player-to-team assignments for a single episode.
 * Keys are castaway IDs, values are team IDs or null (no team).
 */
export type TeamAssignmentSnapshot = Record<CastawayId, Team["id"] | null>;

/**
 * All team assignment snapshots for a season.
 * Keys are episode numbers (as strings, since Firestore keys are strings).
 */
export type TeamAssignments = Record<string, TeamAssignmentSnapshot>;

export type Challenge<
  Id extends CastawayId = CastawayId,
  SeasonNumber = number,
> = {
  id: `challenge_${string}`;

  season_id: Season["id"];
  season_num: SeasonNumber;

  episode_id: Episode["id"];
  episode_num: number;

  order: number;
  variant: ChallengeWinAction;

  /**
   * List of castaway IDs who won
   */
  winning_castaways: Id[];

  /**
   * Optional: the team that won this challenge.
   * Audit/display metadata only -- winning_castaways is the scoring source of truth.
   */
  winning_team_id?: Team["id"] | null;
};

export type SlimUser = Pick<User, "email" | "uid" | "displayName"> & {
  isAdmin: boolean;
};

export type Draft = {
  id: `draft_${string}`;

  season_id: Season["id"];
  season_num: number;

  competiton_id: Competition["id"];

  // creator's uid
  creator_uid: string;
  participants: SlimUser[];
  total_players: number;
  current_pick_number: number;
  current_picker: SlimUser | null;
  /** List of user uids */
  pick_order: SlimUser[];
  draft_picks: DraftPick[];

  prop_bets: PropBetsEntry[];

  started: boolean;
  finished: boolean;
};

export type PropBetsEntry = {
  id: `propbet_${string}`;
  user_name: string;
  user_uid: string;
  values: PropBetsFormData;
};

export type PropBetsFormData = Partial<Record<PropBetQuestionKey, string>>;

export type DraftPick = {
  season_id: Season["id"];
  season_num: number;
  order: number;
  user_name: string;
  user_uid: string;
  castaway_id: CastawayId;
  player_name: string;
};

export type PropBet = {
  id: `propbet_${string}`;

  season_id: Season["id"];
  season_num: number;
  draft_id: Draft["id"];

  description: string;
  point_value: number;
  answers: {
    participant_uid: string;
    answer: string;
  }[];
  correct_answer: string;
  finished: boolean;
};

export type Competition = {
  id: `competition_${string}`;
  competition_name: string;

  season_id: Season["id"];
  season_num: number;
  draft_id: Draft["id"];

  creator_uid: string;
  participant_uids: string[];
  participants: SlimUser[];

  draft_picks: DraftPick[];
  /**
   * legacy drafts don't have prop_bets, remove this ? after Season 46 probably
   */
  prop_bets?: PropBetsEntry[];

  current_episode: number | null;
  finished: boolean;
};

export type GameEvent<
  Id extends CastawayId = CastawayId,
  SeasonNumber = number,
> = {
  id: `event_${string}`;

  season_id: Season["id"];
  season_num: SeasonNumber;

  episode_id: Episode["id"];
  episode_num: number;

  action: GameEventAction;
  multiplier: number | null;
  castaway_id: Id;
};

export const ChallengeWinActions = [
  "reward",
  "team_reward",
  "immunity",
  "team_immunity",
] as const;

export type ChallengeWinAction = (typeof ChallengeWinActions)[number];

export const GameEventActions = [
  "accept_beware_advantage",
  "find_amulet",
  "find_bank_your_vote",
  "find_beware_advantage",
  "find_block_a_vote",
  "find_challenge_advantage",
  "find_control_the_vote",
  "find_extra_vote",
  "find_idol",
  "find_idol_nullifier",
  "find_knowledge_is_power",
  "find_other_advantage",
  "find_safety_without_power",
  "find_steal_a_vote",
  "fulfill_beware_advantage",
  "go_on_journey",
  "make_final_tribal_council",
  "make_merge",
  "use_amulet",
  "use_bank_your_vote",
  "use_block_a_vote",
  "use_challenge_advantage",
  "use_control_the_vote",
  "use_extra_vote",
  "use_idol",
  "use_idol_nullifier",
  "use_knowledge_is_power",
  "use_other_advantage",
  "use_safety_without_power",
  "use_shot_in_the_dark_successfully",
  "use_shot_in_the_dark_unsuccessfully",
  "use_steal_a_vote",
  "voted_out_with_advantage",
  "voted_out_with_idol",
  "votes_negated_by_idol",
  "win_block_a_vote",
  "win_extra_vote",
  "win_idol",
  "win_other_advantage",
  "win_steal_a_vote",
  "win_survivor",
] as const;

export type GameEventAction = (typeof GameEventActions)[number];

export const GameProgressActions = [
  "eliminated",
  "medically_evacuated",
  "quitter",
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
  description: string;
  multiplier?: boolean;
  fixed_value?: number;
};
