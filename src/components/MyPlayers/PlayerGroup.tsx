import { Avatar, Tooltip } from "@mantine/core";
import { useCompetitionMeta } from "../../hooks/useCompetitionMeta";
import { useIsMobile } from "../../hooks/useIsMobile";
import { SlimUser } from "../../types";

export const PlayerGroup = ({ uid }: { uid: SlimUser["uid"] }) => {
  const isMobile = useIsMobile();

  const { survivorsByUserUid, eliminatedSurvivors } = useCompetitionMeta();

  const userSurvivors = survivorsByUserUid[uid];

  if (!userSurvivors?.length) return null;

  return (
    <Avatar.Group spacing={isMobile ? "xs" : "lg"}>
      {userSurvivors?.map((p) => {
        const isEliminated = eliminatedSurvivors.includes(p.castaway_id);

        const avatarStyle = isEliminated ? { filter: "grayscale(1)" } : {};

        const label = `${p.full_name}${isEliminated ? " (Eliminated)" : ""}`;

        return (
          <Tooltip label={label} key={p.castaway_id}>
            <Avatar
              key={p.castaway_id}
              src={p.img}
              size="md"
              style={avatarStyle}
              alt={p.full_name}
            />
          </Tooltip>
        );
      })}
    </Avatar.Group>
  );
};
