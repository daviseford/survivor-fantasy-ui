import { useFirestoreDocumentData } from "@react-query-firebase/firestore";
import { doc } from "firebase/firestore";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { Season } from "../types";

export const useSeason = (num?: number) => {
  const { seasonId } = useParams();

  // allow manual override
  const _seasonId = num ?? seasonId;

  console.log("Query param _seasonId = " + _seasonId);

  const ref = doc(db, "seasons", "season_" + _seasonId);

  // Query a Firestore document using useQuery
  return useFirestoreDocumentData<Season, Season>(
    ["season", _seasonId],
    // @ts-expect-error TS is dumb here
    ref,
    {
      // Subscribe to realtime changes
      // subscribe: true,
      // Include metadata changes in the updates
      // includeMetadataChanges: true,
    },
  );
};
