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

  const handleManageSeason = () => {
    if (!slimUser?.isAdmin || !season) return;
    navigate(`/admin/${season.id}`);
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
      <Title order={2}>Season {season?.order}</Title>

      <Stack>
        {slimUser?.isAdmin && (
          <>
            <Group>
              <Title order={3}>Admin Controls</Title>
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
