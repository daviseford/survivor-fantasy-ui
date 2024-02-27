import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { GameEvent, Season } from "../types";

// Not using this because of a bug
// https://github.com/invertase/react-query-firebase/issues/76
// export const useEvents = (seasonId?: number, subscribe = false) => {
//   const key = "season_" + seasonId;
//   const ref = doc(db, "events", key);

//   return useFirestoreDocumentData<
//     Record<GameEvent["id"], GameEvent>,
//     Record<GameEvent["id"], GameEvent>
//   >(
//     ["events", key],
//     ref,
//     {
//       subscribe,
//     },
//     {
//       enabled: Boolean(seasonId),
//       // select: (_data) =>
//       //   _data ? Object.values(_data).filter((x) => !x.deleted) : [],
//     },
//   );
// };

export const useEvents = (seasonId?: Season["id"]) => {
  const [data, setData] = useState<Record<GameEvent["id"], GameEvent>>({});

  useEffect(() => {
    if (!seasonId) return;

    const ref = doc(db, "events", seasonId);

    const unsub = onSnapshot(ref, (doc) => {
      const _data = doc.data() ?? {};
      console.log("Current data: ", _data);
      setData(_data);
    });

    return () => unsub();
  }, [seasonId]);

  return { data };
};
