import { Button, SimpleGrid } from "@mantine/core";
import { doc, setDoc } from "firebase/firestore";
import {
  SEASON_99_CHALLENGES,
  SEASON_99_ELIMINATIONS,
  SEASON_99_EVENTS,
} from "../data/season 99";
import { SEASON_9_CHALLENGES, SEASON_9_ELIMINATIONS } from "../data/season_9";
import { SEASONS } from "../data/seasons";
import { db } from "../firebase";
import { useUser } from "../hooks/useUser";

const uploadS9 = async () => {
  try {
    await setDoc(doc(db, "seasons", "season_9"), SEASONS.season_9);
    await setDoc(doc(db, "challenges", "season_9"), SEASON_9_CHALLENGES);
    await setDoc(doc(db, "eliminations", "season_9"), SEASON_9_ELIMINATIONS);
    // await setDoc(doc(db, "scoring", "base"), {
    //   id: "base_scoring",
    //   scoring: BASE_PLAYER_SCORING,
    // });

    console.log("Done!");
  } catch (err) {
    console.error(err);
  }
};

const uploadS99 = async () => {
  try {
    await setDoc(doc(db, "seasons", "season_99"), SEASONS.season_99);
    await setDoc(doc(db, "challenges", "season_99"), SEASON_99_CHALLENGES);
    await setDoc(doc(db, "eliminations", "season_99"), SEASON_99_ELIMINATIONS);
    await setDoc(doc(db, "events", "season_99"), SEASON_99_EVENTS);

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
      <SimpleGrid cols={4}>
        <Button onClick={() => uploadS9()}>Upload Season 9 Data</Button>
        <Button onClick={() => uploadS99()}>Upload Season 99 Data</Button>
      </SimpleGrid>
    </div>
  );
};
