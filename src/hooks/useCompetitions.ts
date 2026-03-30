import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { Competition } from "../types";
import { useUser } from "./useUser";

export const useCompetitions = () => {
  const { slimUser } = useUser();

  const [data, setData] = useState<Competition[]>([]);

  useEffect(() => {
    if (!slimUser?.isAdmin) return;

    const ref = collection(db, "competitions");

    const unsub = onSnapshot(
      ref,
      (snapshot) => {
        const _data = snapshot.docs.map((x) => x.data() as Competition);
        setData(_data);
      },
      (error) => {
        console.error("useCompetitions: onSnapshot error", error);
      },
    );

    return () => unsub();
  }, [slimUser?.isAdmin]);

  return { data };
};
