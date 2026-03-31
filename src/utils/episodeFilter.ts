import { Challenge, Elimination, Episode, GameEvent } from "../types";

/**
 * Determines whether prop bet scoring should be hidden in watch-along mode.
 * Returns true when the competition is in watch-along mode and the finale
 * episode has not yet been revealed.
 */
export function shouldSuppressPropBets(
  currentEpisode: number | null,
  finaleEpisodeOrder: number,
): boolean {
  return currentEpisode !== null && currentEpisode < finaleEpisodeOrder;
}

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

