import { Avatar, Group, Title, Tooltip } from "@mantine/core";
import { useDraft } from "../../hooks/useDraft";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useSeason } from "../../hooks/useSeason";
import { useUser } from "../../hooks/useUser";

export const MyDraftedPlayers = () => {
  const { slimUser } = useUser();

  const isMobile = useIsMobile();

  const { draft } = useDraft();
  const { data: season } = useSeason(draft?.season_id);

  const myPlayerNames = (draft?.draft_picks || [])
    .filter((x) => x.user_uid === slimUser?.uid)
    .map((x) => x.player_name);

  const myPlayerInfo = (season?.players || []).filter((p) =>
    myPlayerNames.includes(p.name),
  );

  if (!myPlayerInfo?.length) return null;

  return (
    <>
      <Group>
        <Title order={3}>My Players</Title>
        <Avatar.Group spacing={"lg"}>
          {myPlayerInfo?.map((p) => (
            <Tooltip label={p.name}>
              <Avatar key={p.name} src={p.img} size={isMobile ? "lg" : "xl"} />
            </Tooltip>
          ))}
        </Avatar.Group>
      </Group>
    </>
  );
};
