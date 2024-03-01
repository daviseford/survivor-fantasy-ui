import { Avatar, Tooltip } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useCompetitionMeta } from "../../hooks/useCompetitionMeta";

export const MyPlayers = () => {
  const matches = useMediaQuery("(max-width: 540px");

  const { myPlayers, eliminatedPlayers } = useCompetitionMeta();

  return (
    <Avatar.Group spacing={"lg"}>
      {myPlayers?.map((p) => {
        const avatarStyle = eliminatedPlayers.includes(p.name)
          ? { filter: "grayscale(1)" }
          : {};

        return (
          <Tooltip label={p.name}>
            <Avatar
              key={p.name}
              src={p.img}
              size={matches ? "lg" : "xl"}
              style={avatarStyle}
            />
          </Tooltip>
        );
      })}
    </Avatar.Group>
  );
};
