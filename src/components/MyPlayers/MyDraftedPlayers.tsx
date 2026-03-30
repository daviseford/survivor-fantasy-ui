import { Avatar, Badge, Group, Paper, Text, Tooltip } from "@mantine/core";
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
    <Paper p="sm" radius="md" withBorder>
      <Group gap="sm" align="center">
        <Text size="sm" fw={600}>
          My Team
        </Text>
        <Badge variant="light" size="sm" color="blue">
          {myPlayerInfo.length}
        </Badge>
        <Avatar.Group spacing="sm">
          {myPlayerInfo.map((p) => (
            <Tooltip label={p.name} key={p.name}>
              <Avatar src={p.img} size={isMobile ? "md" : "lg"} alt={p.name} />
            </Tooltip>
          ))}
        </Avatar.Group>
      </Group>
    </Paper>
  );
};
