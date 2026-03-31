import {
  Challenge,
  Elimination,
  Episode,
  GameEvent,
  Player,
} from "../../types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used only in typeof for type derivation
const Players = [
  "David Jelinsky",
  "Jess Chong",
  "Randen Montalvo",
  "Bhanu Gopal",
  "Jem Hussain-Adams",
  "Moriah Gaynor",
  "Tim Spicer",
  "Soda Thompson",
  "Tevin Davis",
  "Hunter McKnight",
  "Tiffany Nicole Ervin",
  "Venus Vafa",
  "Q Burdette",
  "Maria Shrime Gonzalez",
  "Liz Wilcox",
  "Ben Katzman",
  "Charlie Davis",
  "Kenzie Petty",
] as const;

type PlayerName = (typeof Players)[number];

type SeasonNumber = 46;

const buildPlayer = <T extends PlayerName>(
  p: { name: T; img: string } & Partial<
    Omit<Player<T, SeasonNumber>, "season_id" | "season_num" | "name" | "img">
  >,
): Player<T, SeasonNumber> => {
  return {
    ...p,
    season_num: 46,
    season_id: "season_46",
  };
};

export const SEASON_46_PLAYERS = [
  buildPlayer({
    name: "David Jelinsky",
    img: "https://static.wikia.nocookie.net/survivor/images/1/11/S46_jelinsky_t.png",
    description:
      "Age: 24 | Hometown: Las Vegas, Nevada | Occupation: Slot Machine Salesman",
    age: 24,
    profession: "Slot Machine Salesman",
    hometown: "Las Vegas, Nevada",
  }),
  buildPlayer({
    name: "Jess Chong",
    img: "https://static.wikia.nocookie.net/survivor/images/2/2a/S46_jess_t.png",
    description:
      "Age: 40 | Hometown: San Francisco, California | Occupation: Software Engineer",
    age: 40,
    profession: "Software Engineer",
    hometown: "San Francisco, California",
  }),
  buildPlayer({
    name: "Randen Montalvo",
    img: "https://static.wikia.nocookie.net/survivor/images/4/4b/S46_randen_t.png",
    description:
      "Age: 43 | Hometown: Orlando, Florida | Occupation: Aerospace Tech",
    age: 43,
    profession: "Aerospace Tech",
    hometown: "Orlando, Florida",
  }),
  buildPlayer({
    name: "Bhanu Gopal",
    img: "https://static.wikia.nocookie.net/survivor/images/4/4d/S46_bhanu_t.png",
    description:
      "Age: 43 | Hometown: Acton, Massachusetts | Occupation: IT Quality Analyst",
    age: 43,
    profession: "IT Quality Analyst",
    hometown: "Acton, Massachusetts",
  }),
  buildPlayer({
    name: "Jem Hussain-Adams",
    img: "https://static.wikia.nocookie.net/survivor/images/1/14/S46_jem_t.png",
    description:
      "Age: 34 | Hometown: Chicago, Illinois | Occupation: International Brand Mentor",
    age: 34,
    profession: "International Brand Mentor",
    hometown: "Chicago, Illinois",
  }),
  buildPlayer({
    name: "Moriah Gaynor",
    img: "https://static.wikia.nocookie.net/survivor/images/f/f0/S46_moriah_t.png",
    description:
      "Age: 31 | Hometown: San Diego, California | Occupation: Program Coordinator",
    age: 31,
    profession: "Program Coordinator",
    hometown: "San Diego, California",
  }),
  buildPlayer({
    name: "Tim Spicer",
    img: "https://static.wikia.nocookie.net/survivor/images/e/ec/S46_tim_t.png",
    description:
      "Age: 33 | Hometown: Atlanta, Georgia | Occupation: College Coach",
    age: 33,
    profession: "College Coach",
    hometown: "Atlanta, Georgia",
  }),
  buildPlayer({
    name: "Soda Thompson",
    img: "https://static.wikia.nocookie.net/survivor/images/5/58/S46_soda_t.png",
    description:
      "Age: 29 | Hometown: Lake Hopatcong, New Jersey | Occupation: Special Ed Teacher",
    age: 29,
    profession: "Special Ed Teacher",
    hometown: "Lake Hopatcong, New Jersey",
  }),
  buildPlayer({
    name: "Tevin Davis",
    img: "https://static.wikia.nocookie.net/survivor/images/e/e2/S46_tevin_t.png",
    description: "Age: 26 | Hometown: Richmond, Virginia | Occupation: Actor",
    age: 26,
    profession: "Actor",
    hometown: "Richmond, Virginia",
  }),
  buildPlayer({
    name: "Hunter McKnight",
    img: "https://static.wikia.nocookie.net/survivor/images/9/90/S46_hunter_t.png",
    description:
      "Age: 30 | Hometown: French Camp, Mississippi | Occupation: Science Teacher",
    age: 30,
    profession: "Science Teacher",
    hometown: "French Camp, Mississippi",
  }),
  buildPlayer({
    name: "Tiffany Nicole Ervin",
    img: "https://static.wikia.nocookie.net/survivor/images/8/84/S46_tiffany_t.png",
    description:
      "Age: 35 | Hometown: Elizabeth, New Jersey | Occupation: Artist",
    age: 35,
    profession: "Artist",
    hometown: "Elizabeth, New Jersey",
  }),
  buildPlayer({
    name: "Venus Vafa",
    img: "https://static.wikia.nocookie.net/survivor/images/9/9b/S46_venus_t.png",
    description:
      "Age: 27 | Hometown: Toronto, Ontario | Occupation: Data Analyst",
    age: 27,
    profession: "Data Analyst",
    hometown: "Toronto, Ontario",
  }),
  buildPlayer({
    name: "Q Burdette",
    img: "https://static.wikia.nocookie.net/survivor/images/f/f2/S46_q_t.png",
    description:
      "Age: 32 | Hometown: Memphis, Tennessee | Occupation: Real Estate Agent",
    age: 32,
    profession: "Real Estate Agent",
    hometown: "Memphis, Tennessee",
  }),
  buildPlayer({
    name: "Maria Shrime Gonzalez",
    img: "https://static.wikia.nocookie.net/survivor/images/6/65/S46_maria_t.png",
    description: "Age: 50 | Hometown: Dallas, Texas | Occupation: Parent Coach",
    age: 50,
    profession: "Parent Coach",
    hometown: "Dallas, Texas",
  }),
  buildPlayer({
    name: "Liz Wilcox",
    img: "https://static.wikia.nocookie.net/survivor/images/9/93/S46_liz_t.png",
    description:
      "Age: 38 | Hometown: Orlando, Florida | Occupation: Marketing Strategist",
    age: 38,
    profession: "Marketing Strategist",
    hometown: "Orlando, Florida",
  }),
  buildPlayer({
    name: "Ben Katzman",
    img: "https://static.wikia.nocookie.net/survivor/images/3/34/S46_ben_t.png",
    description: "Age: 34 | Hometown: Miami, Florida | Occupation: Musician",
    age: 34,
    profession: "Musician",
    hometown: "Miami, Florida",
  }),
  buildPlayer({
    name: "Charlie Davis",
    img: "https://static.wikia.nocookie.net/survivor/images/5/5a/S46_charlie_t.png",
    description:
      "Age: 28 | Hometown: Boston, Massachusetts | Occupation: Law Student",
    age: 28,
    profession: "Law Student",
    hometown: "Boston, Massachusetts",
  }),
  buildPlayer({
    name: "Kenzie Petty",
    img: "https://static.wikia.nocookie.net/survivor/images/a/aa/S46_kenzie_t.png",
    description:
      "Age: 31 | Hometown: Charlotte, North Carolina | Occupation: Salon Owner",
    age: 31,
    profession: "Salon Owner",
    hometown: "Charlotte, North Carolina",
  }),
] satisfies Player<PlayerName, SeasonNumber>[];

export const SEASON_46_EPISODES = [
  {
    id: "episode_1",
    season_id: "season_46",
    season_num: 46,
    order: 1,
    name: "This Is Where the Legends Are Made",
    post_merge: false,
    finale: false,
    merge_occurs: false,
  },
  {
    id: "episode_2",
    season_id: "season_46",
    season_num: 46,
    order: 2,
    name: "Scorpio Energy",
    post_merge: false,
    finale: false,
    merge_occurs: false,
  },
  {
    id: "episode_3",
    season_id: "season_46",
    season_num: 46,
    order: 3,
    name: "Wackadoodles Win",
    post_merge: false,
    finale: false,
    merge_occurs: false,
  },
  {
    id: "episode_4",
    season_id: "season_46",
    season_num: 46,
    order: 4,
    name: "Don't Touch the Oven",
    post_merge: false,
    finale: false,
    merge_occurs: false,
  },
  {
    id: "episode_5",
    season_id: "season_46",
    season_num: 46,
    order: 5,
    name: "Tiki Man",
    post_merge: false,
    finale: false,
    merge_occurs: false,
  },
  {
    id: "episode_6",
    season_id: "season_46",
    season_num: 46,
    order: 6,
    name: "Cancel Christmas",
    post_merge: false,
    finale: false,
    merge_occurs: true,
  },
  {
    id: "episode_7",
    season_id: "season_46",
    season_num: 46,
    order: 7,
    name: "Episode Several",
    post_merge: true,
    finale: false,
    merge_occurs: false,
  },
  {
    id: "episode_8",
    season_id: "season_46",
    season_num: 46,
    order: 8,
    name: "Hide 'n Seek",
    post_merge: true,
    finale: false,
    merge_occurs: false,
  },
  {
    id: "episode_9",
    season_id: "season_46",
    season_num: 46,
    order: 9,
    name: "Spicy Jeff",
    post_merge: true,
    finale: false,
    merge_occurs: false,
  },
  {
    id: "episode_10",
    season_id: "season_46",
    season_num: 46,
    order: 10,
    name: "Run the Red Light",
    post_merge: true,
    finale: false,
    merge_occurs: false,
  },
  {
    id: "episode_11",
    season_id: "season_46",
    season_num: 46,
    order: 11,
    name: "My Messy, Sweet Little Friend",
    post_merge: true,
    finale: false,
    merge_occurs: false,
  },
  {
    id: "episode_12",
    season_id: "season_46",
    season_num: 46,
    order: 12,
    name: "Mamma Bear",
    post_merge: true,
    finale: false,
    merge_occurs: false,
  },
  {
    id: "episode_13",
    season_id: "season_46",
    season_num: 46,
    order: 13,
    name: "Friends Going to War",
    post_merge: true,
    finale: true,
    merge_occurs: false,
  },
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
