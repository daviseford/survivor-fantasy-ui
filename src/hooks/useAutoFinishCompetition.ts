import { doc, updateDoc } from "firebase/firestore";
import { useEffect, useRef } from "react";
import { db } from "../firebase";
import { Competition, Episode, GameEvent, SlimUser } from "../types";

/**
 * Pure gate function that determines whether the auto-finish write should fire.
 * Extracted for testability.
 */
export const shouldAutoFinish = (args: {
  events: Record<string, GameEvent>;
  competition: Competition | undefined;
  episodes: Episode[];
  slimUser: SlimUser | null | undefined;
}): boolean => {
  const { events, competition, episodes, slimUser } = args;

  if (!competition || !slimUser) return false;

  // Already finished — no write needed
  if (competition.finished) return false;

  // Check for win_survivor in unfiltered events
  const hasWinner = Object.values(events).some(
    (e) => e.action === "win_survivor",
  );
  if (!hasWinner) return false;

  // Episode gate for watch-along spoiler protection
  if (competition.current_episode != null) {
    const finaleEpisode = episodes.find((e) => e.finale);
    if (!finaleEpisode) return false;
    if (competition.current_episode < finaleEpisode.order) return false;
  }

  // Only creator or admin can write (Firestore rules enforce this)
  const isCreator = slimUser.uid === competition.creator_uid;
  if (!isCreator && !slimUser.isAdmin) return false;

  return true;
};

/**
 * Auto-detects when a competition's season has ended and sets finished: true.
 *
 * Uses UNFILTERED events (not the episode-filtered events from usePropBetScoring)
 * so watch-along competitions can detect the season is over even when the user
 * hasn't caught up to the finale episode.
 *
 * Only fires for the competition creator or an admin (Firestore rules require this).
 */
export const useAutoFinishCompetition = (args: {
  events: Record<string, GameEvent>;
  competition: Competition | undefined;
  episodes: Episode[];
  slimUser: SlimUser | null | undefined;
}) => {
  const { events, competition, episodes, slimUser } = args;
  const attemptedRef = useRef(false);

  useEffect(() => {
    // Reset attempted flag if competition changes or finished changes
    attemptedRef.current = false;
  }, [competition?.id, competition?.finished]);

  useEffect(() => {
    if (attemptedRef.current) return;
    if (!shouldAutoFinish({ events, competition, episodes, slimUser })) return;

    attemptedRef.current = true;

    updateDoc(doc(db, "competitions", competition!.id), {
      finished: true,
    }).catch((err) => {
      console.error("useAutoFinishCompetition: failed to set finished", err);
    });
  }, [events, competition, episodes, slimUser]);
};
