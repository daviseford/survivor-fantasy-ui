import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { Challenge, Season } from "../types";

// Not using this because of a bug
// https://github.com/invertase/react-query-firebase/issues/76
// export const useChallenges = (seasonId?: Season["id"]) => {
//   const key = seasonId || "unknown";

//   const ref = doc(db, "challenges", key);

//   return useFirestoreDocumentData<
//     Record<Challenge["id"], Challenge>,
//     Challenge[]
//   >(
//     ["challenges", key],
//     ref,
//     {},
//     {
//       enabled: Boolean(key),
//       select: (_data) => (_data ? Object.values(_data) : []),
//     },
//   );
// };

export const useChallenges = (seasonId?: Season["id"]) => {
  const [data, setData] = useState<Record<Challenge["id"], Challenge>>({});

  useEffect(() => {
    if (!seasonId) return;

    const ref = doc(db, "challenges", seasonId);

    const unsub = onSnapshot(ref, (doc) => {
      const _data = doc.data() ?? {};
      console.log("Current data: ", _data);
      setData(_data);
    });

    return () => unsub();
  }, [seasonId]);

  return { data };
};
