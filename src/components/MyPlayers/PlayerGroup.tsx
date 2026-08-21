import { Avatar, Tooltip } from "@mantine/core";
import { useCompetition } from "../../hooks/useCompetition";
import { useCompetitionMeta } from "../../hooks/useCompetitionMeta";
import { useIsMobile } from "../../hooks/useIsMobile";
import { SlimUser } from "../../types";
import { getParticipantName } from "../../utils/misc";
import {
  getAcquisitionLabel,
  getUpcomingMoveTiming,
} from "../../utils/tradeUtils";

export const PlayerGroup = ({ uid }: { uid: SlimUser["uid"] }) => {
  const isMobile = useIsMobile();

  const { data: competition } = useCompetition();
  const {
    survivorsByUserUid,
    eliminatedSurvivors,
    drafters,
    acquisitions,
    upcomingMoves,
    incomingByUserUid,
  } = useCompetitionMeta();

  const participants = competition?.participants ?? [];
  const userSurvivors = survivorsByUserUid[uid];
  const incoming = incomingByUserUid[uid] ?? [];

  if (!userSurvivors?.length && !incoming.length) return null;

  return (
    <Avatar.Group spacing={isMobile ? "xs" : "lg"}>
      {userSurvivors?.map((p) => {
        const isEliminated = eliminatedSurvivors.includes(p.castaway_id);
        const upcomingMove = upcomingMoves[p.castaway_id];

        const avatarStyle = {
          ...(isEliminated ? { filter: "grayscale(1)" } : {}),
          // Leaving in an accepted trade: ring the avatar until the cutoff
          // episode is revealed and the swap actually lands.
          ...(upcomingMove
            ? {
                outline: "2px solid var(--mantine-color-yellow-8)",
                outlineOffset: -2,
              }
            : {}),
        };

        const acquisition = acquisitions[p.castaway_id];
        const label = [
          p.full_name,
          isEliminated ? "(Eliminated)" : null,
          upcomingMove
            ? `Trades to ${getParticipantName(participants, upcomingMove.toUid)} ${getUpcomingMoveTiming(upcomingMove)}`
            : null,
          acquisition
            ? getAcquisitionLabel(
                acquisition,
                drafters[p.castaway_id],
                participants,
              )
            : null,
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <Tooltip label={label} key={p.castaway_id}>
            <Avatar
              key={p.castaway_id}
              src={p.img}
              size={isMobile ? "md" : "lg"}
              style={avatarStyle}
              alt={upcomingMove ? `${p.full_name} (trading away)` : p.full_name}
              imageProps={{ loading: "lazy" }}
            />
          </Tooltip>
        );
      })}
      {incoming.map(({ player, fromUid, landsNextEpisode }) => {
        const timing = landsNextEpisode
          ? "next episode"
          : "in an upcoming episode";
        const label = `${player.full_name} · Joins from ${getParticipantName(
          participants,
          fromUid,
        )} ${timing}`;
        return (
          <Tooltip label={label} key={player.castaway_id}>
            <Avatar
              src={player.img}
              size={isMobile ? "md" : "lg"}
              style={{
                opacity: 0.5,
                outline: "2px dashed var(--mantine-color-yellow-8)",
                outlineOffset: -2,
              }}
              alt={`${player.full_name} (arriving ${timing})`}
              imageProps={{ loading: "lazy" }}
            />
          </Tooltip>
        );
      })}
    </Avatar.Group>
  );
};
