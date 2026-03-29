import { Alert, Button, SimpleGrid } from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { SEASON_9_CHALLENGES, SEASON_9_ELIMINATIONS } from "../data/season_9";
import { SEASONS } from "../data/seasons";
import { db } from "../firebase";
import { useUser } from "../hooks/useUser";

const useUploadFeedback = () => {
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const upload = async (label: string, fn: () => Promise<void>) => {
    setStatus(null);
    try {
      await fn();
      setStatus({ type: "success", message: `${label} uploaded successfully.` });
    } catch (err) {
      setStatus({
        type: "error",
        message: `${label} failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      });
    }
  };

  return { status, upload };
};

export const Admin = () => {
  const { slimUser } = useUser();
  const { status, upload } = useUploadFeedback();

  if (!slimUser?.isAdmin) {
    return <div>Unauthorized</div>;
  }

  return (
    <div>
      {status && (
        <Alert
          mb="md"
          color={status.type === "success" ? "green" : "red"}
          icon={status.type === "success" ? <IconCheck /> : <IconX />}
          withCloseButton
          onClose={() => {}}
        >
          {status.message}
        </Alert>
      )}

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
