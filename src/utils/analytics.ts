import { logEvent } from "firebase/analytics";

import { analytics } from "../firebase";

/**
 * Log a GA4 event. No-ops when analytics is unavailable
 * (dev/test builds, unsupported browsers, or before init resolves).
 */
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, unknown>,
) => {
  if (analytics) {
    logEvent(analytics, eventName, eventParams);
  }
};
