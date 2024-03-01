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
        const avatarStyle = eliminatedSurvivors.includes(p.name)
          ? { filter: "grayscale(1)" }
          : {};

        return (
          <Tooltip label={p.name + " (Eliminated)"}>
            <Avatar key={p.name} src={p.img} size={""} style={avatarStyle} />
          </Tooltip>
        );
      })}
    </Avatar.Group>
  );
};
