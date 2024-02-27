import {
  Challenge,
  Elimination,
  Episode,
  GameEvent,
  Player,
} from "../../types";

const Players = [
  "Ben Katzman",
  "Bhanu Gopal",
  "Charlie Davis",
  "David Jelinsky",
  "Hunter McKnight",
  "Jem Hussain-Adams",
  "Jess Chong",
  "Kenzie Petty",
  "Liz Wilcox",
  "Maria Shrime Gonzalez",
  "Moriah Gaynor",
  "Q Burdette",
  "Randen Montalvo",
  "Soda Thompson",
  "Tevin Davis",
  "Tim Spicer",
  "Venus Vafa",
  "Tiffany Nicole Ervin",
] as const;

type PlayerName = (typeof Players)[number];

type SeasonNumber = 46;

const buildPlayer = <T extends PlayerName>(
  name: T,
  img: string,
): Player<T, SeasonNumber> => {
  return {
    name,
    img,
    season_num: 46,
    season_id: "season_46",
  };
};

export const SEASON_46_PLAYERS = [
  buildPlayer(
    "Ben Katzman",
    "https://static.wikia.nocookie.net/survivor/images/3/34/S46_ben_t.png",
  ),
  buildPlayer(
    "Bhanu Gopal",
    "https://static.wikia.nocookie.net/survivor/images/4/4d/S46_bhanu_t.png",
  ),
  buildPlayer(
    "Charlie Davis",
    "https://static.wikia.nocookie.net/survivor/images/5/5a/S46_charlie_t.png",
  ),
  buildPlayer(
    "David Jelinsky",
    "https://static.wikia.nocookie.net/survivor/images/1/11/S46_jelinsky_t.png",
  ),
  buildPlayer(
    "Hunter McKnight",
    "https://static.wikia.nocookie.net/survivor/images/9/90/S46_hunter_t.png",
  ),
  buildPlayer(
    "Jem Hussain-Adams",
    "https://static.wikia.nocookie.net/survivor/images/1/14/S46_jem_t.png",
  ),
  buildPlayer(
    "Jess Chong",
    "https://static.wikia.nocookie.net/survivor/images/2/2a/S46_jess_t.png",
  ),
  buildPlayer(
    "Kenzie Petty",
    "https://static.wikia.nocookie.net/survivor/images/a/aa/S46_kenzie_t.png",
  ),
  buildPlayer(
    "Liz Wilcox",
    "https://static.wikia.nocookie.net/survivor/images/9/93/S46_liz_t.png",
  ),
  buildPlayer(
    "Maria Shrime Gonzalez",
    "https://static.wikia.nocookie.net/survivor/images/6/65/S46_maria_t.png",
  ),
  buildPlayer(
    "Moriah Gaynor",
    "https://static.wikia.nocookie.net/survivor/images/f/f0/S46_moriah_t.png",
  ),
  buildPlayer(
    "Q Burdette",
    "https://static.wikia.nocookie.net/survivor/images/f/f2/S46_q_t.png",
  ),
  buildPlayer(
    "Randen Montalvo",
    "https://static.wikia.nocookie.net/survivor/images/4/4b/S46_randen_t.png",
  ),
  buildPlayer(
    "Soda Thompson",
    "https://static.wikia.nocookie.net/survivor/images/5/58/S46_soda_t.png",
  ),
  buildPlayer(
    "Tevin Davis",
    "https://static.wikia.nocookie.net/survivor/images/e/e2/S46_tevin_t.png",
  ),
  buildPlayer(
    "Tiffany Nicole Ervin",
    "https://static.wikia.nocookie.net/survivor/images/8/84/S46_tiffany_t.png",
  ),
  buildPlayer(
    "Tim Spicer",
    "https://static.wikia.nocookie.net/survivor/images/e/ec/S46_tim_t.png",
  ),
  buildPlayer(
    "Venus Vafa",
    "https://static.wikia.nocookie.net/survivor/images/9/9b/S46_venus_t.png",
  ),
] satisfies Player<PlayerName, SeasonNumber>[];

export const SEASON_46_EPISODES = [
  // {
  //   id: "episode_1",
  //   season_id: "season_46",
  //   season_num: 46,
  //   order: 1,
  //   name: "This Is Where the Legends Are Made",
  //   post_merge: false,
  //   finale: false,
  //   merge_occurs: false,
  // },
  // {
  //   id: "episode_2",
  //   season_id: "season_46",
  //   season_num: 46,
  //   order: 2,
  //   name: "Scorpio Energy",
  //   post_merge: false,
  //   finale: false,
  //   merge_occurs: false,
  // },
  // {
  //   id: "episode_3",
  //   season_id: "season_46",
  //   season_num: 46,
  //   order: 3,
  //   name: "Wackadoodles Win",
  //   post_merge: false,
  //   finale: false,
  //   merge_occurs: false,
  // },
] satisfies Episode<SeasonNumber>[];

export const SEASON_46_CHALLENGES = {
  // challenge_1: {
  //   id: "challenge_1",
  //   season_id: "season_46",
  //   season_num: 46,
  //   episode_id: "episode_1",
  //   episode_num: 1,
  //   variant: "reward",
  //   order: 1,
  //   post_merge: false,
  //   winning_players: ["Pearl Dale", "Shana Held"],
  // },
} satisfies Record<Challenge["id"], Challenge<PlayerName, SeasonNumber>>;

export const SEASON_46_ELIMINATIONS = {
  // elimination_1: {
  //   id: "elimination_1",
  //   season_id: "season_46",
  //   season_num: 46,
  //   episode_id: "episode_1",
  //   episode_num: 1,
  //   order: 1,
  //   player_name: "Averi Duff",
  //   votes_received: 5,
  //   variant: "tribal",
  // },
} satisfies Record<Elimination["id"], Elimination<PlayerName, SeasonNumber>>;

export const SEASON_46_EVENTS = {
  // event_1: {
  //   id: "event_1",
  //   season_id: "season_46",
  //   season_num: 46,
  //   episode_id: "episode_1",
  //   episode_num: 1,
  //   player_name: "Addison Dugan",
  //   action: "find_idol",
  //   multiplier: null,
  // },
} satisfies Record<GameEvent["id"], GameEvent<PlayerName, SeasonNumber>>;