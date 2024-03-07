import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { Competition } from "../types";
import { useUser } from "./useUser";

export const useCompetitions = () => {
  const { slimUser } = useUser();

  const [data, setData] = useState<Competition[]>([]);

  useEffect(() => {
    // only run for davis
    if (!slimUser?.isAdmin) return;

    const ref = collection(db, "competitions");

    const unsub = onSnapshot(ref, (doc) => {
      const _data = doc.docs.map((x) => x.data() as Competition) ?? [];
      console.log("Current data: ", _data);
      setData(_data);
    });

    return () => unsub();
  }, [slimUser?.isAdmin]);

  return { data };
};
