import { Season } from "../types";
import { SEASON_99_EPISODES, SEASON_99_PLAYERS } from "./season 99";
import { SEASON_9_EPISODES, SEASON_9_PLAYERS } from "./season_9";

export const SEASONS = {
  season_9: {
    id: "season_9",
    order: 9,
    name: "Vanuatu",
    img: "https://static.wikia.nocookie.net/survivor/images/d/d0/Vanuatu_Logo_Recreation.png",

    players: SEASON_9_PLAYERS,
    episodes: SEASON_9_EPISODES,
  },

  // Fake season for testing
  season_99: {
    id: "season_99",
    order: 99,
    name: "Centennial",
    img: "https://ssl.cdn-redfin.com/photo/94/bigphoto/825/5005825_1.jpg",

    players: SEASON_99_PLAYERS,
    episodes: SEASON_99_EPISODES,
  },
} satisfies Record<`season_${number}`, Season>;
