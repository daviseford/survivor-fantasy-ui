import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { Season, Team } from "../types";

export const useTeams = (seasonId?: Season["id"]) => {
  const [data, setData] = useState<Record<Team["id"], Team>>({});

  useEffect(() => {
    if (!seasonId) return;

    const ref = doc(db, "teams", seasonId);

    const unsub = onSnapshot(ref, (doc) => {
      const _data = doc.data() ?? {};
      setData(_data);
    });

    return () => unsub();
  }, [seasonId]);

  return { data };
};
