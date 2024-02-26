import { useFirestoreDocumentData } from "@react-query-firebase/firestore";
import { doc } from "firebase/firestore";
import { db } from "../firebase";
import { GameEvent } from "../types";

export const useEvents = (seasonId?: number) => {
  const key = "season_" + seasonId;
  const ref = doc(db, "events", key);

  return useFirestoreDocumentData<
    Record<`event_${number}`, GameEvent>,
    GameEvent[]
  >(
    ["events", key],
    ref,
    {},
    {
      enabled: Boolean(seasonId),
      select: (_data) => (_data ? Object.values(_data) : []),
    },
  );
};
