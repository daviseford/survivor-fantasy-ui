import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { Season } from "../types";

export const useSeason = () => {
  const { seasonId } = useParams();

  const [season, setSeason] = useState<Season>();

  useEffect(() => {
    const seasonDoc = doc(db, "seasons", "season_" + seasonId);

    const getSeason = async () => {
      const _doc = (await getDoc(seasonDoc)).data() as Season;
      setSeason(_doc);
    };

    getSeason();
  }, [seasonId]);

  console.log("Query param seasonId = " + seasonId);
  console.log("Season data: ", season);

  return { season };
};
