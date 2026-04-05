import { GameEvent, Season } from "../types";
import { useSharedSnapshot } from "./useSharedSnapshot";

export const useEvents = (seasonId?: Season["id"]) => {
  return useSharedSnapshot<Record<GameEvent["id"], GameEvent>>(
    "events",
    seasonId,
  );
};
