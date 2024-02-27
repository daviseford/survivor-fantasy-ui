import { useFirestoreDocumentData } from "@react-query-firebase/firestore";
import { doc } from "firebase/firestore";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { Competition } from "../types";

export const useCompetition = () => {
  const { competitionId } = useParams();

  console.log("Query param competitionId = " + competitionId);

  const ref = doc(db, "competitions", competitionId!);

  // Query a Firestore document using useQuery
  return useFirestoreDocumentData<Competition, Competition>(
    ["competition", competitionId],
    // @ts-expect-error TS is dumb here
    ref,
    {
      // Subscribe to realtime changes
      // subscribe: true,
      // Include metadata changes in the updates
      // includeMetadataChanges: true,
    },
    { enabled: Boolean(competitionId) },
  );
};
