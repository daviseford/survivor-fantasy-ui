import { Challenge, Elimination, Episode, GameEvent } from "../types";

type HasEpisodeNum = Challenge | Elimination | GameEvent;

/**
 * Filters season data by episode boundary for watch-along mode.
 *
 * - For episodes (arrays with `order` field): returns episodes where `order <= maxEpisode`
 * - For gameplay records (Records with `episode_num` field): returns entries where `episode_num <= maxEpisode`
 * - When `maxEpisode` is `null`, returns data unchanged (live mode)
 */
export function filterEpisodesByMax<T extends Episode>(
  episodes: T[],
  maxEpisode: number | null,
): T[] {
  if (maxEpisode === null) return episodes;
  return episodes.filter((e) => e.order <= maxEpisode);
}

export function filterRecordByEpisode<T extends HasEpisodeNum>(
  data: Record<string, T>,
  maxEpisode: number | null,
): Record<string, T> {
  if (maxEpisode === null) return data;
  return Object.fromEntries(
    Object.entries(data).filter(([, v]) => v.episode_num <= maxEpisode),
  );
}

export function filterArrayByEpisode<T extends HasEpisodeNum>(
  data: T[],
  maxEpisode: number | null,
): T[] {
  if (maxEpisode === null) return data;
  return data.filter((item) => item.episode_num <= maxEpisode);
}
