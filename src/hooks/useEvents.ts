import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { GameEvent, Season } from "../types";

export const useEvents = (seasonId?: Season["id"]) => {
  const [data, setData] = useState<Record<GameEvent["id"], GameEvent>>({});

  useEffect(() => {
    if (!seasonId) return;

    const ref = doc(db, "events", seasonId);

    const unsub = onSnapshot(ref, (doc) => {
      const _data = doc.data() ?? {};
      setData(_data);
    });

    return () => unsub();
  }, [seasonId]);

  return { data };
};
