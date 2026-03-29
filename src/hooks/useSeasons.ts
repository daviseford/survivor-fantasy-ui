import { useFirestoreQueryData } from "@react-query-firebase/firestore";
import { collection } from "firebase/firestore";
import { db } from "../firebase";
import { Season } from "../types";

export const useSeasons = () => {
  const ref = collection(db, "seasons");

  return useFirestoreQueryData<Season, Season[]>(
    ["seasons"],
    // @ts-expect-error react-query-firebase type mismatch with Firestore ref
    ref,
  );
};
