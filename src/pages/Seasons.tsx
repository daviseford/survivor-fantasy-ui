// Create a reference to the seasons collection
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useParams } from "react-router-dom";
import { useEffect } from "react";

export const Seasons = () => {
  const { season, episode } = useParams();
  console.log({ season, episode });

  // Create a query against the collection.
  //   const q = query(seasons, where("season_id", "==", 9));

  useEffect(() => {
    const seasons = collection(db, "seasons");

    console.log({ seasons });

    const a = async () => {
      const querySnapshot = await getDocs(seasons);

      console.log({ querySnapshot });
      querySnapshot.forEach((doc) => {
        // doc.data() is never undefined for query doc snapshots
        console.log(doc.id, " => ", doc.data());
      });
    };

    a();
  }, []);

  return <div></div>;
};
