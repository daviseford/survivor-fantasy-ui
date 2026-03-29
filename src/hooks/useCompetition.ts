import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { Competition } from "../types";

export const useCompetition = (id?: Competition["id"]) => {
  const { competitionId } = useParams();

  const [data, setData] = useState<Competition>();

  const key = id ?? competitionId;

  useEffect(() => {
    if (!key) return;

    const ref = doc(db, "competitions", key);

    const unsub = onSnapshot(ref, (doc) => {
      const _data = doc.data() as Competition | undefined;
      setData(_data);
    });

    return () => unsub();
  }, [key]);

  return { data };
};
