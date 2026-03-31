import {
  Challenge,
  Elimination,
  Episode,
  GameEvent,
  Player,
} from "../../types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used only in typeof for type derivation
const Players = [
  "Jenna Lewis-Dougherty",
  "Kyle Fraser",
  "Savannah Louie",
  'Quintavius "Q" Burdette',
  "Mike White",
  "Angelina Keeley",
  "Charlie Davis",
  "Aubry Bracco",
  "Chrissy Hofbeck",
  "Christian Hubicki",
  "Cirie Fields",
  'Benjamin "Coach" Wade',
  "Colby Donaldson",
  "Dee Valladares",
  "Emily Flippen",
  "Genevieve Mushaluk",
  "Joe Hunter",
  "Jonathan Young",
  "Kamilla Karthigesu",
  "Ozzy Lusth",
  "Rick Devens",
  "Rizo Velovic",
  "Stephenie LaGrossa Kendrick",
  "Tiffany Ervin",
] as const;

type PlayerName = (typeof Players)[number];

type SeasonNumber = 50;

const buildPlayer = <T extends PlayerName>(
  p: { name: T; img: string } & Partial<
    Omit<Player<T, SeasonNumber>, "season_id" | "season_num" | "name" | "img">
  >,
): Player<T, SeasonNumber> => {
  return {
    ...p,
    season_num: 50,
    season_id: "season_50",
  };
};

const IMG = "/images/season_50";

export const SEASON_50_PLAYERS = [
  buildPlayer({
    name: "Jenna Lewis-Dougherty",
    img: `${IMG}/Survivor-50-Cast-Jenna-Lewis-Dougherty.jpg`,
    description:
      "Age: 48 | Hometown: Franklin, New Hampshire | Occupation: Student",
    age: 48,
    profession: "Student",
    hometown: "Franklin, New Hampshire",
    previousSeasons: [1, 8],
  }),
  buildPlayer({
    name: "Kyle Fraser",
    img: `${IMG}/Survivor-50-Cast-Kyle-Fraser.jpg`,
    description:
      "Age: 32 | Hometown: Brooklyn, New York | Occupation: Attorney",
    age: 32,
    profession: "Attorney",
    hometown: "Brooklyn, New York",
    previousSeasons: [48],
  }),
  buildPlayer({
    name: "Savannah Louie",
    img: `${IMG}/Survivor-50-Cast-Savannah-Louie.jpg`,
    description:
      "Age: 32 | Hometown: Atlanta, Georgia | Occupation: Former Reporter",
    age: 32,
    profession: "Former Reporter",
    hometown: "Atlanta, Georgia",
    previousSeasons: [49],
  }),
  buildPlayer({
    name: 'Quintavius "Q" Burdette',
    img: `${IMG}/Survivor-50-Cast-Q-Burdette.jpg`,
    description:
      "Age: 32 | Hometown: Memphis, Tennessee | Occupation: Real Estate Agent",
    age: 32,
    profession: "Real Estate Agent",
    hometown: "Memphis, Tennessee",
    previousSeasons: [46],
  }),
  buildPlayer({
    name: "Mike White",
    img: `${IMG}/Survivor-50-Cast-Mike-White.jpg`,
    description:
      "Age: 55 | Hometown: Los Angeles, California | Occupation: Filmmaker",
    age: 55,
    profession: "Filmmaker",
    hometown: "Los Angeles, California",
    previousSeasons: [37],
  }),
  buildPlayer({
    name: "Angelina Keeley",
    img: `${IMG}/Survivor-50-Cast-Angelina-Keeley.jpg`,
    description:
      "Age: 36 | Hometown: San Clemente, California | Occupation: Financial Consultant",
    age: 36,
    profession: "Financial Consultant",
    hometown: "San Clemente, California",
    previousSeasons: [37],
  }),
  buildPlayer({
    name: "Charlie Davis",
    img: `${IMG}/Survivor-50-Cast-Charlie-Davis.jpg`,
    description:
      "Age: 28 | Hometown: Boston, Massachusetts | Occupation: Law Student",
    age: 28,
    profession: "Law Student",
    hometown: "Boston, Massachusetts",
    previousSeasons: [46],
  }),
  buildPlayer({
    name: "Aubry Bracco",
    img: `${IMG}/Survivor-50-Cast-Aubry-Bracco.jpg`,
    description:
      "Age: 40 | Hometown: Cambridge, Massachusetts | Occupation: Social Media Marketer",
    age: 40,
    profession: "Social Media Marketer",
    hometown: "Cambridge, Massachusetts",
    previousSeasons: [32, 34, 38],
  }),
  buildPlayer({
    name: "Chrissy Hofbeck",
    img: `${IMG}/Survivor-50-Cast-Chrissy-Hofbeck.jpg`,
    description:
      "Age: 55 | Hometown: Lebanon Township, New Jersey | Occupation: Actuary",
    age: 55,
    profession: "Actuary",
    hometown: "Lebanon Township, New Jersey",
    previousSeasons: [35],
  }),
  buildPlayer({
    name: "Christian Hubicki",
    img: `${IMG}/Survivor-50-Cast-Christian-Hubicki.jpg`,
    description:
      "Age: 40 | Hometown: Tallahassee, Florida | Occupation: Robotics Scientist",
    age: 40,
    profession: "Robotics Scientist",
    hometown: "Tallahassee, Florida",
    previousSeasons: [37],
  }),
  buildPlayer({
    name: "Cirie Fields",
    img: `${IMG}/Survivor-50-Cast-Cirie-Fields.jpg`,
    description:
      "Age: 55 | Hometown: Walterboro, South Carolina | Occupation: Nurse",
    age: 55,
    profession: "Nurse",
    hometown: "Walterboro, South Carolina",
    previousSeasons: [12, 16, 20, 34],
  }),
  buildPlayer({
    name: 'Benjamin "Coach" Wade',
    img: `${IMG}/Survivor-50-Cast-Benjamin-Coach-Wade.jpg`,
    description:
      "Age: 54 | Hometown: Bolivar, Missouri | Occupation: Soccer Coach",
    age: 54,
    profession: "Soccer Coach",
    hometown: "Bolivar, Missouri",
    previousSeasons: [18, 20, 23],
  }),
  buildPlayer({
    name: "Colby Donaldson",
    img: `${IMG}/Survivor-50-Cast-Colby-Donaldson.jpg`,
    description:
      "Age: 51 | Hometown: Dallas, Texas | Occupation: Auto Customizer",
    age: 51,
    profession: "Auto Customizer",
    hometown: "Dallas, Texas",
    previousSeasons: [2, 8, 20],
  }),
  buildPlayer({
    name: "Dee Valladares",
    img: `${IMG}/Survivor-50-Cast-Dee-Valladres.jpg`,
    description:
      "Age: 29 | Hometown: Miami, Florida | Occupation: Entrepreneur",
    age: 29,
    profession: "Entrepreneur",
    hometown: "Miami, Florida",
    previousSeasons: [45],
  }),
  buildPlayer({
    name: "Emily Flippen",
    img: `${IMG}/Survivor-50-Cast-Emily-Flippen.jpg`,
    description:
      "Age: 31 | Hometown: Laurel, Maryland | Occupation: Investment Analyst",
    age: 31,
    profession: "Investment Analyst",
    hometown: "Laurel, Maryland",
    previousSeasons: [45],
  }),
  buildPlayer({
    name: "Genevieve Mushaluk",
    img: `${IMG}/Survivor-50-Cast-Genevieve-Mushaluk.jpg`,
    description:
      "Age: 34 | Hometown: Winnipeg, Manitoba | Occupation: Corporate Lawyer",
    age: 34,
    profession: "Corporate Lawyer",
    hometown: "Winnipeg, Manitoba",
    previousSeasons: [47],
  }),
  buildPlayer({
    name: "Joe Hunter",
    img: `${IMG}/Survivor-50-Cast-Joe-Hunter.jpg`,
    description:
      "Age: 46 | Hometown: West Sacramento, California | Occupation: Fire Captain",
    age: 46,
    profession: "Fire Captain",
    hometown: "West Sacramento, California",
    previousSeasons: [48],
  }),
  buildPlayer({
    name: "Jonathan Young",
    img: `${IMG}/Survivor-50-Cast-Jonathan-Young.jpg`,
    description:
      "Age: 33 | Hometown: Gulf Shores, Alabama | Occupation: Beach Service Company Owner",
    age: 33,
    profession: "Beach Service Company Owner",
    hometown: "Gulf Shores, Alabama",
    previousSeasons: [42],
  }),
  buildPlayer({
    name: "Kamilla Karthigesu",
    img: `${IMG}/Survivor-50-Cast-Kamilla-Karthigesu.jpg`,
    description:
      "Age: 32 | Hometown: Foster City, California | Occupation: Software Engineer",
    age: 32,
    profession: "Software Engineer",
    hometown: "Foster City, California",
    previousSeasons: [48],
  }),
  buildPlayer({
    name: "Ozzy Lusth",
    img: `${IMG}/Survivor-50-Cast-Ozzy-Lusth.jpg`,
    description: "Age: 44 | Hometown: Venice, California | Occupation: Waiter",
    age: 44,
    profession: "Waiter",
    hometown: "Venice, California",
    previousSeasons: [13, 16, 23, 34],
  }),
  buildPlayer({
    name: "Rick Devens",
    img: `${IMG}/Survivor-50-Cast-Rick-Devens.jpg`,
    description: "Age: 41 | Hometown: Macon, Georgia | Occupation: News Anchor",
    age: 41,
    profession: "News Anchor",
    hometown: "Macon, Georgia",
    previousSeasons: [38],
  }),
  buildPlayer({
    name: "Rizo Velovic",
    img: `${IMG}/Survivor-50-Cast-Rizo-Velovic.jpg`,
    description:
      "Age: 26 | Hometown: Yonkers, New York | Occupation: Tech Sales",
    age: 26,
    profession: "Tech Sales",
    hometown: "Yonkers, New York",
    previousSeasons: [49],
  }),
  buildPlayer({
    name: "Stephenie LaGrossa Kendrick",
    img: `${IMG}/Survivor-50-Cast-Stephenie-Lagrossa-Kendrick.jpg`,
    description:
      "Age: 46 | Hometown: Toms River, New Jersey | Occupation: Pharmaceutical Sales Representative",
    age: 46,
    profession: "Pharmaceutical Sales Representative",
    hometown: "Toms River, New Jersey",
    previousSeasons: [10, 11, 20],
  }),
  buildPlayer({
    name: "Tiffany Ervin",
    img: `${IMG}/Survivor-50-Cast-Tiffany-Ervin.jpg`,
    description:
      "Age: 35 | Hometown: Elizabeth, New Jersey | Occupation: Artist",
    age: 35,
    profession: "Artist",
    hometown: "Elizabeth, New Jersey",
    previousSeasons: [46],
  }),
] satisfies Player<PlayerName, SeasonNumber>[];

export const SEASON_50_EPISODES = [] satisfies Episode<SeasonNumber>[];

export const SEASON_50_CHALLENGES = {} satisfies Record<
  Challenge["id"],
  Challenge<PlayerName, SeasonNumber>
>;

export const SEASON_50_ELIMINATIONS = {} satisfies Record<
  Elimination["id"],
  Elimination<PlayerName, SeasonNumber>
>;

export const SEASON_50_EVENTS = {} satisfies Record<
  GameEvent["id"],
  GameEvent<PlayerName, SeasonNumber>
>;
