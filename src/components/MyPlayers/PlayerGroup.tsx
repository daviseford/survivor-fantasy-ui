import { Avatar, Tooltip } from "@mantine/core";
import { useCompetition } from "../../hooks/useCompetition";
import { useCompetitionMeta } from "../../hooks/useCompetitionMeta";
import { useIsMobile } from "../../hooks/useIsMobile";
import { SlimUser } from "../../types";
import { getAcquisitionLabel } from "../../utils/tradeUtils";

export const PlayerGroup = ({ uid }: { uid: SlimUser["uid"] }) => {
  const isMobile = useIsMobile();

  const { data: competition } = useCompetition();
  const { survivorsByUserUid, eliminatedSurvivors, drafters, acquisitions } =
    useCompetitionMeta();

  const userSurvivors = survivorsByUserUid[uid];

  if (!userSurvivors?.length) return null;

  return (
    <Avatar.Group spacing={isMobile ? "xs" : "lg"}>
      {userSurvivors?.map((p) => {
        const isEliminated = eliminatedSurvivors.includes(p.castaway_id);

        const avatarStyle = isEliminated ? { filter: "grayscale(1)" } : {};

        const acquisition = acquisitions[p.castaway_id];
        const label = [
          p.full_name,
          isEliminated ? "(Eliminated)" : null,
          acquisition
            ? getAcquisitionLabel(
                acquisition,
                drafters[p.castaway_id],
                competition?.participants ?? [],
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
              alt={p.full_name}
              imageProps={{ loading: "lazy" }}
            />
          </Tooltip>
        );
      })}
    </Avatar.Group>
  );
};
