import { Avatar, Tooltip } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useCompetition } from "../../hooks/useCompetition";
import { useSeason } from "../../hooks/useSeason";
import { useUser } from "../../hooks/useUser";

export const MyPlayers = () => {
  const { slimUser } = useUser();

  const matches = useMediaQuery("(max-width: 540px");

  const { data: competition } = useCompetition();
  const { data: season } = useSeason(competition?.season_id);

  const myPlayerNames = competition?.draft_picks
    .filter((x) => x.user_uid === slimUser?.uid)
    .map((x) => x.player_name);

  const myPlayerInfo = (season?.players || []).filter((p) =>
    myPlayerNames?.includes(p.name),
  );

  return (
    <>
      <Avatar.Group spacing={"lg"}>
        {myPlayerInfo?.map((p) => (
          <Tooltip label={p.name}>
            <Avatar key={p.name} src={p.img} size={matches ? "lg" : "xl"} />
          </Tooltip>
        ))}
      </Avatar.Group>
    </>
  );
};
