import { describe, expect, it } from "vitest";
import type { SlimUser } from "../../types";
import {
  buildParticipantMap,
  buildPickOrderUidMap,
  buildTurnsMap,
  normalizeDraft,
} from "../draftRealtime";

const userA = {
  uid: "user_a",
  email: "a@example.com",
  displayName: "A",
  isAdmin: false,
} satisfies SlimUser;

const userB = {
  uid: "user_b",
  email: "b@example.com",
  displayName: "B",
  isAdmin: false,
} satisfies SlimUser;

describe("draftRealtime", () => {
  it("builds deterministic turn assignments", () => {
    expect(buildTurnsMap([userA, userB], 5)).toEqual({
      "1": "user_a",
      "2": "user_b",
      "3": "user_a",
      "4": "user_b",
      "5": "user_a",
    });
  });

  it("normalizes realtime drafts into UI drafts", () => {
    const draft = normalizeDraft({
      id: "draft_test",
      season_id: "season_1",
      season_num: 1,
      competiton_id: "competition_test",
      creator_uid: userA.uid,
      total_players: 4,
      participants: buildParticipantMap([userA, userB]),
      pick_order_uids: buildPickOrderUidMap([userA, userB]),
      turns: buildTurnsMap([userA, userB], 4),
      draft_picks: {
        "1": {
          season_id: "season_1",
          season_num: 1,
          order: 1,
          user_uid: userA.uid,
          user_name: "A",
          castaway_id: "US0001",
          player_name: "Player 1",
        },
      },
      prop_bets: {
        [userB.uid]: {
          id: "propbet_1",
          user_uid: userB.uid,
          user_name: "B",
          values: {
            propbet_first_vote: "US0001",
            propbet_ftc: "US0002",
            propbet_idols: "US0003",
            propbet_immunities: "US0004",
            propbet_medical_evac: "No",
            propbet_winner: "US0005",
          },
        },
      },
      state: {
        started: true,
        finished: false,
        current_pick_number: 2,
      },
    });

    expect(draft).toBeDefined();
    expect(draft?.participants.map((participant) => participant.uid)).toEqual([
      userA.uid,
      userB.uid,
    ]);
    expect(draft?.pick_order.map((participant) => participant.uid)).toEqual([
      userA.uid,
      userB.uid,
    ]);
    expect(draft?.current_picker?.uid).toBe(userB.uid);
    expect(draft?.draft_picks).toHaveLength(1);
    expect(draft?.prop_bets).toHaveLength(1);
  });
});
