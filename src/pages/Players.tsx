import { Badge, Card, Group, Image, SimpleGrid, Text } from "@mantine/core";
import { useSeason } from "../hooks/useSeason";

export const Players = () => {
  const { season } = useSeason();

  if (!season) return null;

  return (
    <SimpleGrid cols={4}>
      {season.players.map((x) => {
        return (
          <div key={x.name}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Card.Section>
                {x.img && <Image src={x.img} height={160} alt={x.name} />}
              </Card.Section>

              <Group justify="space-between" mt="md" mb="xs">
                <Text fw={500}>{x.name}</Text>
                <Badge color="pink">Season {season.order}</Badge>
              </Group>

              {/* <Text size="sm" c="dimmed">
        With Fjord Tours you can explore more of the magical fjord landscapes with tours and
        activities on and around the fjords of Norway
      </Text> */}
            </Card>
          </div>
        );
      })}
    </SimpleGrid>
  );
};
