import { Button, Container, Group, Text, Title } from "@mantine/core";
import { IconFlame } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import classes from "./Home.module.css";

export const Home = () => {
  const navigate = useNavigate();
  return (
    <div className={classes.wrapper}>
      <Container size={700} className={classes.inner}>
        <Title order={1} className={classes.title}>
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
        </Title>

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
            leftSection={<IconFlame size={22} />}
          >
            Pick your players
          </Button>
        </Group>
      </Container>
    </div>
  );
};
