import { describe, expect, it } from "vitest";
import {
  isResetPasswordRequest,
  parseResetActionParams,
} from "../resetPasswordParams";

const ORIGIN = "https://grabyourtorch.com";

describe("parseResetActionParams", () => {
  it("parses mode, oobCode, and a direct state param", () => {
    const params = parseResetActionParams(
      "?mode=resetPassword&oobCode=CODE123&state=abc123&lang=en",
      ORIGIN,
    );

    expect(params).toEqual({
      mode: "resetPassword",
      oobCode: "CODE123",
      stateKey: "abc123",
      lang: "en",
    });
  });

  it("returns nulls when parameters are absent", () => {
    expect(parseResetActionParams("", ORIGIN)).toEqual({
      mode: null,
      oobCode: null,
      stateKey: null,
      lang: null,
    });
  });

  it("reads the state key from a same-origin continue URL when no direct state param exists", () => {
    const params = parseResetActionParams(
      `?mode=resetPassword&oobCode=CODE123&continueUrl=${encodeURIComponent(
        "https://grabyourtorch.com/reset-password?state=fromcontinue",
      )}`,
      ORIGIN,
    );

    expect(params.stateKey).toBe("fromcontinue");
  });

  it("prefers a direct state param over the continue URL state", () => {
    const params = parseResetActionParams(
      `?mode=resetPassword&oobCode=CODE123&state=direct&continueUrl=${encodeURIComponent(
        "https://grabyourtorch.com/reset-password?state=fromcontinue",
      )}`,
      ORIGIN,
    );

    expect(params.stateKey).toBe("direct");
  });

  it("ignores the state inside a cross-origin continue URL", () => {
    const params = parseResetActionParams(
      `?mode=resetPassword&oobCode=CODE123&continueUrl=${encodeURIComponent(
        "https://evil.example.com/reset-password?state=forged",
      )}`,
      ORIGIN,
    );

    expect(params.stateKey).toBeNull();
  });

  it("ignores a malformed continue URL", () => {
    const params = parseResetActionParams(
      "?mode=resetPassword&oobCode=CODE123&continueUrl=%%%not-a-url",
      ORIGIN,
    );

    expect(params.stateKey).toBeNull();
  });

  it("ignores a continue URL without a state param", () => {
    const params = parseResetActionParams(
      `?mode=resetPassword&oobCode=CODE123&continueUrl=${encodeURIComponent(
        "https://grabyourtorch.com/reset-password",
      )}`,
      ORIGIN,
    );

    expect(params.stateKey).toBeNull();
  });
});

describe("isResetPasswordRequest", () => {
  it("accepts a resetPassword mode with a non-empty oobCode", () => {
    expect(
      isResetPasswordRequest({
        mode: "resetPassword",
        oobCode: "CODE123",
        stateKey: null,
        lang: null,
      }),
    ).toBe(true);
  });

  it("rejects other action modes", () => {
    expect(
      isResetPasswordRequest({
        mode: "verifyEmail",
        oobCode: "CODE123",
        stateKey: null,
        lang: null,
      }),
    ).toBe(false);
  });

  it("rejects a missing or empty oobCode", () => {
    expect(
      isResetPasswordRequest({
        mode: "resetPassword",
        oobCode: null,
        stateKey: null,
        lang: null,
      }),
    ).toBe(false);
    expect(
      isResetPasswordRequest({
        mode: "resetPassword",
        oobCode: "",
        stateKey: null,
        lang: null,
      }),
    ).toBe(false);
  });
});
