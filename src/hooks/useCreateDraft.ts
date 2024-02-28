import { rt_db } from "../firebase";

import { ref, set } from "firebase/database";
import { v4 } from "uuid";
import { useSeason } from "../hooks/useSeason";
import { useUser } from "../hooks/useUser";
import { Draft } from "../types";

export const useCreateDraft = () => {
  const { slimUser } = useUser();
  const { data: season } = useSeason();

  const createDraft = async () => {
    const draftId = `draft_${v4()}` as const;

    if (!slimUser || !season || !season) {
      console.error("Missing a key prop here...");
      return null;
    }

    console.log(`CREATING DRAFT WITH ID ${draftId}`);

    const newDraft = {
      id: draftId,
      season_id: season.id,
      season_num: season.order,
      competiton_id: `competition_${v4()}` as const,
      creator_uid: slimUser.uid,
      participants: [slimUser],
      total_players: season?.players.length,
      pick_order: [],
      draft_picks: [],
      prop_bets: [],
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
