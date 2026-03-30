import {
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Stack,
  Text,
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

  if (isLoading)
    return (
      <Center py="xl">
        <Loader size="lg" />
      </Center>
    );

  if (!season) return <div>Error: Missing season data</div>;

  return (
    <Stack gap="lg" p="md">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div>
          <Group gap="xs" mb={4}>
            <Badge variant="light" size="sm">
              Season {season.order}
            </Badge>
            <Badge variant="light" color="gray" size="sm">
              {season.players?.length ?? 0} contestants
            </Badge>
          </Group>
          <Title order={2}>{season.name}</Title>
          <Text c="dimmed" size="sm">
            Check out the cast and start drafting with your crew.
          </Text>
        </div>

        {slimUser && (
          <Button size="sm" onClick={handleCreateDraft}>
            Create a New Draft
          </Button>
        )}
      </Group>

      <Players />
    </Stack>
  );
};
