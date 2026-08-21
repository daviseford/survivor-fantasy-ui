import { describe, expect, it } from "vitest";
import { decideJoinContinuation } from "../useAuthContinuation";

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
