import { Challenge, Elimination, Episode, GameEvent, Season } from "../types";

/**
 * Helpers for reasoning about episode air dates vs. collected scoring data.
 *
 * Air dates come from survivoR (`Episode.air_date`) and tell us when an
 * episode aired; scoring data (challenges/eliminations/events) lags behind
 * by hours because the data sync runs on a daily schedule.
 */

// CBS airs Survivor at 8 PM ET/PT. Wait for the West Coast broadcast so the
// banner cannot announce an episode before it has aired across the mainland US.
const SURVIVOR_TIME_ZONE = "America/Los_Angeles";
const SURVIVOR_AIR_HOUR = 20;

const broadcastDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SURVIVOR_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

const toBroadcastDateTime = (date: Date): { date: string; hour: number } => {
  const parts = Object.fromEntries(
    broadcastDateTimeFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
  };
};

/**
 * Today's date (YYYY-MM-DD) in the broadcast timezone.
 *
 * Anything that compares against `Episode.air_date` must use this rather than
 * the viewer's local date, or two users in different timezones disagree about
 * what "today" is at the same instant.
 */
export const getBroadcastDate = (now: Date = new Date()): string =>
  toBroadcastDateTime(now).date;

const hasAired = (airDate: string, now: Date): boolean => {
  const broadcastNow = toBroadcastDateTime(now);
  return (
    airDate < broadcastNow.date ||
    (airDate === broadcastNow.date && broadcastNow.hour >= SURVIVOR_AIR_HOUR)
  );
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
  now: Date = new Date(),
): Episode | null {
  return (
    [...(season.episodes ?? [])]
      .sort(byOrder)
      .find(
        (ep) =>
          ep.air_date !== undefined &&
          hasAired(ep.air_date, now) &&
          ep.order > latestDataEpisode,
      ) ?? null
  );
}

interface CompetitionAwaitingDataInput {
  season: Season;
  latestDataEpisode: number;
  isScoringDataReady: boolean;
  currentEpisode: number | null | undefined;
  finished: boolean;
  hasWinner: boolean;
  now?: Date;
}

/**
 * Applies competition visibility rules to the aired-but-unsynced episode.
 */
export function getCompetitionAwaitingDataEpisode({
  season,
  latestDataEpisode,
  isScoringDataReady,
  currentEpisode,
  finished,
  hasWinner,
  now = new Date(),
}: CompetitionAwaitingDataInput): Episode | null {
  const isCaughtUp =
    currentEpisode == null || currentEpisode >= latestDataEpisode;

  if (!isScoringDataReady || finished || hasWinner || !isCaughtUp) {
    return null;
  }

  return getAwaitingDataEpisode(season, latestDataEpisode, now);
}

/**
 * The next episode scheduled to air after today, or null when the season
 * has no future-dated episodes.
 */
export function getNextAiringEpisode(
  season: Season,
  now: Date = new Date(),
): Episode | null {
  const broadcastDate = toBroadcastDateTime(now).date;
  return (
    [...(season.episodes ?? [])]
      .sort(byOrder)
      .find((ep) => ep.air_date !== undefined && ep.air_date > broadcastDate) ??
    null
  );
}
