import { onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { rt_db } from "../firebase";
import { Draft } from "../types";
import { normalizeDraft, type RealtimeDraft } from "../utils/draftRealtime";
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
      const data = snapshot.val() as RealtimeDraft | null;
      setDraft(normalizeDraft(data));
    });
  }, [draftId, season, slimUser]);

  return { draft };
};
