import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { Competition } from "../types";

// export const useCompetition = (id?: Competition["id"]) => {
//   const { competitionId } = useParams();

//   const key = id || competitionId || "unknown";

//   console.log("useCompetition competitionId = " + key);

//   const ref = doc(db, "competitions", key);

//   // Query a Firestore document using useQuery
//   return useFirestoreDocumentData<Competition, Competition>(
//     ["competition", key],
//     // @ts-expect-error TS is dumb here
//     ref,
//     {
//       // Subscribe to realtime changes
//       // subscribe: true,
//       // Include metadata changes in the updates
//       // includeMetadataChanges: true,
//     },
//     { enabled: Boolean(key) },
//   );
// };

export const useCompetition = (id?: Competition["id"]) => {
  const { competitionId } = useParams();

  const [data, setData] = useState<Competition>();

  const key = id ?? competitionId;

  useEffect(() => {
    if (!key) return;

    console.log("useCompetition competitionId = " + key);

    const ref = doc(db, "competitions", key);

    const unsub = onSnapshot(ref, (doc) => {
      const _data = doc.data() as Competition | undefined;
      console.log("Current competition data: ", _data);
      setData(_data);
    });

    return () => unsub();
  }, [key]);

  return { data };
};
