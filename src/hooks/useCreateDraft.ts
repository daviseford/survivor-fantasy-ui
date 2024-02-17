import { rt_db } from "../firebase";

import { ref, set } from "firebase/database";
import { v4 as uuidv4 } from "uuid";
import { useSeason } from "../hooks/useSeason";
import { useUser } from "../hooks/useUser";
import { Draft } from "../types";

export const useCreateDraft = () => {
  const { slimUser } = useUser();
  const { season } = useSeason();

  const createDraft = async () => {
    const draftId = `draft_${uuidv4()}`;

    if (!slimUser || !season || !season) {
      console.error("Missing a key prop here...");
      return null;
    }

    console.log(`CREATING DRAFT WITH ID ${draftId}`);

    const newDraft = {
      id: draftId,
      season_id: Number(season.order),
      participants: [slimUser],
      total_players: season?.players.length,
      pick_order: [],
      draft_picks: [],
      current_pick_number: 0,
      current_picker: null,
      started: false,
      finished: false,
    } satisfies Draft;

    console.log(newDraft);

    await set(ref(rt_db, "drafts/" + draftId), newDraft);

    return draftId;
  };

  return { createDraft };
};
