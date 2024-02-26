import { Button } from "@mantine/core";
import { doc, setDoc } from "firebase/firestore";
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

export const Admin = () => {
  const { user } = useUser();

  if (!user || user?.displayName?.toLocaleLowerCase() !== "davis") {
    return <div>Unauthorized</div>;
  }

  return (
    <div>
      <Button onClick={() => uploadS9()}>Upload Static Data</Button>
    </div>
  );
};
