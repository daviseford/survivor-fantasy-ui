import { deleteField, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Competition, SlimUser } from "../types";

export const TEAM_NAME_MAX_LENGTH = 50;

/**
 * Set or clear a participant's per-competition team name. A blank name
 * removes the entry so the account name shows again. firestore.rules limits
 * this write to the participant's own entry (or an admin).
 */
export const updateTeamName = (
  competitionId: Competition["id"],
  uid: SlimUser["uid"],
  name: string,
): Promise<void> => {
  const trimmed = name.trim();
  return updateDoc(doc(db, "competitions", competitionId), {
    // Auth uids never contain dots, so a dot path is safe here.
    [`team_names.${uid}`]: trimmed ? trimmed : deleteField(),
  });
};
