import {
  Badge,
  Button,
  Card,
  Group,
  Image,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useSeasons } from "../hooks/useSeasons";

export const Seasons = () => {
  const navigate = useNavigate();

  const { data: seasons } = useSeasons();

  return (
    <Stack gap="lg" p="md">
      <div>
        <Title order={2}>Seasons</Title>
        <Text c="dimmed" size="sm">
          Pick a season to see the contestants and start a draft with friends.
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
        {seasons
          ?.slice()
          .sort((a, b) => b.order - a.order)
          .map((x) => (
            <Card
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              key={x.id}
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/seasons/${x.id}`)}
            >
              <Card.Section>
                <Image src={x.img} height={250} alt={x.name} />
              </Card.Section>

              <Group justify="space-between" mt="md" mb="xs">
                <Text fw={500}>{x.name}</Text>
                <Badge color="pink" variant="light">
                  Season {x.order}
                </Badge>
              </Group>

              <Button color="blue" fullWidth mt="md" radius="md">
                View Season
              </Button>
            </Card>
          ))}
      </SimpleGrid>
    </Stack>
  );
};
