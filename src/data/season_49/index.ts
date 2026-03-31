import {
  Challenge,
  Elimination,
  Episode,
  GameEvent,
  Player,
} from "../../types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used only in typeof for type derivation
const Players = [
  "Nicole Mazullo",
  "Annie Davis",
  "Jake Latimer",
  "Jeremiah Ing",
  "Matt Williams",
  "Jason Treul",
  "Nate Moore",
  "MC Chukwujekwu",
  "Alex Moore",
  "Jawan Pitts",
  "Sophie Segreti",
  "Steven Ramm",
  "Kristina Mills",
  "Rizo Velovic",
  "Sage Ahrens-Nichols",
  "Sophi Balerdi",
  "Savannah Louie",
] as const;

type PlayerName = (typeof Players)[number];

type SeasonNumber = 49;

const buildPlayer = <T extends PlayerName>(
  p: { name: T; img: string } & Partial<
    Omit<Player<T, SeasonNumber>, "season_id" | "season_num" | "name" | "img">
  >,
): Player<T, SeasonNumber> => {
  return {
    ...p,
    season_num: 49,
    season_id: "season_49",
  };
};

export const SEASON_49_PLAYERS = [
  buildPlayer({
    name: "Nicole Mazullo",
    img: "",
    description: "Age: 26 | Hometown: Philadelphia, PA | Occupation: Financial Crime Consultant",
    age: 26,
    profession: "Financial Crime Consultant",
    hometown: "Philadelphia, PA",
  }),
  buildPlayer({
    name: "Annie Davis",
    img: "",
    description: "Age: 50 | Hometown: Austin, Texas | Occupation: Musician",
    age: 50,
    profession: "Musician",
    hometown: "Austin, Texas",
  }),
  buildPlayer({
    name: "Jake Latimer",
    img: "",
    description: "Age: 36 | Hometown: St. Albert, Alberta | Occupation: Correctional Officer",
    age: 36,
    profession: "Correctional Officer",
    hometown: "St. Albert, Alberta",
  }),
  buildPlayer({
    name: "Jeremiah Ing",
    img: "",
    description: "Age: 39 | Hometown: Toronto, Ontario | Occupation: Global Events Manager",
    age: 39,
    profession: "Global Events Manager",
    hometown: "Toronto, Ontario",
  }),
  buildPlayer({
    name: "Matt Williams",
    img: "",
    description: "Age: 53 | Hometown: St. George, Utah | Occupation: Airport Ramp Agent",
    age: 53,
    profession: "Airport Ramp Agent",
    hometown: "St. George, Utah",
  }),
  buildPlayer({
    name: "Jason Treul",
    img: "",
    description: "Age: 33 | Hometown: Santa Ana, California | Occupation: Law Clerk",
    age: 33,
    profession: "Law Clerk",
    hometown: "Santa Ana, California",
  }),
  buildPlayer({
    name: "Nate Moore",
    img: "",
    description: "Age: 47 | Hometown: Hermosa Beach, California | Occupation: Film Producer",
    age: 47,
    profession: "Film Producer",
    hometown: "Hermosa Beach, California",
  }),
  buildPlayer({
    name: "MC Chukwujekwu",
    img: "",
    description: "Age: 30 | Hometown: San Diego, California | Occupation: Fitness Trainer",
    age: 30,
    profession: "Fitness Trainer",
    hometown: "San Diego, California",
  }),
  buildPlayer({
    name: "Alex Moore",
    img: "",
    description: "Age: 27 | Hometown: Washington, District of Columbia | Occupation: Political Communications Director",
    age: 27,
    profession: "Political Communications Director",
    hometown: "Washington, District of Columbia",
  }),
  buildPlayer({
    name: "Jawan Pitts",
    img: "",
    description: "Age: 28 | Hometown: Los Angeles, California | Occupation: Video Editor",
    age: 28,
    profession: "Video Editor",
    hometown: "Los Angeles, California",
  }),
  buildPlayer({
    name: "Sophie Segreti",
    img: "",
    description: "Age: 32 | Hometown: New York, New York | Occupation: Strategy Associate",
    age: 32,
    profession: "Strategy Associate",
    hometown: "New York, New York",
  }),
  buildPlayer({
    name: "Steven Ramm",
    img: "",
    description: "Age: 36 | Hometown: Denver, Colorado | Occupation: Rocket Scientist",
    age: 36,
    profession: "Rocket Scientist",
    hometown: "Denver, Colorado",
  }),
  buildPlayer({
    name: "Kristina Mills",
    img: "",
    description: "Age: 36 | Hometown: Edmond, Oklahoma | Occupation: MBA Career Coach",
    age: 36,
    profession: "MBA Career Coach",
    hometown: "Edmond, Oklahoma",
  }),
  buildPlayer({
    name: "Rizo Velovic",
    img: "",
    description: "Age: 26 | Hometown: Yonkers, New York | Occupation: Tech Sales",
    age: 26,
    profession: "Tech Sales",
    hometown: "Yonkers, New York",
  }),
  buildPlayer({
    name: "Sage Ahrens-Nichols",
    img: "",
    description: "Age: 31 | Hometown: Olympia, Washington | Occupation: Clinical Social Worker",
    age: 31,
    profession: "Clinical Social Worker",
    hometown: "Olympia, Washington",
  }),
  buildPlayer({
    name: "Sophi Balerdi",
    img: "",
    description: "Age: 28 | Hometown: Miami, Florida | Occupation: Entrepreneur",
    age: 28,
    profession: "Entrepreneur",
    hometown: "Miami, Florida",
  }),
  buildPlayer({
    name: "Savannah Louie",
    img: "",
    description: "Age: 32 | Hometown: Atlanta, Georgia | Occupation: Former Reporter",
    age: 32,
    profession: "Former Reporter",
    hometown: "Atlanta, Georgia",
  }),
] satisfies Player<PlayerName, SeasonNumber>[];

export const SEASON_49_EPISODES = [] satisfies Episode<SeasonNumber>[];

export const SEASON_49_CHALLENGES = {} satisfies Record<
  Challenge["id"],
  Challenge<PlayerName, SeasonNumber>
>;

export const SEASON_49_ELIMINATIONS = {} satisfies Record<
  Elimination["id"],
  Elimination<PlayerName, SeasonNumber>
>;

export const SEASON_49_EVENTS = {} satisfies Record<
  GameEvent["id"],
  GameEvent<PlayerName, SeasonNumber>
>;
