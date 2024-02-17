import { useFirestoreQueryData } from "@react-query-firebase/firestore";
import { collection, query, where } from "firebase/firestore";
import { NavLink } from "react-router-dom";
import { db } from "../firebase";
import { useUser } from "../hooks/useUser";
import { Competition } from "../types";

export const Competitions = () => {
  const { user } = useUser();

  const ref = collection(db, "competitions");

  const _query = query(
    ref,
    where("participant_uids", "array-contains", user?.uid || ""),
  );

  const { data: competitions } = useFirestoreQueryData<
    Competition[],
    Competition[]
  >(
    ["competitions", user?.uid],
    // @ts-expect-error asd
    _query,
    {},
    { enabled: Boolean(user?.uid) },
  );

  console.log({ competitions, user });

  return (
    <div>
      <h1>Competitions</h1>
      {competitions?.map((x) => {
        return (
          <div key={x.id}>
            <NavLink to={`/competitions/${x.id}`}>
              Season: {x.season_id} | Draft ID: ...{x.draft_id.slice(-4)}
            </NavLink>
          </div>
        );
      })}
    </div>
  );
};
