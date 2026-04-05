import { Elimination, Season } from "../types";
import { useSharedSnapshot } from "./useSharedSnapshot";

export const useEliminations = (seasonId?: Season["id"]) => {
  const { data } = useSharedSnapshot("eliminations", seasonId);
  return { data: (data ?? {}) as Record<Elimination["id"], Elimination> };
};
