import { Button, Container, Stack, Text, Title } from "@mantine/core";
import { IconFlame } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import classes from "./NotFound.module.css";

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className={classes.wrapper}>
      <Container size={500}>
        <Stack align="center" gap="lg">
          <Text className={classes.code}>404</Text>
          <Title order={1} className={classes.title}>
            Page not found
          </Title>
          <Text c="dimmed" size="lg" ta="center" maw={400}>
            The page you're looking for doesn't exist or has been moved.
          </Text>
          <Button
            size="lg"
            variant="gradient"
            gradient={{ from: "blue", to: "cyan" }}
            onClick={() => navigate("/")}
            leftSection={<IconFlame size={20} />}
          >
            Go home
          </Button>
        </Stack>
      </Container>
    </div>
  );
};
