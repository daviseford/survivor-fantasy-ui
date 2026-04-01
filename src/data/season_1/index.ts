import {
  Challenge,
  Elimination,
  Episode,
  GameEvent,
  Player,
} from "../../types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used only in typeof for type derivation
const Players = [
  "Sonja Christopher",
  "B.B. Andersen",
  "Stacey Stillman",
  "Ramona Gray",
  "Dirk Been",
  "Joel Klug",
  "Gretchen Cordy",
  "Greg Buis",
  "Jenna Lewis",
  "Gervase Peterson",
  "Colleen Haskell",
  "Sean Kenniff",
  "Susan Hawk",
  "Rudy Boesch",
  "Kelly Wiglesworth",
  "Richard Hatch",
] as const;

type PlayerName = (typeof Players)[number];

type SeasonNumber = 1;

const buildPlayer = <T extends PlayerName>(
  p: { name: T; img: string } & Partial<
    Omit<Player<T, SeasonNumber>, "season_id" | "season_num" | "name" | "img">
  >,
): Player<T, SeasonNumber> => {
  return {
    ...p,
    season_num: 1,
    season_id: "season_1",
  };
};

export const SEASON_1_PLAYERS = [
  buildPlayer({
    name: "Sonja Christopher",
    img: "",
    description:
      "Age: 63 | Hometown: Walnut Creek, California | Occupation: Musician",
    age: 63,
    profession: "Musician",
    hometown: "Walnut Creek, California",
  }),
  buildPlayer({
    name: "B.B. Andersen",
    img: "",
    description:
      "Age: 64 | Hometown: Mission Hills, Kansas | Occupation: Real Estate Developer",
    age: 64,
    profession: "Real Estate Developer",
    hometown: "Mission Hills, Kansas",
  }),
  buildPlayer({
    name: "Stacey Stillman",
    img: "",
    description:
      "Age: 53 | Hometown: San Francisco, California | Occupation: Attorney",
    age: 53,
    profession: "Attorney",
    hometown: "San Francisco, California",
  }),
  buildPlayer({
    name: "Ramona Gray",
    img: "",
    description:
      "Age: 55 | Hometown: Edison, New Jersey | Occupation: Biochemist",
    age: 55,
    profession: "Biochemist",
    hometown: "Edison, New Jersey",
  }),
  buildPlayer({
    name: "Dirk Been",
    img: "",
    description:
      "Age: 49 | Hometown: Spring Green, Wisconsin | Occupation: Dairy Farmer",
    age: 49,
    profession: "Dairy Farmer",
    hometown: "Spring Green, Wisconsin",
  }),
  buildPlayer({
    name: "Joel Klug",
    img: "",
    description:
      "Age: 53 | Hometown: Sherwood, Arkansas | Occupation: Health Club Consultant",
    age: 53,
    profession: "Health Club Consultant",
    hometown: "Sherwood, Arkansas",
  }),
  buildPlayer({
    name: "Gretchen Cordy",
    img: "",
    description:
      "Age: 64 | Hometown: Clarksville, Tennessee | Occupation: Teacher",
    age: 64,
    profession: "Teacher",
    hometown: "Clarksville, Tennessee",
  }),
  buildPlayer({
    name: "Greg Buis",
    img: "",
    description:
      "Age: 50 | Hometown: Gold Hill, Colorado | Occupation: Ivy League Graduate",
    age: 50,
    profession: "Ivy League Graduate",
    hometown: "Gold Hill, Colorado",
  }),
  buildPlayer({
    name: "Jenna Lewis",
    img: "",
    description:
      "Age: 48 | Hometown: Franklin, New Hampshire | Occupation: Student",
    age: 48,
    profession: "Student",
    hometown: "Franklin, New Hampshire",
  }),
  buildPlayer({
    name: "Gervase Peterson",
    img: "",
    description:
      "Age: 56 | Hometown: Willingboro, New Jersey | Occupation: YMCA Basketball Coach",
    age: 56,
    profession: "YMCA Basketball Coach",
    hometown: "Willingboro, New Jersey",
  }),
  buildPlayer({
    name: "Colleen Haskell",
    img: "",
    description:
      "Age: 49 | Hometown: Miami Beach, Florida | Occupation: Student",
    age: 49,
    profession: "Student",
    hometown: "Miami Beach, Florida",
  }),
  buildPlayer({
    name: "Sean Kenniff",
    img: "",
    description:
      "Age: 56 | Hometown: Carle Place, New York | Occupation: Doctor",
    age: 56,
    profession: "Doctor",
    hometown: "Carle Place, New York",
  }),
  buildPlayer({
    name: "Susan Hawk",
    img: "",
    description:
      "Age: 64 | Hometown: Palmyra, Wisconsin | Occupation: Truck Driver",
    age: 64,
    profession: "Truck Driver",
    hometown: "Palmyra, Wisconsin",
  }),
  buildPlayer({
    name: "Rudy Boesch",
    img: "",
    description:
      "Age: 72 | Hometown: Virginia Beach, Virginia | Occupation: Retired Navy SEAL",
    age: 72,
    profession: "Retired Navy SEAL",
    hometown: "Virginia Beach, Virginia",
  }),
  buildPlayer({
    name: "Kelly Wiglesworth",
    img: "",
    description:
      "Age: 48 | Hometown: Kernville, California | Occupation: River Guide",
    age: 48,
    profession: "River Guide",
    hometown: "Kernville, California",
  }),
  buildPlayer({
    name: "Richard Hatch",
    img: "",
    description:
      "Age: 64 | Hometown: Newport, Rhode Island | Occupation: Corporate Trainer",
    age: 64,
    profession: "Corporate Trainer",
    hometown: "Newport, Rhode Island",
  }),
] satisfies Player<PlayerName, SeasonNumber>[];

export const SEASON_1_EPISODES = [] satisfies Episode<SeasonNumber>[];

export const SEASON_1_CHALLENGES = {} satisfies Record<
  Challenge["id"],
  Challenge<PlayerName, SeasonNumber>
>;

export const SEASON_1_ELIMINATIONS = {} satisfies Record<
  Elimination["id"],
  Elimination<PlayerName, SeasonNumber>
>;

export const SEASON_1_EVENTS = {} satisfies Record<
  GameEvent["id"],
  GameEvent<PlayerName, SeasonNumber>
>;
