import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { Elimination, Season } from "../types";

// Not using this because of a bug
// https://github.com/invertase/react-query-firebase/issues/76
// export const useEliminations = (seasonId?: Season["id"]) => {
//   const key = seasonId || "unknown";

//   const ref = doc(db, "eliminations", key);

//   return useFirestoreDocumentData<
//     Record<Elimination["id"], Elimination>,
//     Elimination[]
//   >(
//     ["eliminations", key],
//     ref,
//     {},
//     {
//       enabled: Boolean(key),
//       select: (_data) => (_data ? Object.values(_data) : []),
//     },
//   );
// };

export const useEliminations = (seasonId?: Season["id"]) => {
  const [data, setData] = useState<Record<Elimination["id"], Elimination>>({});

  useEffect(() => {
    if (!seasonId) return;

    const ref = doc(db, "eliminations", seasonId);

    const unsub = onSnapshot(ref, (doc) => {
      const _data = doc.data() ?? {};
      console.log("Current data: ", _data);
      setData(_data);
    });

    return () => unsub();
  }, [seasonId]);

  return { data };
};
