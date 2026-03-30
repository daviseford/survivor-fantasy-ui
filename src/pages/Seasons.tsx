import {
  Badge,
  Card,
  Center,
  Group,
  Image,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { useSeasons } from "../hooks/useSeasons";

export const Seasons = () => {
  const { data: seasons, isLoading } = useSeasons();

  return (
    <Stack gap="lg" p="md">
      <div>
        <Title order={2}>Seasons</Title>
        <Text c="dimmed" size="sm">
          Pick a season, check out the cast, and start drafting with friends.
        </Text>
      </div>

      {isLoading && (
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
        {seasons
          ?.slice()
          .sort((a, b) => b.order - a.order)
          .map((x) => (
            <Card
              component={Link}
              to={`/seasons/${x.id}`}
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              key={x.id}
            >
              <Card.Section pos="relative">
                <Image src={x.img} height={220} alt="" />
                <Badge
                  color="dark"
                  variant="filled"
                  size="lg"
                  pos="absolute"
                  top={12}
                  right={12}
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
