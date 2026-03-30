import {
  Badge,
  Card,
  Group,
  Image,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
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
              <Card.Section pos="relative">
                <Image src={x.img} height={220} alt={x.name} />
                <Badge
                  color="dark"
                  variant="filled"
                  size="lg"
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                  }}
                >
                  Season {x.order}
                </Badge>
              </Card.Section>

              <Group justify="space-between" mt="md" align="center">
                <div>
                  <Text fw={600} size="lg">
                    {x.name}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {x.players?.length ?? 0} contestants
                  </Text>
                </div>
                <IconChevronRight
                  size={20}
                  color="var(--mantine-color-dimmed)"
                />
              </Group>
            </Card>
          ))}
      </SimpleGrid>
    </Stack>
  );
};
