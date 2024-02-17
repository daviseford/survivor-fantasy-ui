import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { Season } from "../types";

export const useSeason = (num?: number) => {
  const { seasonId } = useParams();

  const [season, setSeason] = useState<Season>();

  // allow manual override
  const _seasonId = num ?? seasonId;

  useEffect(() => {
    if (!_seasonId) {
      console.error("Missing _seasonId");
      return;
    }

    const seasonDoc = doc(db, "seasons", "season_" + _seasonId);

    const getSeason = async () => {
      const _doc = (await getDoc(seasonDoc)).data() as Season;
      setSeason(_doc);
    };

    getSeason();
  }, [_seasonId]);

  console.log("Query param _seasonId = " + _seasonId);
  console.log("Season data: ", season);

  return { season };
};
