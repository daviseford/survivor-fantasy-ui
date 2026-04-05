import { Image, Paper, SimpleGrid, Text } from "@mantine/core";
import { useSeason } from "../hooks/useSeason";
import { Player } from "../types";

export const Players = () => {
  const { data: season } = useSeason();

  if (!season) return null;

  return (
    <SimpleGrid cols={{ base: 2, xs: 2, sm: 3, md: 4 }}>
      {season.players.map((x) => (
        <PlayerCard {...x} key={x.castaway_id} />
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
      ta="center"
    >
      <Image
        src={props.img}
        alt={props.full_name}
        radius="md"
        loading="lazy"
        fit="cover"
        h={{ base: 200, xs: 140 }}
        style={{ objectPosition: "center top" }}
      />
      <Text fw={600} mt="sm" size="md">
        {props.full_name}
      </Text>
      {(props.age || props.profession || props.hometown) && (
        <Text size="xs" c="dimmed" lh={1.3} mt={4}>
          {props.age && <>{props.age}</>}
          {props.age && props.profession && " · "}
          {props.profession && <>{props.profession}</>}
          {(props.age || props.profession) && props.hometown && (
            <>
              <br />
            </>
          )}
          {props.hometown && <>{props.hometown}</>}
        </Text>
      )}
    </Paper>
  );
};
