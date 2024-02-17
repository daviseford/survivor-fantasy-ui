import { Avatar, Paper, SimpleGrid, Text } from "@mantine/core";
import { useSeason } from "../hooks/useSeason";
import { Player } from "../types";

export const Players = () => {
  const { data: season } = useSeason();

  if (!season) return null;

  return (
    <SimpleGrid cols={4}>
      {season.players.map((x) => (
        <PlayerCard {...x} key={x.name} />
      ))}
    </SimpleGrid>
  );
};

const PlayerCard = (props: Player) => {
  return (
    <Paper radius="md" withBorder p="lg" bg="var(--mantine-color-body)">
      <Avatar src={props.img} size={120} radius={120} mx="auto" />
      <Text ta="center" fz="lg" fw={500} mt="md">
        {props.name}
      </Text>
      <Text ta="center" c="dimmed" fz="sm">
        Season {props.season_id}
      </Text>
    </Paper>
  );
};
