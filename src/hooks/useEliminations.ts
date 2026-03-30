import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { Elimination, Season } from "../types";

export const useEliminations = (seasonId?: Season["id"]) => {
  const [data, setData] = useState<Record<Elimination["id"], Elimination>>({});

  useEffect(() => {
    if (!seasonId) return;

    const ref = doc(db, "eliminations", seasonId);

    const unsub = onSnapshot(
      ref,
      (doc) => {
        const _data = doc.data() ?? {};
        setData(_data);
      },
      (error) => {
        console.error("useEliminations: onSnapshot error", error);
      },
    );

    return () => unsub();
  }, [seasonId]);

  return { data };
};
