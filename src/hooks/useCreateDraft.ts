import { rt_db } from "../firebase";

import { ref, set } from "firebase/database";
import { v4 } from "uuid";
import { useSeason } from "../hooks/useSeason";
import { useUser } from "../hooks/useUser";
import {
  buildParticipantMap,
  type RealtimeDraft,
} from "../utils/draftRealtime";

export const useCreateDraft = () => {
  const { slimUser } = useUser();
  const { data: season } = useSeason();

  const createDraft = async () => {
    const draftId = `draft_${v4()}` as const;

    if (!slimUser || !season) {
      return null;
    }

    const newDraft = {
      id: draftId,
      season_id: season.id,
      season_num: season.order,
      competiton_id: `competition_${v4()}` as const,
      creator_uid: slimUser.uid,
      participants: buildParticipantMap([slimUser]),
      total_players: season?.players.length,
      pick_order_uids: {},
      turns: {},
      draft_picks: {},
      prop_bets: {},
      state: {
        current_pick_number: 0,
        started: false,
        finished: false,
      },
    } satisfies RealtimeDraft;

    await set(ref(rt_db, "drafts/" + draftId), newDraft);

    return draftId;
  };

  return { createDraft };
};
