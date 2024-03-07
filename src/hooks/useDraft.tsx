import { onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { rt_db } from "../firebase";
import { Draft } from "../types";
import { useSeason } from "./useSeason";
import { useUser } from "./useUser";

export const useDraft = () => {
  const { draftId } = useParams();

  const { slimUser } = useUser();
  const { data: season } = useSeason();

  const [draft, setDraft] = useState<Draft>();

  useEffect(() => {
    if (!season || !draftId || !slimUser) return;

    const draftRef = ref(rt_db, "drafts/" + draftId);

    onValue(draftRef, (snapshot) => {
      const data = snapshot.val();
      console.log("rt data", data);
      setDraft(data || undefined);
    });
  }, [draftId, season, slimUser]);

  return { draft };
};
