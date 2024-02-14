import { Season } from "../types";

export const SEASONS = {
  season_9: {
    id: "season_9",
    order: 9,
    name: "Vanuatu",
    img: "https://static.wikia.nocookie.net/survivor/images/d/d0/Vanuatu_Logo_Recreation.png/revision/latest?cb=20180510082135",
  },
} satisfies Record<string, Season>;
