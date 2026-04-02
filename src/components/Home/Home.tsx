import {
  Button,
  Container,
  Group,
  Paper,
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
          <Text className={classes.eyebrow} size="sm" fw={700} tt="uppercase">
            Fantasy Survivor for friends
          </Text>
          <Title order={1} className={classes.title}>
            Draft your{" "}
            <Text component="span" variant="gradient" inherit>
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

      <div className={classes.howItWorksWrapper}>
        <Container size={700} className={classes.howItWorks}>
          <Text
            size="sm"
            fw={600}
            c="dimmed"
            ta="center"
            mb="md"
            tt="uppercase"
            lts={1}
          >
            How it works
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <Paper className={classes.step} withBorder radius="lg" p="lg">
              <Stack gap="sm" align="flex-start">
                <ThemeIcon size={44} radius="xl" variant="light" color="blue">
                  <IconSearch size={22} />
                </ThemeIcon>
                <Text fw={700}>Pick a season</Text>
                <Text size="sm" c="dimmed">
                  Browse seasons and check out the cast before you commit.
                </Text>
              </Stack>
            </Paper>
            <Paper className={classes.step} withBorder radius="lg" p="lg">
              <Stack gap="sm" align="flex-start">
                <ThemeIcon size={44} radius="xl" variant="light" color="cyan">
                  <IconTargetArrow size={22} />
                </ThemeIcon>
                <Text fw={700}>Draft your team</Text>
                <Text size="sm" c="dimmed">
                  Invite friends, take turns picking players, and build your
                  roster.
                </Text>
              </Stack>
            </Paper>
            <Paper className={classes.step} withBorder radius="lg" p="lg">
              <Stack gap="sm" align="flex-start">
                <ThemeIcon size={44} radius="xl" variant="light" color="teal">
                  <IconTrophy size={22} />
                </ThemeIcon>
                <Text fw={700}>Compete for points</Text>
                <Text size="sm" c="dimmed">
                  Earn points as your players win challenges, find idols, and
                  survive.
                </Text>
              </Stack>
            </Paper>
          </SimpleGrid>
        </Container>
      </div>
    </>
  );
};
