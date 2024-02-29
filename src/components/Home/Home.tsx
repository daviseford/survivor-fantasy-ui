import { Button, Container, Group, Text } from "@mantine/core";
import { IconBrandGithub } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import classes from "./Home.module.css";

export const Home = () => {
  const navigate = useNavigate();
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
          Just like fantasy football, but with a twist, Survivor Fantasy lets
          you assemble your dream team of Survivor contestants and watch as they
          outwit, outplay, and outlast their way to victory.
        </Text>

        <Group className={classes.controls}>
          <Button
            role="link"
            size="xl"
            className={classes.control}
            variant="gradient"
            gradient={{ from: "blue", to: "cyan" }}
            onClick={() => navigate("/seasons")}
          >
            Get started
          </Button>

          <Button
            component="a"
            href="https://github.com/mantinedev/mantine"
            size="xl"
            variant="default"
            className={classes.control}
            leftSection={<IconBrandGithub size={20} />}
            onClick={() =>
              window.open(
                "https://github.com/daviseford/survivor-fantasy-ui/",
                "_blank",
              )
            }
          >
            GitHub
          </Button>
        </Group>
      </Container>
    </div>
  );
};
