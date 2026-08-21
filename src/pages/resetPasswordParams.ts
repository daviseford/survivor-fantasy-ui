/**
 * Pure parsing helpers for the app-owned password-reset route (KTD2).
 * Kept component-free so they stay unit-testable in a Node environment.
 */

export type ResetActionParams = {
  mode: string | null;
  oobCode: string | null;
  /** Our own opaque continuation key, never raw intent fields. */
  stateKey: string | null;
  lang: string | null;
};

/**
 * Parse the Firebase action parameters from a location search string. When
 * no direct state param exists, fall back to the state inside continueUrl,
 * but only when the continue URL is same-origin; cross-origin or malformed
 * continue URLs are ignored and never navigated to.
 */
export const parseResetActionParams = (
  search: string,
  origin: string,
): ResetActionParams => {
  const params = new URLSearchParams(search);
  let stateKey = params.get("state");
  const continueUrl = params.get("continueUrl");
  if (!stateKey && continueUrl) {
    try {
      const url = new URL(continueUrl, origin);
      if (url.origin === origin) {
        stateKey = url.searchParams.get("state");
      }
    } catch {
      // Malformed continue URL; ignore it entirely.
    }
  }
  return {
    mode: params.get("mode"),
    oobCode: params.get("oobCode"),
    stateKey,
    lang: params.get("lang"),
  };
};

/** Only a resetPassword mode with a present code can drive this page. */
export const isResetPasswordRequest = (params: ResetActionParams): boolean =>
  params.mode === "resetPassword" &&
  typeof params.oobCode === "string" &&
  params.oobCode.length > 0;
