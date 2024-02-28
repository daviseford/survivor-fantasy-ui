import {
  Box,
  Button,
  Center,
  Group,
  Loader,
  Stack,
  Title,
} from "@mantine/core";
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
    navigate(`/seasons/${season?.id}/draft/${draftId}`);
  };

  const handleManageSeason = async () => {
    if (!slimUser?.isAdmin) return;
    navigate(`/seasons/${season?.id}/manage`);
  };

  if (isLoading)
    return (
      <Center>
        <Loader size={"xl"} />
      </Center>
    );

  if (!season) return <div>Error: Missing season data</div>;

  return (
    <Box p={"md"}>
      <h1>Season {season?.order}</h1>

      <Stack>
        {slimUser?.isAdmin && (
          <>
            <Group>
              <Title>Admin Controls</Title>
              <Button onClick={handleManageSeason}>Manage Season</Button>
            </Group>
          </>
        )}

        {slimUser && (
          <Group pb={"lg"}>
            <Title order={4}>Want to play along?</Title>
            <Button
              onClick={handleCreateDraft}
              style={{ width: "fit-content" }}
            >
              Create a New Draft
            </Button>
          </Group>
        )}

        <Players />
      </Stack>
    </Box>
  );
};
