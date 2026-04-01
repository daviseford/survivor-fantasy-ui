import { Season } from "../types";
import {
  SEASON_1_CASTAWAY_LOOKUP,
  SEASON_1_EPISODES,
  SEASON_1_PLAYERS,
} from "./season_1";
import {
  SEASON_46_CASTAWAY_LOOKUP,
  SEASON_46_EPISODES,
  SEASON_46_PLAYERS,
} from "./season_46";
import {
  SEASON_48_CASTAWAY_LOOKUP,
  SEASON_48_EPISODES,
  SEASON_48_PLAYERS,
} from "./season_48";
import {
  SEASON_49_CASTAWAY_LOOKUP,
  SEASON_49_EPISODES,
  SEASON_49_PLAYERS,
} from "./season_49";
import {
  SEASON_50_CASTAWAY_LOOKUP,
  SEASON_50_EPISODES,
  SEASON_50_PLAYERS,
} from "./season_50";
import {
  SEASON_9_CASTAWAY_LOOKUP,
  SEASON_9_EPISODES,
  SEASON_9_PLAYERS,
} from "./season_9";

export const SEASONS = {
  season_9: {
    id: "season_9",
    order: 9,
    name: "Survivor 9",
    img: "https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/47eae52e-1606-4bb7-94ef-e4818631965d/d87x8a-ef9eb29e-bc7b-4991-a5b7-7d0ac7972f88.jpg?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiJcL2ZcLzQ3ZWFlNTJlLTE2MDYtNGJiNy05NGVmLWU0ODE4NjMxOTY1ZFwvZDg3eDhhLWVmOWViMjllLWJjN2ItNDk5MS1hNWI3LTdkMGFjNzk3MmY4OC5qcGcifV1dLCJhdWQiOlsidXJuOnNlcnZpY2U6ZmlsZS5kb3dubG9hZCJdfQ.g5p1LXYQhT_I2Gdv_DTP4RHn6t-UixnRMP8yltCDJjY",
    players: SEASON_9_PLAYERS,
    episodes: SEASON_9_EPISODES,
    castawayLookup: SEASON_9_CASTAWAY_LOOKUP,
  },

  season_46: {
    id: "season_46",
    order: 46,
    name: "Survivor 46",
    img: "https://ew.com/thmb/9Vz1wSca_Sp7AvRWlZnisflPW7U=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/Survivor-45-finale-logo-10-121823-270a7955638f4b23a0d8aa4f98591fbf.jpg",
    players: SEASON_46_PLAYERS,
    episodes: SEASON_46_EPISODES,
    castawayLookup: SEASON_46_CASTAWAY_LOOKUP,
  },

  season_49: {
    id: "season_49",
    order: 49,
    name: "Survivor 49",
    img: "/images/season_49/season-49-logo.png",
    players: SEASON_49_PLAYERS,
    episodes: SEASON_49_EPISODES,
    castawayLookup: SEASON_49_CASTAWAY_LOOKUP,
  },

  season_50: {
    id: "season_50",
    order: 50,
    name: "Survivor 50",
    img: "/images/season_50/season-50-logo.webp",
    players: SEASON_50_PLAYERS,
    episodes: SEASON_50_EPISODES,
    castawayLookup: SEASON_50_CASTAWAY_LOOKUP,
  },

  season_1: {
    id: "season_1" as const,
    order: 1,
    name: "Survivor 1",
    img: "/images/season_1/season-1-logo.png",
    players: SEASON_1_PLAYERS,
    episodes: SEASON_1_EPISODES,
    castawayLookup: SEASON_1_CASTAWAY_LOOKUP,
  },

  season_48: {
    id: "season_48" as const,
    order: 48,
    name: "Survivor 48",
    img: "/images/season_48/season-48-logo.png",
    players: SEASON_48_PLAYERS,
    episodes: SEASON_48_EPISODES,
    castawayLookup: SEASON_48_CASTAWAY_LOOKUP,
  },
} satisfies Record<Season["id"], Season>;
