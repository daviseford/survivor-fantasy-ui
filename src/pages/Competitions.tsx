import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { db } from "../firebase";
import { useUser } from "../hooks/useUser";
import { Competition } from "../types";

export const Competitions = () => {
  const { user } = useUser();

  const [competitions, setCompetitions] = useState<Competition[]>([]);

  useEffect(() => {
    const _comps = collection(db, "competitions");

    const getCompetitions = async () => {
      if (!user) return;

      const _query = query(
        _comps,
        where("participant_uids", "array-contains", user?.uid),
      );

      const data = (await getDocs(_query)).docs.map((x) =>
        x.data(),
      ) as Competition[];

      setCompetitions(data);
    };

    getCompetitions();
  }, [user]);

  console.log(competitions);

  return (
    <div>
      <h1>Competitions</h1>
      {competitions.map((x) => {
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
