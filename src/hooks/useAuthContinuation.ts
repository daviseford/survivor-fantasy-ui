import { useCallback, useEffect, useRef, useState } from "react";
import {
  claimAuthIntent,
  claimAuthIntentMatching,
  restoreClaimedIntent,
  type AuthIntent,
} from "../components/Auth/authIntent";

/**
 * What a route reports after attempting a claimed intent.
 *
 * - completed: the retained action is done (including idempotent no-ops
 *   such as an already-created draft or an existing membership).
 * - invalid: the action can no longer complete (stale draft, started draft,
 *   permission denial). Never restored, never retried.
 * - failed: transient failure. The intent is restored under its original
 *   state key and can be retried explicitly.
 */
export type ContinuationOutcome = {
  result: "completed" | "invalid" | "failed";
  /** Specific user-facing explanation for invalid/failed results. */
  message?: string;
};

export type ContinuationStatus =
  | "idle"
  | "executing"
  | "completed"
  | "invalid"
  | "failed";

export type UseAuthContinuationInput = {
  /** True once auth state and the route data needed by execute() are ready. */
  isReady: boolean;
  /**
   * In-memory state key from this tab's account-entry flow. After a refresh
   * it is gone, so omit it (or pass null) to fall back to a route-matching
   * scan of pending intents.
   */
  stateKey?: string | null;
  /** Route/id match predicate; a non-matching intent is never executed. */
  matches: (intent: AuthIntent) => boolean;
  /** Perform the retained action once per claim. */
  execute: (intent: AuthIntent) => Promise<ContinuationOutcome>;
};

export type UseAuthContinuationResult = {
  status: ContinuationStatus;
  /** Specific user-facing explanation for invalid/failed status. */
  error: string | null;
  /** Re-claim and re-execute after a transient failure. */
  retry: () => void;
};

/**
 * Consume a single-use authentication intent on a route.
 *
 * Once isReady, the pending intent is claimed (removed from storage) exactly
 * once before any side effect runs, then executed. A ref guard makes React
 * Strict Mode effect replays and re-renders no-ops; the storage claim makes
 * cross-tab double execution impossible. On a transient failure the intent
 * is restored under its original state key (preserving any preallocated
 * draft ID) and retry() claims and executes it again.
 */
export const useAuthContinuation = ({
  isReady,
  stateKey,
  matches,
  execute,
}: UseAuthContinuationInput): UseAuthContinuationResult => {
  const [status, setStatus] = useState<ContinuationStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // Refs hold the latest closures so the claim effect below can run once
  // without retriggering on every render. This sync effect is declared
  // first, so it always runs before the claim effect in the same commit.
  const executeRef = useRef(execute);
  const matchesRef = useRef(matches);
  useEffect(() => {
    executeRef.current = execute;
    matchesRef.current = matches;
  }, [execute, matches]);

  // Set synchronously before any async work so a replayed effect can never
  // claim or execute a second time.
  const startedRef = useRef(false);
  const claimedRef = useRef<{ stateKey: string; intent: AuthIntent } | null>(
    null,
  );

  const run = useCallback(async (key: string, intent: AuthIntent) => {
    setStatus("executing");
    setError(null);

    const outcome = await executeRef.current(intent);

    if (outcome.result === "completed") {
      claimedRef.current = null;
      setStatus("completed");
      return;
    }
    if (outcome.result === "invalid") {
      // The action is no longer valid: never restore, never retry.
      claimedRef.current = null;
      setError(outcome.message ?? null);
      setStatus("invalid");
      return;
    }
    // Transient failure: make the intent pending again under its original
    // key so retry() (or a refresh) resumes the same operation identity.
    restoreClaimedIntent(key, intent);
    setError(outcome.message ?? null);
    setStatus("failed");
  }, []);

  useEffect(() => {
    if (!isReady || startedRef.current) return;

    const claimed = stateKey
      ? (() => {
          const intent = claimAuthIntent(stateKey);
          return intent ? { stateKey, intent } : null;
        })()
      : claimAuthIntentMatching((intent) => matchesRef.current(intent));

    if (!claimed) return;

    if (!matchesRef.current(claimed.intent)) {
      // Belongs to another route: leave it pending for that route.
      restoreClaimedIntent(claimed.stateKey, claimed.intent);
      return;
    }

    startedRef.current = true;
    claimedRef.current = claimed;
    void run(claimed.stateKey, claimed.intent);
  }, [isReady, stateKey, run]);

  const retry = useCallback(() => {
    const claimed = claimedRef.current;
    if (!claimed || status !== "failed") return;

    const intent = claimAuthIntent(claimed.stateKey);
    if (!intent) {
      // Another tab claimed the restored intent and owns execution now.
      claimedRef.current = null;
      setStatus("idle");
      setError(null);
      return;
    }
    void run(claimed.stateKey, intent);
  }, [status, run]);

  return { status, error, retry };
};

export type JoinContinuationDecision =
  | "missing"
  | "already-joined"
  | "unavailable"
  | "join";

/**
 * Pure decision for the join-draft continuation, extracted for testing.
 *
 * - missing: the draft does not exist.
 * - already-joined: the user is already a participant; complete without
 *   another membership write or analytics event.
 * - unavailable: the draft has started; a non-participant can no longer
 *   join (AE3) and no membership write may happen.
 * - join: proceed with the create-if-absent membership transaction.
 */
export const decideJoinContinuation = (args: {
  draftExists: boolean;
  draftStarted: boolean;
  isParticipant: boolean;
}): JoinContinuationDecision => {
  if (!args.draftExists) return "missing";
  if (args.isParticipant) return "already-joined";
  if (args.draftStarted) return "unavailable";
  return "join";
};
