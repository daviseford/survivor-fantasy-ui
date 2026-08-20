import { GameEvent, Season } from "../types";
import { useSharedSnapshot } from "./useSharedSnapshot";

export const useEvents = (seasonId?: Season["id"]) => {
  const { data, loaded } = useSharedSnapshot("events", seasonId);
  return {
    data: (data ?? {}) as Record<GameEvent["id"], GameEvent>,
    isReady: !!seasonId && loaded && data !== undefined,
  };
};
