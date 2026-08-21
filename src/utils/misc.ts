import { SlimUser } from "../types";

// https://stackoverflow.com/a/31615643
export const getNumberWithOrdinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"],
    v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/** Display name for a participant uid, falling back to their email. */
export const getParticipantName = (
  participants: SlimUser[],
  uid: string,
): string => {
  const participant = participants.find((p) => p.uid === uid);
  return (
    participant?.displayName || participant?.email || "Unknown participant"
  );
};
