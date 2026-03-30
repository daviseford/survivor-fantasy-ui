import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { Season } from "../types";

export const useSeasons = () => {
  const [data, setData] = useState<Season[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const ref = collection(db, "seasons");

    const unsub = onSnapshot(ref, (snapshot) => {
      const _data = snapshot.docs.map((x) => x.data() as Season);
      setData(_data);
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  return { data, isLoading };
};
