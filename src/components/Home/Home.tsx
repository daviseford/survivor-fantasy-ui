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
  IconChartBar,
  IconCrystalBall,
  IconEyeOff,
  IconFlame,
  IconLivePhoto,
  IconPlayerPlay,
  IconSearch,
  IconTargetArrow,
  IconTrophy,
  IconUsers,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../hooks/useUser";
import classes from "./Home.module.css";

export const Home = () => {
  const navigate = useNavigate();
  const { slimUser } = useUser();
  return (
    <>
      {/* Hero */}
      <section aria-label="Hero" className={classes.wrapper}>
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
              Pick a season to get started
            </Button>
            {slimUser && (
              <Button
                size="xl"
                className={classes.control}
                variant="default"
                onClick={() => navigate("/competitions")}
                leftSection={<IconTrophy size={22} />}
              >
                Your competitions
              </Button>
            )}
          </Group>
        </Container>
      </section>

      {/* How It Works */}
      <section className={classes.howItWorksWrapper}>
        <Container size={700} className={classes.howItWorks}>
          <Title
            order={2}
            size="sm"
            fw={600}
            c="dimmed"
            ta="center"
            mb="md"
            tt="uppercase"
            lts={1}
          >
            How it works
          </Title>
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
      </section>

      {/* All 50 Seasons */}
      <section className={classes.featureSectionLight}>
        <Container size={700} className={classes.featureContent}>
          <Stack gap="lg">
            <Group gap="sm">
              <ThemeIcon size={48} radius="xl" variant="light" color="orange">
                <IconFlame size={24} />
              </ThemeIcon>
              <div>
                <Text
                  size="sm"
                  fw={600}
                  c="dimmed"
                  tt="uppercase"
                  className={classes.featureEyebrow}
                >
                  Complete coverage
                </Text>
                <Title order={2} className={classes.featureTitle}>
                  Every season of Survivor
                </Title>
              </div>
            </Group>

            <Text className={classes.featureDescription} c="dimmed">
              From Richard Hatch outwitting Borneo to the latest New Era twists,
              all 50 US seasons are ready to play. Browse by era, search by name
              or location, and start a competition on any season — past or
              present. The currently airing season gets live updates as each
              episode airs, so you're never behind.
            </Text>

            <SimpleGrid cols={{ base: 2, sm: 4 }} mt="sm">
              {(
                [
                  { num: "50", label: "Seasons", color: "orange" },
                  { num: "700+", label: "Castaways", color: "red" },
                  { num: "4", label: "Eras", color: "yellow" },
                  { num: "Live", label: "Updates", color: "green" },
                ] as const
              ).map((stat) => (
                <Paper
                  key={stat.label}
                  className={classes.statCard}
                  withBorder
                  radius="lg"
                  p="md"
                >
                  <Text className={classes.statNumber} c={stat.color} fw={900}>
                    {stat.num}
                  </Text>
                  <Text size="sm" c="dimmed" mt={4}>
                    {stat.label}
                  </Text>
                </Paper>
              ))}
            </SimpleGrid>

            <Button
              variant="light"
              color="orange"
              size="md"
              mt="sm"
              onClick={() => navigate("/seasons")}
              leftSection={<IconSearch size={18} />}
              className={classes.selfStart}
            >
              Browse all seasons
            </Button>
          </Stack>
        </Container>
      </section>

      {/* Spoiler-Free Watch-Along — hero-weight centered layout */}
      <section className={classes.watchAlongWrapper}>
        <Container size={700} className={classes.watchAlongContent}>
          <Stack gap="lg" align="center">
            <ThemeIcon size={56} radius="xl" variant="light" color="grape">
              <IconEyeOff size={28} />
            </ThemeIcon>

            <Text
              size="sm"
              fw={600}
              c="dimmed"
              tt="uppercase"
              className={classes.featureEyebrow}
            >
              No spoilers. Ever.
            </Text>

            <Title order={2} className={classes.watchAlongTitle}>
              Watch at your own pace
            </Title>

            <Text className={classes.watchAlongDescription} c="dimmed">
              Rewatching a classic season with friends who've never seen it?
              Catching up on a season you missed? Watch-along mode is built for
              you. The competition creator controls which episodes are revealed
              — scores, standings, and predictions only reflect what your group
              has actually watched. No accidental spoilers, no peeking ahead.
              When you're ready for the next episode, advance the counter and
              watch the points shift in real time.
            </Text>

            <SimpleGrid cols={{ base: 1, sm: 3 }} mt="sm" w="100%">
              {(
                [
                  {
                    title: "Creator controls pacing",
                    desc: "Advance episodes when your group is ready — one tap is all it takes.",
                    color: "grape",
                  },
                  {
                    title: "Everything stays hidden",
                    desc: "Scores, eliminations, prop bets, and standings are filtered to your current episode.",
                    color: "indigo",
                  },
                  {
                    title: "Works for any season",
                    desc: "Play along with the current season or relive any of the 50 classic seasons.",
                    color: "pink",
                  },
                ] as const
              ).map((item) => (
                <Paper
                  key={item.title}
                  className={classes.watchAlongCard}
                  radius="md"
                  p="md"
                  style={
                    {
                      "--card-accent": `var(--mantine-color-${item.color}-5)`,
                    } as React.CSSProperties
                  }
                >
                  <Stack gap="xs">
                    <Text fw={700} size="sm">
                      {item.title}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {item.desc}
                    </Text>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>

            <Button
              variant="light"
              color="grape"
              size="md"
              mt="sm"
              onClick={() => navigate("/seasons")}
              leftSection={<IconPlayerPlay size={18} />}
            >
              Start a watch-along
            </Button>
          </Stack>
        </Container>
      </section>

      {/* Balanced Scoring — compact layout with inline badges */}
      <section className={classes.featureSectionTinted}>
        <Container size={700} className={classes.compactContent}>
          <Stack gap="md">
            <Group gap="sm">
              <ThemeIcon size={48} radius="xl" variant="light" color="violet">
                <IconChartBar size={24} />
              </ThemeIcon>
              <div>
                <Text
                  size="sm"
                  fw={600}
                  c="dimmed"
                  tt="uppercase"
                  className={classes.featureEyebrow}
                >
                  Thoughtful scoring
                </Text>
                <Title order={2} className={classes.featureTitle}>
                  A system that rewards smart drafting
                </Title>
              </div>
            </Group>

            <Text className={classes.featureDescription} c="dimmed">
              31 scoring actions across 5 categories — no single path to
              victory. Challenge beasts, strategic idol players, and social
              savants all earn points their own way. Even early boots
              contribute: elimination points scale by episode, so every pick
              matters.
            </Text>

            <Group gap="xs" wrap="wrap">
              {(
                [
                  { label: "Challenges", color: "blue" },
                  { label: "Milestones", color: "teal" },
                  { label: "Idols", color: "yellow" },
                  { label: "Advantages", color: "grape" },
                  { label: "Other", color: "gray" },
                ] as const
              ).map((cat) => (
                <Group
                  key={cat.label}
                  gap={8}
                  className={classes.categoryBadge}
                  wrap="nowrap"
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: `var(--mantine-color-${cat.color}-5)`,
                      flexShrink: 0,
                    }}
                  />
                  <Text size="sm" fw={600}>
                    {cat.label}
                  </Text>
                </Group>
              ))}
            </Group>
          </Stack>
        </Container>
      </section>

      {/* Prop Bets — compact with curated list */}
      <section className={classes.featureSectionLight}>
        <Container size={700} className={classes.compactContent}>
          <Stack gap="md">
            <Group gap="sm">
              <ThemeIcon size={48} radius="xl" variant="light" color="orange">
                <IconCrystalBall size={24} />
              </ThemeIcon>
              <div>
                <Text
                  size="sm"
                  fw={600}
                  c="dimmed"
                  tt="uppercase"
                  className={classes.featureEyebrow}
                >
                  11 Predictions
                </Text>
                <Title order={2} className={classes.featureTitle}>
                  Predict the game before it starts
                </Title>
              </div>
            </Group>

            <Text className={classes.featureDescription} c="dimmed">
              After the draft, every participant fills out pre-season
              predictions. Correct calls earn up to 44 bonus points — enough to
              swing the standings even if your draft goes sideways.
            </Text>

            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              {[
                "Pick the season winner",
                "First player eliminated",
                "Most individual immunity wins",
                "Most idol finds",
                "Successful Shot in the Dark?",
                "Medical evacuation?",
              ].map((bet) => (
                <Group
                  key={bet}
                  gap="sm"
                  className={classes.propBetItem}
                  wrap="nowrap"
                >
                  <ThemeIcon
                    size={24}
                    radius="xl"
                    variant="light"
                    color="orange"
                  >
                    <IconCrystalBall size={12} />
                  </ThemeIcon>
                  <Text size="sm" fw={500}>
                    {bet}
                  </Text>
                </Group>
              ))}
            </SimpleGrid>

            <Text size="sm" c="dimmed" fs="italic">
              Plus 5 more predictions covering idols, advantages, and journeys.
            </Text>
          </Stack>
        </Container>
      </section>

      {/* Real-Time Draft — callout-led layout */}
      <section className={classes.featureSectionTinted}>
        <Container size={700} className={classes.featureContent}>
          <Stack gap="lg">
            <Group gap="sm">
              <ThemeIcon size={48} radius="xl" variant="light" color="cyan">
                <IconUsers size={24} />
              </ThemeIcon>
              <div>
                <Text
                  size="sm"
                  fw={600}
                  c="dimmed"
                  tt="uppercase"
                  className={classes.featureEyebrow}
                >
                  Real-time multiplayer
                </Text>
                <Title order={2} className={classes.featureTitle}>
                  Draft night, every night
                </Title>
              </div>
            </Group>

            <Text className={classes.draftCallout}>
              Share a link. Friends join instantly.
            </Text>

            <Text className={classes.featureDescription} c="dimmed">
              No accounts needed to browse, no complicated setup. Kick off the
              draft, watch the animated order reveal, and take turns picking
              from the full cast — all in real time on any device.
            </Text>

            <Stack gap="sm">
              {(
                [
                  {
                    icon: IconUsers,
                    title: "One link, no friction",
                    desc: "Friends click and join — no signup wall.",
                    color: "cyan",
                  },
                  {
                    icon: IconTargetArrow,
                    title: "Animated order reveal",
                    desc: "A slot-machine-style reveal builds anticipation before the first pick.",
                    color: "blue",
                  },
                  {
                    icon: IconLivePhoto,
                    title: "Live turn-by-turn updates",
                    desc: "Every pick syncs instantly across all devices.",
                    color: "teal",
                  },
                ] as const
              ).map((item) => (
                <Group
                  key={item.title}
                  gap="md"
                  className={classes.draftHighlight}
                  wrap="nowrap"
                >
                  <ThemeIcon
                    size={36}
                    radius="xl"
                    variant="light"
                    color={item.color}
                  >
                    <item.icon size={18} />
                  </ThemeIcon>
                  <div>
                    <Text fw={600} size="sm">
                      {item.title}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {item.desc}
                    </Text>
                  </div>
                </Group>
              ))}
            </Stack>

            <Button
              variant="light"
              color="cyan"
              size="md"
              mt="sm"
              onClick={() => navigate("/seasons")}
              leftSection={<IconUsers size={18} />}
              className={classes.selfStart}
            >
              Pick a season and draft
            </Button>
          </Stack>
        </Container>
      </section>

      {/* Closing CTA */}
      <section className={classes.ctaSection}>
        <Container size={700} className={classes.ctaContent}>
          <Stack align="center" gap="lg">
            <Title order={2} className={classes.ctaTitle}>
              Ready to play?
            </Title>
            <Text
              size="lg"
              c="dimmed"
              maw={420}
              ta="center"
              className={classes.ctaDescription}
            >
              Pick a season, invite your friends, and find out who really knows
              Survivor best.
            </Text>
            <Button
              size="xl"
              variant="gradient"
              gradient={{ from: "blue", to: "cyan" }}
              onClick={() => navigate("/seasons")}
              leftSection={<IconFlame size={22} />}
            >
              Browse seasons
            </Button>
          </Stack>
        </Container>
      </section>
    </>
  );
};
