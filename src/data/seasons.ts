import { Season } from "../types";
import { SEASON_46_EPISODES, SEASON_46_PLAYERS } from "./season_46";
import { SEASON_9_EPISODES, SEASON_9_PLAYERS } from "./season_9";
import { SEASON_99_EPISODES, SEASON_99_PLAYERS } from "./season_99";

export const SEASONS = {
  season_9: {
    id: "season_9",
    order: 9,
    name: "Vanuatu",
    img: "https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/47eae52e-1606-4bb7-94ef-e4818631965d/d87x8a-ef9eb29e-bc7b-4991-a5b7-7d0ac7972f88.jpg?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiJcL2ZcLzQ3ZWFlNTJlLTE2MDYtNGJiNy05NGVmLWU0ODE4NjMxOTY1ZFwvZDg3eDhhLWVmOWViMjllLWJjN2ItNDk5MS1hNWI3LTdkMGFjNzk3MmY4OC5qcGcifV1dLCJhdWQiOlsidXJuOnNlcnZpY2U6ZmlsZS5kb3dubG9hZCJdfQ.g5p1LXYQhT_I2Gdv_DTP4RHn6t-UixnRMP8yltCDJjY",

    players: SEASON_9_PLAYERS,
    episodes: SEASON_9_EPISODES,
  },

  season_46: {
    id: "season_46",
    order: 46,
    name: "Survivor 46",
    img: "https://ew.com/thmb/9Vz1wSca_Sp7AvRWlZnisflPW7U=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/Survivor-45-finale-logo-10-121823-270a7955638f4b23a0d8aa4f98591fbf.jpg",

    players: SEASON_46_PLAYERS,
    episodes: SEASON_46_EPISODES,
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
} satisfies Record<Season["id"], Season>;
