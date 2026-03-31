import {
  Button,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconFlame,
  IconSearch,
  IconTargetArrow,
  IconTrophy,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import classes from "./Home.module.css";

export const Home = () => {
  const navigate = useNavigate();
  return (
    <>
      <div className={classes.wrapper}>
        <Container size={700} className={classes.inner}>
          <Title order={1} className={classes.title}>
            Draft your{" "}
            <Text
              component="span"
              variant="gradient"
              gradient={{ from: "blue", to: "cyan" }}
              inherit
            >
              Survivor Fantasy
            </Text>{" "}
            team with friends
          </Title>

          <Text className={classes.description} c="dimmed">
            Pick a season, draft your favorite contestants, and compete to see
            whose team racks up the most points as the game plays out.
          </Text>

          <Group className={classes.controls}>
            <Button
              size="xl"
              className={classes.control}
              variant="gradient"
              gradient={{ from: "blue", to: "cyan" }}
              onClick={() => navigate("/seasons")}
              leftSection={<IconFlame size={22} />}
            >
              Browse seasons
            </Button>
          </Group>
        </Container>
      </div>

      <Container size={700} className={classes.howItWorks}>
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <Stack gap={6} align="center">
            <ThemeIcon size={40} radius="xl" variant="light" color="blue">
              <IconSearch size={20} />
            </ThemeIcon>
            <Text size="sm" fw={600} ta="center">
              Pick a season
            </Text>
            <Text size="xs" c="dimmed" ta="center">
              Browse seasons and check out the cast before you commit.
            </Text>
          </Stack>
          <Stack gap={6} align="center">
            <ThemeIcon size={40} radius="xl" variant="light" color="cyan">
              <IconTargetArrow size={20} />
            </ThemeIcon>
            <Text size="sm" fw={600} ta="center">
              Draft your team
            </Text>
            <Text size="xs" c="dimmed" ta="center">
              Invite friends, take turns picking players, and build your roster.
            </Text>
          </Stack>
          <Stack gap={6} align="center">
            <ThemeIcon size={40} radius="xl" variant="light" color="teal">
              <IconTrophy size={20} />
            </ThemeIcon>
            <Text size="sm" fw={600} ta="center">
              Compete for points
            </Text>
            <Text size="xs" c="dimmed" ta="center">
              Earn points as your players win challenges, find idols, and
              survive.
            </Text>
          </Stack>
        </SimpleGrid>
      </Container>
    </>
  );
};
