import { Button } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useCreateDraft } from "../hooks/useCreateDraft";
import { useSeason } from "../hooks/useSeason";
import { useUser } from "../hooks/useUser";
import { Players } from "./Players";

export const SingleSeason = () => {
  const navigate = useNavigate();
  const { season } = useSeason();
  const { slimUser } = useUser();
  const { createDraft } = useCreateDraft();

  const handleCreateDraft = async () => {
    const draftId = await createDraft();
    navigate(`/seasons/${season?.order}/draft/${draftId}`);
  };

  if (!season) return <div>Error: Missing data</div>;

  return (
    <div>
      <h1>Season {season?.order}</h1>

      {slimUser && (
        <>
          <h3>Want to play along?</h3>
          <Button onClick={handleCreateDraft}>Create a New Draft</Button>
        </>
      )}
      <Players />
    </div>
  );
};
