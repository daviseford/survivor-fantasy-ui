import {
  Button,
  Container,
  Group,
  Loader,
  Paper,
  PasswordInput,
  Stack,
  Text,
  Title,
  VisuallyHidden,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AuthError } from "../components/Auth/authErrors";
import {
  mapAuthError,
  RESET_LINK_INVALID_MESSAGE,
} from "../components/Auth/authErrors";
import type { AuthIntent } from "../components/Auth/authIntent";
import { readAuthIntent } from "../components/Auth/authIntent";
import { auth } from "../firebase";
import {
  isResetPasswordRequest,
  parseResetActionParams,
} from "./resetPasswordParams";

/**
 * App-owned Firebase password-reset handler (KTD2).
 *
 * The reset email lands here with Firebase action parameters (mode, oobCode,
 * continueUrl, lang) plus our own opaque continuation state key. The one-time
 * action code is captured into page memory and immediately stripped from the
 * address bar; it is never written to storage, logs, console, or analytics
 * (PageTracker also records only this route's pathname). After the password
 * is updated, sign-in resumes the retained start/join intent through the
 * ordinary AuthModal; this page never claims or executes an intent itself.
 */

type ResetStatus = "verifying" | "invalid" | "form" | "success";

const describeIntent = (intent: AuthIntent): string =>
  intent.kind === "start-draft"
    ? "Sign in to continue starting your draft."
    : "Sign in to continue joining your draft.";

export const ResetPassword = () => {
  const navigate = useNavigate();

  // Capture the action parameters into page memory exactly once...
  const [params] = useState(() =>
    parseResetActionParams(window.location.search, window.location.origin),
  );
  const [status, setStatus] = useState<ResetStatus>(() =>
    isResetPasswordRequest(params) ? "verifying" : "invalid",
  );
  const [email, setEmail] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<AuthError | null>(null);
  const [verifyAttempt, setVerifyAttempt] = useState(0);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<AuthError | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // ...then strip every query parameter from the address bar so the
  // one-time code never lingers in history, bookmarks, or shared URLs.
  useEffect(() => {
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  // Move focus to the result heading whenever verification or submission
  // settles into a new state.
  useEffect(() => {
    if (status !== "verifying") {
      headingRef.current?.focus();
    }
  }, [status]);

  useEffect(() => {
    if (!isResetPasswordRequest(params) || !params.oobCode) return;
    let cancelled = false;
    setStatus("verifying");
    setVerifyError(null);
    verifyPasswordResetCode(auth, params.oobCode)
      .then((verifiedEmail) => {
        if (cancelled) return;
        setEmail(verifiedEmail);
        setStatus("form");
      })
      .catch((error) => {
        if (cancelled) return;
        setVerifyError(mapAuthError(error));
        setStatus("invalid");
      });
    return () => {
      cancelled = true;
    };
  }, [params, verifyAttempt]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (pending || !params.oobCode) return;

    setPending(true);
    setSubmitError(null);
    try {
      await confirmPasswordReset(auth, params.oobCode, password);
      setStatus("success");
    } catch (error) {
      const mapped = mapAuthError(error);
      if (mapped.category === "expired-action-code") {
        // Invalid, expired, or already used: the code is dead, so leave the
        // form and offer a fresh reset request.
        setVerifyError(mapped);
        setStatus("invalid");
      } else {
        // e.g. weak-password: keep the verified code and form so the user
        // can correct the password without re-verifying.
        setSubmitError(mapped);
      }
    } finally {
      setPending(false);
    }
  };

  const openForgotPassword = () => {
    modals.openContextModal({
      modal: "AuthModal",
      innerProps: {
        initialMode: "forgot-password",
        initialEmail: email ?? undefined,
      },
    });
  };

  const openSignIn = () => {
    // Resolve the retained intent non-destructively. The route consumer at
    // intent.returnPath claims and executes it after authentication; this
    // page never claims it. Unknown, expired, or forged keys fall back to
    // ordinary sign-in.
    const intent = params.stateKey ? readAuthIntent(params.stateKey) : null;
    modals.openContextModal({
      modal: "AuthModal",
      innerProps: {
        initialMode: "login",
        initialEmail: email ?? undefined,
        actionDescription: intent ? describeIntent(intent) : undefined,
        onAuthenticated: () => navigate(intent ? intent.returnPath : "/"),
      },
    });
  };

  const heading =
    status === "success"
      ? "Password updated"
      : status === "invalid"
        ? "Reset link no longer valid"
        : "Reset your password";

  const liveMessage =
    status === "verifying"
      ? "Verifying your reset link..."
      : (submitError?.message ??
        (status === "invalid"
          ? (verifyError?.message ?? RESET_LINK_INVALID_MESSAGE)
          : ""));

  return (
    <Container size={460} my={40}>
      <Paper withBorder shadow="md" p={30} radius="md">
        <Title order={1} ta="center" tabIndex={-1} ref={headingRef}>
          {heading}
        </Title>
        <VisuallyHidden aria-live="polite">{liveMessage}</VisuallyHidden>

        {status === "verifying" && (
          <Stack align="center" gap="md" mt="lg">
            <Loader />
            <Text c="dimmed" size="sm">
              Verifying your reset link...
            </Text>
          </Stack>
        )}

        {status === "invalid" && (
          <Stack gap="md" mt="md">
            <Text c="dimmed" size="sm" ta="center">
              {verifyError?.message ?? RESET_LINK_INVALID_MESSAGE}
            </Text>
            <Button fullWidth onClick={openForgotPassword}>
              Request a new reset email
            </Button>
            {params.oobCode &&
              verifyError &&
              verifyError.category !== "expired-action-code" && (
                <Button
                  fullWidth
                  variant="default"
                  onClick={() => setVerifyAttempt((n) => n + 1)}
                >
                  Try again
                </Button>
              )}
          </Stack>
        )}

        {status === "form" && (
          <form onSubmit={onSubmit}>
            <Text size="sm" c="dimmed" mt="md">
              Choose a new password for {email}.
            </Text>
            <PasswordInput
              label="New password"
              placeholder="Your new password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              required
              mt="md"
            />
            {submitError && (
              <Text c="red" mt="lg">
                {submitError.message}
              </Text>
            )}
            <Button fullWidth mt="xl" type="submit" loading={pending}>
              Set new password
            </Button>
          </form>
        )}

        {status === "success" && (
          <Stack gap="md" mt="md">
            <Text c="dimmed" size="sm" ta="center">
              Your password has been updated. Sign in with your new password to
              continue.
            </Text>
            <Group grow>
              <Button onClick={openSignIn}>Sign in</Button>
            </Group>
          </Stack>
        )}
      </Paper>
    </Container>
  );
};
