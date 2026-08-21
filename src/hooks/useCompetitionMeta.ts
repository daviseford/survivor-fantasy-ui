import { useMemo } from "react";
import { CastawayId, Player } from "../types";
import { filterRecordByEpisode } from "../utils/episodeFilter";
import {
  getAcquisitionsAtEpisode,
  getCurrentOwners,
  getDrafters,
  getOwnersAtEpisode,
  getRosterEpisode,
  getUpcomingMoves,
} from "../utils/tradeUtils";
import { useCompetition } from "./useCompetition";
import { useEliminations } from "./useEliminations";
import { useSeason } from "./useSeason";
import { useTrades } from "./useTrades";
import { useUser } from "./useUser";

export const useCompetitionMeta = () => {
  const { slimUser } = useUser();

  const { data: competition } = useCompetition();
  const { data: season } = useSeason(competition?.season_id);
  const { data: eliminations } = useEliminations(competition?.season_id);
  const { data: trades } = useTrades(competition?.id);

  const maxEpisode = competition?.current_episode ?? null;

  const filteredEliminations = useMemo(
    () => filterRecordByEpisode(eliminations || {}, maxEpisode),
    [eliminations, maxEpisode],
  );

  // Two ownership questions with different answers while a trade's cutoff is
  // still ahead of the competition:
  //   - display (rosters, scoring, badges): who owns the castaway as of the
  //     episode the competition is on -- an accepted trade stays invisible
  //     until its cutoff episode is revealed.
  //   - trading (propose/accept eligibility): who owns the castaway after
  //     every accepted trade -- a player already promised away cannot be
  //     offered again, even while the roster still displays them.
  const rosterEpisode = competition ? getRosterEpisode(competition) : Infinity;
  // A cutoff past the season's last episode can never be revealed; the
  // display helpers treat it as already effective rather than pending forever.
  const lastEpisode = season?.episodes?.length;

  const displayOwners = useMemo(
    () =>
      getOwnersAtEpisode(
        competition?.draft_picks || [],
        trades,
        rosterEpisode,
        lastEpisode,
      ),
    [competition?.draft_picks, trades, rosterEpisode, lastEpisode],
  );

  const currentOwners = useMemo(
    () => getCurrentOwners(competition?.draft_picks || [], trades),
    [competition?.draft_picks, trades],
  );

  // Rosters follow ownership, but the UI still has to be able to say where a
  // castaway came from: drafted here, or acquired in a trade.
  const drafters = useMemo(
    () => getDrafters(competition?.draft_picks || []),
    [competition?.draft_picks],
  );

  const acquisitions = useMemo(
    () =>
      getAcquisitionsAtEpisode(
        competition?.draft_picks || [],
        trades,
        rosterEpisode,
        lastEpisode,
      ),
    [competition?.draft_picks, trades, rosterEpisode, lastEpisode],
  );

  // Accepted trades whose cutoff the competition has not revealed yet, keyed
  // by castaway -- what "next episode" indicators render from.
  const upcomingMoves = useMemo(
    () =>
      getUpcomingMoves(
        competition?.draft_picks || [],
        trades,
        rosterEpisode,
        lastEpisode,
      ),
    [competition?.draft_picks, trades, rosterEpisode, lastEpisode],
  );

  const groupByOwner = (owners: Record<CastawayId, string>) =>
    (competition?.participants || []).reduce<Record<string, Player[]>>(
      (accum, user) => {
        const castawayIds = (Object.entries(owners) as [CastawayId, string][])
          .filter(([, uid]) => uid === user?.uid)
          .map(([id]) => id);

        accum[user.uid] = castawayIds.reduce<Player[]>((accum, id) => {
          const _p = season?.players.find((p) => p.castaway_id === id);

          if (_p) accum.push(_p);

          return accum;
        }, []);

        return accum;
      },
      {},
    );

  const survivorsByUserUid = groupByOwner(displayOwners);
  const tradableSurvivorsByUserUid = groupByOwner(currentOwners);

  // Castaways arriving on each roster at the next reveal, for previews on the
  // receiving team's card.
  const incomingByUserUid = (
    Object.entries(upcomingMoves) as [
      CastawayId,
      (typeof upcomingMoves)[CastawayId],
    ][]
  ).reduce<
    Record<
      string,
      { player: Player; fromUid: string; landsNextEpisode: boolean }[]
    >
  >((accum, [id, move]) => {
    const player = season?.players.find((p) => p.castaway_id === id);
    if (player) {
      (accum[move.toUid] ??= []).push({
        player,
        fromUid: move.fromUid,
        landsNextEpisode: move.landsNextEpisode,
      });
    }
    return accum;
  }, {});

  const mySurvivors: CastawayId[] = slimUser?.uid
    ? survivorsByUserUid[slimUser?.uid]?.map((x) => x.castaway_id)
    : [];

  const eliminatedSurvivors: CastawayId[] = Object.values(
    filteredEliminations,
  ).map((x) => x.castaway_id);

  return {
    mySurvivors,
    eliminatedSurvivors,
    survivorsByUserUid,
    tradableSurvivorsByUserUid,
    incomingByUserUid,
    upcomingMoves,
    displayOwners,
    currentOwners,
    drafters,
    acquisitions,
  };
};
