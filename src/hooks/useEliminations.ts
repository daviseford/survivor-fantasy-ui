import { Elimination, Season } from "../types";
import { useSharedSnapshot } from "./useSharedSnapshot";

export const useEliminations = (seasonId?: Season["id"]) => {
  const { data, loaded } = useSharedSnapshot("eliminations", seasonId);
  return {
    data: (data ?? {}) as Record<Elimination["id"], Elimination>,
    isReady: !!seasonId && loaded && data !== undefined,
  };
};
