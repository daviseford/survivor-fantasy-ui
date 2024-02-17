import { useFirestoreDocumentData } from "@react-query-firebase/firestore";
import { doc } from "firebase/firestore";
import { db } from "../firebase";
import { Challenge } from "../types";

export const useChallenges = (seasonId?: number) => {
  const key = "season_" + seasonId;
  const ref = doc(db, "challenges", key);

  return useFirestoreDocumentData<
    Record<`challenge_${number}`, Challenge>,
    Challenge[]
  >(
    ["challenges", key],
    ref,
    {},
    {
      enabled: Boolean(seasonId),
      select: (_data) => (_data ? Object.values(_data) : []),
    },
  );
};
