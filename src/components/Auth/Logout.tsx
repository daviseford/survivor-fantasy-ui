import { Button, Center, Stack, Text, Title } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconHome, IconLogin } from "@tabler/icons-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { auth } from "../../firebase";
import { clearAuthIntents } from "./authIntent";

/**
 * Shared signed-out landing. Both operations below are idempotent, so the
 * double effect run under React Strict Mode is safe: intents are cleared and
 * the user is signed out exactly as on a single run.
 */
export const Logout = () => {
  useEffect(() => {
    clearAuthIntents();
    auth.signOut();
  }, []);

  return (
    <Center py="xl">
      <Stack align="center" gap="md" maw={420}>
        <Title order={2} ta="center">
          You're signed out
        </Title>
        <Text c="dimmed" ta="center" size="sm">
          Thanks for playing. Sign back in to pick up your drafts and
          competitions, or keep browsing seasons and castaways for free.
        </Text>
        <Button
          leftSection={<IconLogin size={18} />}
          onClick={() =>
            modals.openContextModal({
              modal: "AuthModal",
              innerProps: { initialMode: "login" },
            })
          }
        >
          Sign in
        </Button>
        <Button
          component={Link}
          to="/"
          variant="subtle"
          size="sm"
          leftSection={<IconHome size={16} />}
        >
          Back to home
        </Button>
      </Stack>
    </Center>
  );
};
