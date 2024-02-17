import { useFirestoreDocumentData } from "@react-query-firebase/firestore";
import { doc } from "firebase/firestore";
import { db } from "../firebase";
import { Elimination } from "../types";

export const useEliminations = (seasonId?: number) => {
  const key = "season_" + seasonId;
  const ref = doc(db, "eliminations", key);

  return useFirestoreDocumentData<
    Record<`elimination_${number}`, Elimination>,
    Elimination[]
  >(
    ["eliminations", key],
    ref,
    {},
    {
      enabled: Boolean(seasonId),
      select: (_data) => (_data ? Object.values(_data) : []),
    },
  );
};
