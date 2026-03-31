import { PlayerMeta } from "../types";

/**
 * Derives a pipe-delimited description string from structured PlayerMeta fields.
 * Matches the format consumed by Draft.tsx: "Age: 31 | Hometown: Miami, Florida | Occupation: Musician"
 */
export function formatDescription(meta: PlayerMeta): string | undefined {
  const parts: string[] = [];
  if (meta.ageOnSeason !== undefined) parts.push(`Age: ${meta.ageOnSeason}`);
  if (meta.hometown) parts.push(`Hometown: ${meta.hometown}`);
  if (meta.profession) parts.push(`Occupation: ${meta.profession}`);
  if (meta.previousSeasons?.length) {
    parts.push(`Seasons: ${meta.previousSeasons.join(", ")}`);
  }
  return parts.length > 0 ? parts.join(" | ") : undefined;
}
