import { Button, Center, Group, Loader, Title } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useCreateDraft } from "../hooks/useCreateDraft";
import { useSeason } from "../hooks/useSeason";
import { useUser } from "../hooks/useUser";
import { Players } from "./Players";

export const SingleSeason = () => {
  const navigate = useNavigate();

  const { data: season, isLoading } = useSeason();
  const { slimUser } = useUser();
  const { createDraft } = useCreateDraft();

  const handleCreateDraft = async () => {
    const draftId = await createDraft();
    navigate(`/seasons/${season?.order}/draft/${draftId}`);
  };

  const handleCreateEvent = async () => {
    if (!slimUser?.isAdmin) return;
    navigate(`/seasons/${season?.order}/create/event`);
  };

  if (isLoading)
    return (
      <Center>
        <Loader size={"xl"} />
      </Center>
    );

  if (!season) return <div>Error: Missing season data</div>;

  return (
    <div>
      <h1>Season {season?.order}</h1>

      {slimUser?.isAdmin && (
        <>
          <Title>Admin Controls</Title>
          <Group>
            <Button onClick={handleCreateEvent}>Create Game Event</Button>
          </Group>
        </>
      )}

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
