import { Avatar, Paper, SimpleGrid, Text } from "@mantine/core";
import { useSeason } from "../hooks/useSeason";
import { Player } from "../types";

export const Players = () => {
  const { data: season } = useSeason();

  if (!season) return null;

  return (
    <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }}>
      {season.players.map((x) => (
        <PlayerCard {...x} key={x.name} />
      ))}
    </SimpleGrid>
  );
};

const PlayerCard = (props: Player) => {
  return (
    <Paper
      radius="md"
      withBorder
      shadow="sm"
      p="md"
      bg="var(--mantine-color-body)"
      style={{ textAlign: "center" }}
    >
      <Avatar
        src={props.img}
        size={100}
        radius={100}
        mx="auto"
        alt={props.name}
      />
      <Text ta="center" fw={600} mt="sm" size="sm">
        {props.name}
      </Text>
    </Paper>
  );
};
