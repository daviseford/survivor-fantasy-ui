import { Button, Container, Group, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconBrandGithub, IconFlame } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import classes from "./Home.module.css";

export const Home = () => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 48em)");
  return (
    <div className={classes.wrapper}>
      <Container size={700} className={classes.inner}>
        <h1 className={classes.title}>
          Live out your{" "}
          <Text
            component="span"
            variant="gradient"
            gradient={{ from: "blue", to: "cyan" }}
            inherit
          >
            Survivor Fantasy
          </Text>{" "}
          from your couch
        </h1>

        <Text className={classes.description} c="dimmed">
          Draft your dream team of Survivor contestants and compete with friends
          as they outwit, outplay, and outlast their way to victory.
        </Text>

        <Group className={classes.controls}>
          <Button
            size="xl"
            className={classes.control}
            variant="gradient"
            gradient={{ from: "blue", to: "cyan" }}
            onClick={() => navigate("/seasons")}
            leftSection={!isMobile ? <IconFlame size={22} /> : undefined}
          >
            Get started
          </Button>

          <Button
            component="a"
            href="https://github.com/daviseford/survivor-fantasy-ui/"
            target="_blank"
            size="xl"
            variant="default"
            className={classes.control}
            leftSection={<IconBrandGithub size={20} />}
          >
            GitHub
          </Button>
        </Group>
      </Container>
    </div>
  );
};
