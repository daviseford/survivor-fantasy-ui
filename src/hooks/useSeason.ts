import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { Season } from "../types";

export const useSeason = (id?: Season["id"]) => {
  const { seasonId } = useParams();

  const _seasonId = (id ?? seasonId) || "unknown";

  const [data, setData] = useState<Season>();

  useEffect(() => {
    if (_seasonId === "unknown") return;

    const ref = doc(db, "seasons", _seasonId);

    const unsub = onSnapshot(ref, (doc) => {
      const _data = doc.data() as Season | undefined;
      setData(_data);
    });

    return () => unsub();
  }, [_seasonId]);

  return { data, isLoading: !data && _seasonId !== "unknown" };
};
