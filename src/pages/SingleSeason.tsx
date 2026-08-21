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
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconLogin, IconUserPlus } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { v4 } from "uuid";
import { saveAuthIntent, type AuthIntent } from "../components/Auth/authIntent";
import { useAuthContinuation } from "../hooks/useAuthContinuation";
import { useCreateDraft } from "../hooks/useCreateDraft";
import { useSeason } from "../hooks/useSeason";
import { useUser } from "../hooks/useUser";
import { Draft } from "../types";
import { trackEvent } from "../utils/analytics";
import { Players } from "./Players";
import classes from "./SingleSeason.module.css";

export const SingleSeason = () => {
  const navigate = useNavigate();

  const { data: season, isLoading } = useSeason();
  const { slimUser } = useUser();
  const { createDraft } = useCreateDraft();
  const [isCreating, setIsCreating] = useState(false);
  const [pendingStateKey, setPendingStateKey] = useState<string | null>(null);

  useEffect(() => {
    if (season) {
      trackEvent("season_viewed", { season_num: season.order });
    }
  }, [season]);

  const handleCreateDraft = async () => {
    if (isCreating || !slimUser || !season) return;
    setIsCreating(true);
    const outcome = await createDraft({ user: slimUser });
    if (outcome.status === "failed") {
      setIsCreating(false);
      notifications.show({
        title: "Failed to create draft",
        message: "Check your connection and try again.",
        color: "red",
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }
    navigate(`/seasons/${season.id}/draft/${outcome.draftId}`);
  };

  // Signed-out start: retain the action as a single-use intent with a
  // preallocated draft ID, then open account entry. The continuation below
  // executes it exactly once after authentication.
  const handleStartDraftIntent = (mode: "login" | "register") => {
    if (!season) return;
    const stateKey = saveAuthIntent({
      kind: "start-draft",
      seasonId: season.id,
      draftId: `draft_${v4()}` as Draft["id"],
      returnPath: `/seasons/${season.id}`,
    });
    setPendingStateKey(stateKey);
    modals.openContextModal({
      modal: "AuthModal",
      innerProps: {
        initialMode: mode,
        actionDescription: `Start a draft for ${season.name}`,
      },
    });
  };

  const executeStartIntent = useCallback(
    async (intent: AuthIntent) => {
      if (intent.kind !== "start-draft" || !slimUser || !season) {
        return {
          result: "failed" as const,
          message:
            "We couldn't finish setting up your draft. Check your connection and try again.",
        };
      }
      const outcome = await createDraft({
        user: slimUser,
        draftId: intent.draftId,
      });
      if (outcome.status === "failed") {
        if (outcome.reason === "permission") {
          return {
            result: "invalid" as const,
            message:
              "Your account isn't allowed to start a draft for this season.",
          };
        }
        return {
          result: "failed" as const,
          message:
            "We couldn't create your draft. Check your connection and try again.",
        };
      }
      // created or already-created: the draft lobby exists either way.
      navigate(`/seasons/${season.id}/draft/${outcome.draftId}`);
      return { result: "completed" as const };
    },
    [createDraft, slimUser, season, navigate],
  );

  const continuation = useAuthContinuation({
    isReady: !!slimUser && !!season,
    stateKey: pendingStateKey,
    matches: (intent) =>
      intent.kind === "start-draft" && intent.seasonId === season?.id,
    execute: executeStartIntent,
  });

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
      {continuation.status === "executing" && (
        <Alert color="blue" variant="light">
          Setting up your draft...
        </Alert>
      )}
      {continuation.status === "failed" && (
        <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />}>
          <Stack gap="xs">
            <Text size="sm">{continuation.error}</Text>
            <Button
              size="xs"
              variant="light"
              onClick={continuation.retry}
              w="fit-content"
            >
              Try again
            </Button>
          </Stack>
        </Alert>
      )}
      {continuation.status === "invalid" && (
        <Alert
          color="orange"
          variant="light"
          icon={<IconAlertCircle size={18} />}
        >
          <Stack gap="xs">
            <Text size="sm">{continuation.error}</Text>
            <Button
              size="xs"
              variant="light"
              component={Link}
              to="/seasons"
              w="fit-content"
            >
              Back to Seasons
            </Button>
          </Stack>
        </Alert>
      )}

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
          <Paper p="md" radius="md" className={classes.loginBanner}>
            <Group gap="md" align="center" wrap="wrap">
              <Text size="sm" c="white" fw={500}>
                Start a draft with friends: create a free account or sign in.
              </Text>
              <Group gap="xs" wrap="nowrap">
                <Button
                  size="sm"
                  variant="white"
                  color="blue"
                  leftSection={<IconUserPlus size={16} />}
                  onClick={() => handleStartDraftIntent("register")}
                >
                  Create account
                </Button>
                <Button
                  size="sm"
                  variant="subtle"
                  c="white"
                  leftSection={<IconLogin size={16} />}
                  onClick={() => handleStartDraftIntent("login")}
                >
                  Sign in
                </Button>
              </Group>
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
