import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { Challenge, Season } from "../types";

export const useChallenges = (seasonId?: Season["id"]) => {
  const [data, setData] = useState<Record<Challenge["id"], Challenge>>({});

  useEffect(() => {
    if (!seasonId) return;

    const ref = doc(db, "challenges", seasonId);

    const unsub = onSnapshot(ref, (doc) => {
      const _data = doc.data() ?? {};
      setData(_data);
    });

    return () => unsub();
  }, [seasonId]);

  return { data };
};
