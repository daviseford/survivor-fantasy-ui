import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { Season, TeamAssignments } from "../types";

export const useTeamAssignments = (seasonId?: Season["id"]) => {
  const [data, setData] = useState<TeamAssignments>({});

  useEffect(() => {
    if (!seasonId) return;

    const ref = doc(db, "team_assignments", seasonId);

    const unsub = onSnapshot(
      ref,
      (doc) => {
        const _data = doc.data() ?? {};
        setData(_data);
      },
      (error) => {
        console.error("useTeamAssignments: onSnapshot error", error);
      },
    );

    return () => unsub();
  }, [seasonId]);

  return { data };
};
