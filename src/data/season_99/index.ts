import {
  Challenge,
  Elimination,
  Episode,
  GameEvent,
  Player,
} from "../../types";

const Players = [
  "Kiley Halverson",
  "Braden Paquette",
  "Pearl Dale",
  "Averi Duff",
  "Terrell Brown",
  "Shana Held",
  "Elana Donahue",
  "Sidney Andrade",
  "Nallely Riggs",
  "Mira McFarland",
  "Jordy Blackburn",
  "Ronald Hawks",
  "Addison Dugan",
  "Caden Tharp",
  "Ramon Neville",
  "Misael Paxton",
  "Dylan Sexton",
  "Annika Carey",
] as const;

type PlayerName = (typeof Players)[number];

type SeasonNumber = 99;

const buildPlayer = <T extends PlayerName>(
  name: T,
  img: number,
): Player<T, SeasonNumber> => {
  return {
    name,
    img: "https://i.pravatar.cc/150?img=" + img,
    season_num: 99,
    season_id: "season_99",
  };
};

export const SEASON_99_PLAYERS = Players.map((x, i) =>
  buildPlayer(x, i),
) satisfies Player<PlayerName, SeasonNumber>[];

export const SEASON_99_EPISODES = [
  {
    id: "episode_1",
    season_id: "season_99",
    season_num: 99,
    order: 1,
    name: "The First Episode of my Fake Season",
    post_merge: false,
    finale: false,
    merge_occurs: false,
  },
  {
    id: "episode_2",
    season_id: "season_99",
    season_num: 99,
    order: 2,
    name: "The Second Episode",
    post_merge: false,
    finale: false,
    merge_occurs: false,
  },
  {
    id: "episode_3",
    season_id: "season_99",
    season_num: 99,
    order: 3,
    name: "The Merge Episode",
    post_merge: false,
    finale: false,
    merge_occurs: true,
  },
  {
    id: "episode_4",
    season_id: "season_99",
    season_num: 99,
    order: 4,
    name: "The Fourrrrrth Episode",
    post_merge: true,
    finale: false,
    merge_occurs: false,
  },
  {
    id: "episode_5",
    season_id: "season_99",
    season_num: 99,
    order: 5,
    name: "The Finale",
    post_merge: true,
    finale: true,
    merge_occurs: false,
  },
] satisfies Episode<SeasonNumber>[];

export const SEASON_99_CHALLENGES = {
  // challenge_1: {
  //   id: "challenge_1",
  //   season_id: "season_99",
  //   season_num: 99,
  //   episode_id: "episode_1",
  //   episode_num: 1,
  //   variant: "reward",
  //   order: 1,
  //   post_merge: false,
  //   winning_players: ["Pearl Dale", "Shana Held"],
  // },
  // challenge_2: {
  //   id: "challenge_2",
  //   season_id: "season_99",
  //   season_num: 99,
  //   episode_id: "episode_1",
  //   episode_num: 1,
  //   variant: "immunity",
  //   order: 1,
  //   post_merge: false,
  //   winning_players: ["Caden Tharp"],
  // },
} satisfies Record<Challenge["id"], Challenge<PlayerName, SeasonNumber>>;

export const SEASON_99_ELIMINATIONS = {
  // elimination_1: {
  //   id: "elimination_1",
  //   season_id: "season_99",
  //   season_num: 99,
  //   episode_id: "episode_1",
  //   episode_num: 1,
  //   order: 1,
  //   player_name: "Averi Duff",
  //   votes_received: 5,
  //   variant: "tribal",
  // },
} satisfies Record<Elimination["id"], Elimination<PlayerName, SeasonNumber>>;

export const SEASON_99_EVENTS = {
  // event_1: {
  //   id: "event_1",
  //   season_id: "season_99",
  //   season_num: 99,
  //   episode_id: "episode_1",
  //   episode_num: 1,
  //   player_name: "Addison Dugan",
  //   action: "find_idol",
  //   multiplier: null,
  // },
  // event_2: {
  //   id: "event_2",
  //   season_id: "season_99",
  //   season_num: 99,
  //   episode_id: "episode_1",
  //   episode_num: 1,
  //   player_name: "Ramon Neville",
  //   action: "votes_negated_by_idol",
  //   multiplier: 3,
  // },
} satisfies Record<GameEvent["id"], GameEvent<PlayerName, SeasonNumber>>;
