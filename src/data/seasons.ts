import { Season } from "../types";
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
} satisfies Record<`season_${number}`, Season>;
