import {
  Alert,
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconAlertCircle, IconLogin, IconUserPlus } from "@tabler/icons-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCreateDraft } from "../hooks/useCreateDraft";
import { useSeason } from "../hooks/useSeason";
import { useUser } from "../hooks/useUser";
import { Players } from "./Players";
import classes from "./SingleSeason.module.css";

export const SingleSeason = () => {
  const navigate = useNavigate();

  const { data: season, isLoading } = useSeason();
  const { slimUser } = useUser();
  const { createDraft } = useCreateDraft();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateDraft = async () => {
    if (isCreating) return;
    setIsCreating(true);
    const draftId = await createDraft();
    navigate(`/seasons/${season?.id}/draft/${draftId}`);
  };

  if (isLoading)
    return (
      <Center py="xl">
        <Loader size="lg" />
      </Center>
    );

  if (!season)
    return (
      <Stack gap="md" p="md" maw={480}>
        <Alert
          icon={<IconAlertCircle size={18} />}
          title="Season not found"
          color="red"
          variant="light"
        >
          We couldn't find this season. It may have been removed or the link may
          be incorrect.
        </Alert>
        <Button component={Link} to="/seasons" variant="light" size="sm">
          Back to Seasons
        </Button>
      </Stack>
    );

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
            Meet the cast. When you're ready, start a draft and invite your
            friends to pick teams.
          </Text>
        </div>

        {slimUser ? (
          <Stack gap={4} align="flex-end" w={{ base: "100%", sm: "auto" }}>
            <Button
              size="sm"
              onClick={handleCreateDraft}
              loading={isCreating}
              leftSection={<IconUserPlus size={16} />}
            >
              Start a draft
            </Button>
            <Text size="xs" c="dimmed">
              You'll get a link to share with friends
            </Text>
          </Stack>
        ) : (
          <Paper
            p="md"
            radius="md"
            className={classes.loginBanner}
          >
            <Group gap="md" align="center" wrap="wrap">
              <Text size="sm" c="white" fw={500}>
                Log in to start a draft with friends
              </Text>
              <Button
                size="sm"
                variant="white"
                color="blue"
                leftSection={<IconLogin size={16} />}
                onClick={() =>
                  modals.openContextModal({
                    modal: "AuthModal",
                    innerProps: {},
                  })
                }
              >
                Log in
              </Button>
            </Group>
          </Paper>
        )}
      </Group>

      <Players />

      {slimUser && (
        <Center>
          <Stack gap={4} align="center">
            <Button
              size="md"
              onClick={handleCreateDraft}
              loading={isCreating}
              leftSection={<IconUserPlus size={18} />}
            >
              Start a draft with {season.name}
            </Button>
            <Text size="xs" c="dimmed">
              You'll get a shareable link to invite friends
            </Text>
          </Stack>
        </Center>
      )}
    </Stack>
  );
};
