import { doc, setDoc } from "firebase/firestore";
import { SEASON_9_CHALLENGES, SEASON_9_ELIMINATIONS } from "../data/season_9";
import { SEASONS } from "../data/seasons";
import { db } from "../firebase";
import { useUser } from "../hooks/useUser";
import { Button } from "../components/ui/button";

const uploadS50 = async () => {
  try {
    await setDoc(doc(db, "seasons", "season_50"), SEASONS.season_50);
    console.log("Done!");
  } catch (err) {
    console.error(err);
  }
};

const uploadS9 = async () => {
  try {
    await setDoc(doc(db, "seasons", "season_9"), SEASONS.season_9);
    await setDoc(doc(db, "challenges", "season_9"), SEASON_9_CHALLENGES);
    await setDoc(doc(db, "eliminations", "season_9"), SEASON_9_ELIMINATIONS);
    console.log("Done!");
  } catch (err) {
    console.error(err);
  }
};

const uploadS99 = async () => {
  try {
    await setDoc(doc(db, "seasons", "season_99"), SEASONS.season_99);
    console.log("Done!");
  } catch (err) {
    console.error(err);
  }
};

const uploadS46 = async () => {
  try {
    await setDoc(doc(db, "seasons", "season_46"), SEASONS.season_46);
    console.log("Done!");
  } catch (err) {
    console.error(err);
  }
};

export const Admin = () => {
  const { slimUser } = useUser();

  if (!slimUser?.isAdmin) {
    return <div>Unauthorized</div>;
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-4">
        <Button onClick={() => uploadS9()}>Upload Season 9 Data</Button>
        <Button onClick={() => uploadS46()}>Upload Season 46 Data</Button>
        <Button onClick={() => uploadS50()}>Upload Season 50 Data</Button>
        <Button onClick={() => uploadS99()}>Upload Season 99 Data</Button>
      </div>
    </div>
  );
};
