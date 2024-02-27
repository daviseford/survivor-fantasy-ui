import { useFirestoreDocumentData } from "@react-query-firebase/firestore";
import { doc } from "firebase/firestore";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { Season } from "../types";

export const useSeason = (id?: Season["id"]) => {
  const { seasonId } = useParams();

  // allow manual override
  const _seasonId = (id ?? seasonId) || "unknown";

  console.log(
    `Query param seasonId = ${seasonId}, Override param for seasonId = ${id}, _seasonId value = ${_seasonId}`,
  );

  const ref = doc(db, "seasons", _seasonId);

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
    { enabled: Boolean(_seasonId) },
  );
};
