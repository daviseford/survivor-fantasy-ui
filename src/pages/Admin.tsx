import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { SEASON_9_EPISODES } from "../data/season_9";
import { SEASONS } from "../data/seasons";

export const Admin = () => {
  // Create a query against the collection.
  //   const q = query(seasons, where("season_id", "==", 9));

  const upload = async () => {
    await setDoc(doc(db, "seasons", "season_9"), SEASONS.season_9);
    await setDoc(doc(db, "episodes", "season_9"), SEASON_9_EPISODES);
  };

  return (
    <div>
      <button onClick={() => upload()}>Upload</button>
    </div>
  );
};
