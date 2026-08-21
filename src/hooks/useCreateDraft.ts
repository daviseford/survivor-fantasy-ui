import { rt_db } from "../firebase";

import { ref, runTransaction } from "firebase/database";
import { useCallback } from "react";
import { v4 } from "uuid";
import { useSeason } from "../hooks/useSeason";
import { Draft, SlimUser } from "../types";
import { trackEvent } from "../utils/analytics";
import {
  buildParticipantMap,
  generateDraftId,
  type RealtimeDraft,
} from "../utils/draftRealtime";

export type CreateDraftOutcome =
  | { status: "created"; draftId: Draft["id"] }
  | { status: "already-created"; draftId: Draft["id"] }
  | { status: "failed"; reason: "permission" | "network" | "unknown" };

export type CreateDraftInput = {
  /**
   * The ready, authoritative user snapshot from the route's auth boundary.
   * This hook never consults its own auth observer, so a lagging observer
   * can never block or duplicate creation.
   */
  user: SlimUser;
  /**
   * Preallocated draft ID from a saved start-draft intent. Keeping the ID
   * stable across retries makes creation idempotent. Generated when omitted.
   */
  draftId?: Draft["id"];
};

const classifyError = (
  error: unknown,
): "permission" | "network" | "unknown" => {
  const code = String((error as { code?: unknown })?.code ?? "").toLowerCase();
  if (code.includes("permission")) return "permission";
  if (
    code.includes("unavailable") ||
    code.includes("network") ||
    code.includes("disconnected")
  ) {
    return "network";
  }
  return "unknown";
};

export const useCreateDraft = () => {
  const { data: season } = useSeason();

  const createDraft = useCallback(
    async ({
      user,
      draftId: preallocatedDraftId,
    }: CreateDraftInput): Promise<CreateDraftOutcome> => {
      if (!season) {
        return { status: "failed", reason: "unknown" };
      }

      const draftId = preallocatedDraftId ?? generateDraftId();

      const newDraft = {
        id: draftId,
        season_id: season.id,
        season_num: season.order,
        competiton_id: `competition_${v4()}` as const,
        creator_uid: user.uid,
        participants: buildParticipantMap([user]),
        total_players: season.players.length,
        pick_order_uids: {},
        turns: {},
        draft_picks: {},
        prop_bets: {},
        state: {
          current_pick_number: 0,
          started: false,
          finished: false,
        },
        created_at: Date.now(),
      } satisfies RealtimeDraft;

      try {
        // Create-if-absent: abort when anything already lives at the path so
        // replays, double executions, and cross-tab races converge on one draft.
        const result = await runTransaction(
          ref(rt_db, "drafts/" + draftId),
          (current: RealtimeDraft | null) => {
            if (current) return undefined;
            return newDraft;
          },
        );

        if (result.committed) {
          trackEvent("draft_created", { season_num: season.order });
          return { status: "created", draftId };
        }

        // Aborted because a draft already exists at the preallocated ID. When
        // it is this user's own draft for this season, a prior attempt already
        // succeeded: treat as success without a second analytics event.
        const existing = result.snapshot.val() as RealtimeDraft | null;
        if (
          existing?.creator_uid === user.uid &&
          existing.season_id === season.id
        ) {
          return { status: "already-created", draftId };
        }

        return { status: "failed", reason: "permission" };
      } catch (error) {
        return { status: "failed", reason: classifyError(error) };
      }
    },
    [season],
  );

  return { createDraft };
};
