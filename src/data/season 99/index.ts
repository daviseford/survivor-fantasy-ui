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
    season_id: 99,
  };
};

export const SEASON_99_PLAYERS = Players.map((x, i) =>
  buildPlayer(x, i),
) satisfies Player<PlayerName, SeasonNumber>[];

export const SEASON_99_EPISODES = [
  {
    season_id: 99,
    order: 1,
    name: "The First Episode of my Fake Season",
    post_merge: false,
    finale: false,
    merge_occurs: false,
  },
] satisfies Episode<SeasonNumber>[];

export const SEASON_99_CHALLENGES = {
  challenge_1: {
    season_id: 99,
    episode_id: 1,
    variant: "reward",
    order: 1,
    post_merge: false,
    winning_players: [],
  },
} satisfies Record<`challenge_${number}`, Challenge<PlayerName, SeasonNumber>>;

export const SEASON_99_ELIMINATIONS = {
  elimination_1: {
    season_id: 99,
    episode_id: 1,
    order: 1,
    player_name: "Averi Duff",
    votes_received: 5,
    variant: "tribal",
  },
} satisfies Record<
  `elimination_${number}`,
  Elimination<PlayerName, SeasonNumber>
>;

export const SEASON_99_EVENTS = {
  event_1: {
    season_id: 99,
    episode_id: 1,
    player_name: "Addison Dugan",
    action: "find_idol",
  },
  event_2: {
    season_id: 99,
    episode_id: 1,
    player_name: "Addison Dugan",
    action: "votes_negated_by_idol",
    action_value: 3,
  },
} satisfies Record<`event_${number}`, GameEvent<PlayerName, SeasonNumber>>;
