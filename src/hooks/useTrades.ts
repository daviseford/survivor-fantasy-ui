import { collection, onSnapshot, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { Competition, Trade } from "../types";

/**
 * Live subscription to a competition's trades subcollection,
 * newest first.
 */
export const useTrades = (competitionId?: Competition["id"]) => {
  const [data, setData] = useState<Trade[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!competitionId) return;

    const q = query(collection(db, "competitions", competitionId, "trades"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const trades = snap.docs
          .map((d) => d.data() as Trade)
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
        setData(trades);
        setLoaded(true);
      },
      (error) => {
        console.error("useTrades: onSnapshot error", error);
        setLoaded(true);
      },
    );

    return unsub;
  }, [competitionId]);

  return { data, loaded };
};
