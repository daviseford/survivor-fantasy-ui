import { useFirestoreDocumentData } from "@react-query-firebase/firestore";
import { doc } from "firebase/firestore";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { Competition } from "../types";

export const useCompetition = (id?: Competition["id"]) => {
  const { competitionId } = useParams();

  const key = id || competitionId || "unknown";

  console.log("useCompetition competitionId = " + key);

  const ref = doc(db, "competitions", key);

  // Query a Firestore document using useQuery
  return useFirestoreDocumentData<Competition, Competition>(
    ["competition", key],
    // @ts-expect-error TS is dumb here
    ref,
    {
      // Subscribe to realtime changes
      // subscribe: true,
      // Include metadata changes in the updates
      // includeMetadataChanges: true,
    },
    { enabled: Boolean(key) },
  );
};