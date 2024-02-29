import { useFirestoreQueryData } from "@react-query-firebase/firestore";
import { collection, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { Competition } from "../types";
import { useUser } from "./useUser";

export const useMyCompetitions = () => {
  const { user } = useUser();

  const ref = collection(db, "competitions");

  const _query = query<Competition, Competition>(
    // @ts-expect-error Dumb
    ref,
    where("participant_uids", "array-contains", user?.uid || ""),
  );

  return useFirestoreQueryData(
    ["competitions", user?.uid],
    _query,
    {},
    { enabled: Boolean(user?.uid) },
  );
};
