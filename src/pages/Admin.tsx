import { Button, SimpleGrid } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";
import { doc, setDoc } from "firebase/firestore";
import { SEASON_9_CHALLENGES, SEASON_9_ELIMINATIONS } from "../data/season_9";
import { SEASONS } from "../data/seasons";
import { db } from "../firebase";
import { useUser } from "../hooks/useUser";

const upload = async (label: string, fn: () => Promise<void>) => {
  try {
    await fn();
    notifications.show({
      title: `${label} uploaded successfully`,
      message: "",
      color: "green",
      icon: <IconCheck size={16} />,
    });
  } catch (err) {
    notifications.show({
      title: `${label} failed`,
      message: err instanceof Error ? err.message : "Unknown error",
      color: "red",
      icon: <IconX size={16} />,
    });
  }
};

export const Admin = () => {
  const { slimUser } = useUser();

  if (!slimUser?.isAdmin) {
    return <div>Unauthorized</div>;
  }

  return (
    <div>
      <SimpleGrid cols={3}>
        <Button
          onClick={() =>
            upload("Season 9", async () => {
              await setDoc(doc(db, "seasons", "season_9"), SEASONS.season_9);
              await setDoc(
                doc(db, "challenges", "season_9"),
                SEASON_9_CHALLENGES,
              );
              await setDoc(
                doc(db, "eliminations", "season_9"),
                SEASON_9_ELIMINATIONS,
              );
            })
          }
        >
          Upload Season 9 Data
        </Button>
        <Button
          onClick={() =>
            upload("Season 46", async () => {
              await setDoc(doc(db, "seasons", "season_46"), SEASONS.season_46);
            })
          }
        >
          Upload Season 46 Data
        </Button>
        <Button
          onClick={() =>
            upload("Season 50", async () => {
              await setDoc(doc(db, "seasons", "season_50"), SEASONS.season_50);
            })
          }
        >
          Upload Season 50 Data
        </Button>
        <Button
          onClick={() =>
            upload("Season 99", async () => {
              await setDoc(doc(db, "seasons", "season_99"), SEASONS.season_99);
            })
          }
        >
          Upload Season 99 Data
        </Button>
      </SimpleGrid>
    </div>
  );
};
