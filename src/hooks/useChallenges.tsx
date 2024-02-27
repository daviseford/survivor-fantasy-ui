import { useFirestoreDocumentData } from "@react-query-firebase/firestore";
import { doc } from "firebase/firestore";
import { db } from "../firebase";
import { Challenge, Season } from "../types";

export const useChallenges = (seasonId?: Season["id"]) => {
  const key = seasonId || "unknown";

  const ref = doc(db, "challenges", key);

  return useFirestoreDocumentData<
    Record<Challenge["id"], Challenge>,
    Challenge[]
  >(
    ["challenges", key],
    ref,
    {},
    {
      enabled: Boolean(key),
      select: (_data) => (_data ? Object.values(_data) : []),
    },
  );
};
