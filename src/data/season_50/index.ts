import {
  Challenge,
  Elimination,
  Episode,
  GameEvent,
  Player,
} from "../../types";

const Players = [
  "Jenna Lewis-Dougherty",
  "Colby Donaldson",
  "Stephenie LaGrossa Kendrick",
  "Cirie Fields",
  "Ozzy Lusth",
  'Benjamin "Coach" Wade',
  "Aubry Bracco",
  "Chrissy Hofbeck",
  "Christian Hubicki",
  "Angelina Keeley",
  "Mike White",
  "Rick Devens",
  "Jonathan Young",
  "Emily Flippen",
  "Dee Valladares",
  'Quintavius "Q" Burdette',
  "Charlie Davis",
  "Tiffany Ervin",
  "Genevieve Mushaluk",
  "Kyle Fraser",
  "Joe Hunter",
  "Kamilla Karthigesu",
  "Savannah Louie",
  "Rizo Velovic",
] as const;

type PlayerName = (typeof Players)[number];

type SeasonNumber = 50;

const buildPlayer = <T extends PlayerName>(
  name: T,
  img: string,
): Player<T, SeasonNumber> => {
  return {
    name,
    img,
    season_num: 50,
    season_id: "season_50",
  };
};

const IMG = "/images/season_50";

export const SEASON_50_PLAYERS = [
  buildPlayer("Jenna Lewis-Dougherty", `${IMG}/Survivor-50-Cast-Jenna-Lewis-Dougherty.jpg`),
  buildPlayer("Colby Donaldson", `${IMG}/Survivor-50-Cast-Colby-Donaldson.jpg`),
  buildPlayer("Stephenie LaGrossa Kendrick", `${IMG}/Survivor-50-Cast-Stephenie-Lagrossa-Kendrick.jpg`),
  buildPlayer("Cirie Fields", `${IMG}/Survivor-50-Cast-Cirie-Fields.jpg`),
  buildPlayer("Ozzy Lusth", `${IMG}/Survivor-50-Cast-Ozzy-Lusth.jpg`),
  buildPlayer('Benjamin "Coach" Wade', `${IMG}/Survivor-50-Cast-Benjamin-Coach-Wade.jpg`),
  buildPlayer("Aubry Bracco", `${IMG}/Survivor-50-Cast-Aubry-Bracco.jpg`),
  buildPlayer("Chrissy Hofbeck", `${IMG}/Survivor-50-Cast-Chrissy-Hofbeck.jpg`),
  buildPlayer("Christian Hubicki", `${IMG}/Survivor-50-Cast-Christian-Hubicki.jpg`),
  buildPlayer("Angelina Keeley", `${IMG}/Survivor-50-Cast-Angelina-Keeley.jpg`),
  buildPlayer("Mike White", `${IMG}/Survivor-50-Cast-Mike-White.jpg`),
  buildPlayer("Rick Devens", `${IMG}/Survivor-50-Cast-Rick-Devens.jpg`),
  buildPlayer("Jonathan Young", `${IMG}/Survivor-50-Cast-Jonathan-Young.jpg`),
  buildPlayer("Emily Flippen", `${IMG}/Survivor-50-Cast-Emily-Flippen.jpg`),
  buildPlayer("Dee Valladares", `${IMG}/Survivor-50-Cast-Dee-Valladres.jpg`),
  buildPlayer('Quintavius "Q" Burdette', `${IMG}/Survivor-50-Cast-Q-Burdette.jpg`),
  buildPlayer("Charlie Davis", `${IMG}/Survivor-50-Cast-Charlie-Davis.jpg`),
  buildPlayer("Tiffany Ervin", `${IMG}/Survivor-50-Cast-Tiffany-Ervin.jpg`),
  buildPlayer("Genevieve Mushaluk", `${IMG}/Survivor-50-Cast-Genevieve-Mushaluk.jpg`),
  buildPlayer("Kyle Fraser", `${IMG}/Survivor-50-Cast-Kyle-Fraser.jpg`),
  buildPlayer("Joe Hunter", `${IMG}/Survivor-50-Cast-Joe-Hunter.jpg`),
  buildPlayer("Kamilla Karthigesu", `${IMG}/Survivor-50-Cast-Kamilla-Karthigesu.jpg`),
  buildPlayer("Savannah Louie", `${IMG}/Survivor-50-Cast-Savannah-Louie.jpg`),
  buildPlayer("Rizo Velovic", `${IMG}/Survivor-50-Cast-Rizo-Velovic.jpg`),
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
