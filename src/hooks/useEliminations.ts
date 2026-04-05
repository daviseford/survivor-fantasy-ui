import { Elimination, Season } from "../types";
import { useSharedSnapshot } from "./useSharedSnapshot";

export const useEliminations = (seasonId?: Season["id"]) => {
  return useSharedSnapshot<Record<Elimination["id"], Elimination>>(
    "eliminations",
    seasonId,
  );
};
