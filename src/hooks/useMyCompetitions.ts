import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { Competition } from "../types";
import { useUser } from "./useUser";

export const useMyCompetitions = () => {
  const { user } = useUser();

  const [data, setData] = useState<Competition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const ref = collection(db, "competitions");
    const _query = query(
      ref,
      where("participant_uids", "array-contains", user.uid),
    );

    const unsub = onSnapshot(_query, (snapshot) => {
      const _data = snapshot.docs.map((x) => x.data() as Competition);
      setData(_data);
      setIsLoading(false);
    });

    return () => unsub();
  }, [user?.uid]);

  return { data, isLoading };
};
