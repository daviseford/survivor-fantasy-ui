import { Challenge, Elimination, Episode, GameEvent, Season } from "../types";

/**
 * Helpers for reasoning about episode air dates vs. collected scoring data.
 *
 * Air dates come from survivoR (`Episode.air_date`) and tell us when an
 * episode aired; scoring data (challenges/eliminations/events) lags behind
 * by hours because the data sync runs on a daily schedule.
 */

const toLocalISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const byOrder = (a: Episode, b: Episode) => a.order - b.order;

/**
 * The highest episode number present in the scoring data, or 0 when the
 * season has no scoring records yet (e.g. before the premiere).
 */
export function getLatestDataEpisode(
  challenges: Record<string, Challenge>,
  eliminations: Record<string, Elimination>,
  events: Record<string, GameEvent>,
): number {
  let max = 0;
  for (const record of [
    ...Object.values(challenges),
    ...Object.values(eliminations),
    ...Object.values(events),
  ]) {
    if (record.episode_num > max) max = record.episode_num;
  }
  return max;
}

/**
 * The lowest-order episode that has aired but has no scoring data yet,
 * or null when the data is caught up with the broadcast schedule.
 *
 * Episodes without an air date (historical seasons) are ignored.
 */
export function getAwaitingDataEpisode(
  season: Season,
  latestDataEpisode: number,
  today: Date = new Date(),
): Episode | null {
  const todayISO = toLocalISODate(today);
  return (
    [...(season.episodes ?? [])]
      .sort(byOrder)
      .find(
        (ep) =>
          ep.air_date !== undefined &&
          ep.air_date <= todayISO &&
          ep.order > latestDataEpisode,
      ) ?? null
  );
}

/**
 * The next episode scheduled to air after today, or null when the season
 * has no future-dated episodes.
 */
export function getNextAiringEpisode(
  season: Season,
  today: Date = new Date(),
): Episode | null {
  const todayISO = toLocalISODate(today);
  return (
    [...(season.episodes ?? [])]
      .sort(byOrder)
      .find((ep) => ep.air_date !== undefined && ep.air_date > todayISO) ?? null
  );
}
