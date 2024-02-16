import { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useParams } from "react-router-dom";
import { Season } from "../types";

export const useSeason = () => {
  const { season: seasonQueryParam } = useParams();

  const [season, setSeason] = useState<Season>();

  useEffect(() => {
    const seasonDoc = doc(db, "seasons", "season_" + seasonQueryParam);

    const getSeason = async () => {
      const _doc = (await getDoc(seasonDoc)).data() as Season;
      setSeason(_doc);
    };

    getSeason();
  }, [seasonQueryParam]);

  console.log("Query param season = " + seasonQueryParam);
  console.log("Season data: ", season);

  return { season };
};
