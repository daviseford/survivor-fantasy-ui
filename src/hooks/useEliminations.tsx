import { useFirestoreDocumentData } from "@react-query-firebase/firestore";
import { doc } from "firebase/firestore";
import { db } from "../firebase";
import { Elimination, Season } from "../types";

export const useEliminations = (seasonId?: Season["id"]) => {
  const key = seasonId || "unknown";

  const ref = doc(db, "eliminations", key);

  return useFirestoreDocumentData<
    Record<Elimination["id"], Elimination>,
    Elimination[]
  >(
    ["eliminations", key],
    ref,
    {},
    {
      enabled: Boolean(key),
      select: (_data) => (_data ? Object.values(_data) : []),
    },
  );
};
