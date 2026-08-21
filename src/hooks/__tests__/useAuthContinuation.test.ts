import { describe, expect, it } from "vitest";
import {
  decideJoinContinuation,
  isNewClaimStateKey,
} from "../useAuthContinuation";

describe("decideJoinContinuation", () => {
  it("returns missing when the draft does not exist", () => {
    expect(
      decideJoinContinuation({
        draftExists: false,
        draftStarted: false,
        isParticipant: false,
      }),
    ).toBe("missing");
  });

  it("returns already-joined for a participant without requiring a write", () => {
    expect(
      decideJoinContinuation({
        draftExists: true,
        draftStarted: false,
        isParticipant: true,
      }),
    ).toBe("already-joined");
  });

  it("returns already-joined for a participant even after the draft started", () => {
    expect(
      decideJoinContinuation({
        draftExists: true,
        draftStarted: true,
        isParticipant: true,
      }),
    ).toBe("already-joined");
  });

  it("returns unavailable for a non-participant once the draft has started", () => {
    expect(
      decideJoinContinuation({
        draftExists: true,
        draftStarted: true,
        isParticipant: false,
      }),
    ).toBe("unavailable");
  });

  it("returns join for a non-participant on an open draft", () => {
    expect(
      decideJoinContinuation({
        draftExists: true,
        draftStarted: false,
        isParticipant: false,
      }),
    ).toBe("join");
  });
});

describe("isNewClaimStateKey", () => {
  it("allows a fresh claim cycle when a different state key arrives", () => {
    expect(isNewClaimStateKey("key-a", "key-b")).toBe(true);
  });

  it("blocks a replayed effect carrying the same state key", () => {
    expect(isNewClaimStateKey("key-a", "key-a")).toBe(false);
  });

  it("blocks the scan path (no state key) from resetting the guard", () => {
    expect(isNewClaimStateKey("key-a", null)).toBe(false);
    expect(isNewClaimStateKey("key-a", undefined)).toBe(false);
    expect(isNewClaimStateKey("__scan__", null)).toBe(false);
  });

  it("treats a fresh key after the scan sentinel as new", () => {
    expect(isNewClaimStateKey("__scan__", "key-a")).toBe(true);
  });

  it("is a harmless no-op when the guard has not started yet", () => {
    // Resetting null -> null changes nothing; the scan path stays blocked.
    expect(isNewClaimStateKey(null, "key-a")).toBe(true);
    expect(isNewClaimStateKey(null, null)).toBe(false);
  });
});
