import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import {
  SEASON_9_CHALLENGES,
  SEASON_9_ELIMINATIONS,
  SEASON_9_EPISODES,
  SEASON_9_PLAYERS,
} from "../data/season_9";
import { SEASONS } from "../data/seasons";

const uploadS9 = async () => {
  await setDoc(doc(db, "seasons", "season_9"), SEASONS.season_9);
  await setDoc(doc(db, "episodes", "season_9"), SEASON_9_EPISODES);
  await setDoc(doc(db, "challenges", "season_9"), SEASON_9_CHALLENGES);
  await setDoc(doc(db, "players", "season_9"), SEASON_9_PLAYERS);
  await setDoc(doc(db, "eliminations", "season_9"), SEASON_9_ELIMINATIONS);
};

export const Admin = () => {
  // Create a query against the collection.
  //   const q = query(seasons, where("season_id", "==", 9));

  return (
    <div>
      <button onClick={() => uploadS9()}>Upload</button>
    </div>
  );
};
