import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { Competition } from "../types";

export const useCompetition = () => {
  const { competitionId } = useParams();

  const [competition, setCompetition] = useState<Competition>();

  useEffect(() => {
    if (!competitionId) {
      console.error("Missing competitionId");
      return;
    }

    const competitionDoc = doc(db, "competitions", competitionId);

    const getCompetition = async () => {
      const _doc = (await getDoc(competitionDoc)).data() as Competition;
      setCompetition(_doc);
    };

    getCompetition();
  }, [competitionId]);

  console.log("Query param competitionId = " + competitionId);
  console.log("competition data: ", competition);

  return { competition };
};
