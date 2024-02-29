import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  Image,
  SimpleGrid,
  Text,
  Title,
} from "@mantine/core";
import { useFirestoreQueryData } from "@react-query-firebase/firestore";
import { collection } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { Season } from "../types";

export const Seasons = () => {
  const navigate = useNavigate();

  const ref = collection(db, "seasons");

  const { data: seasons } = useFirestoreQueryData<Season[], Season[]>(
    ["seasons"],
    // @ts-expect-error asd
    ref,
  );

  return (
    <Box>
      <Title order={3} c="dimmed" p="md">
        Pick your favorite season in order to learn more about the contestants
        and start a draft!
      </Title>
      <SimpleGrid cols={3}>
        {seasons?.map((x) => {
          return (
            <div key={x.id}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Card.Section>
                  <Image src={x.img} height={250} alt={x.name} />
                </Card.Section>

                <Group justify="space-between" mt="md" mb="xs">
                  <Text fw={500}>{x.name}</Text>
                  <Badge color="pink">Season {x.order}</Badge>
                </Group>

                <Button
                  color="blue"
                  fullWidth
                  mt="md"
                  radius="md"
                  onClick={() => navigate(`/seasons/${x.id}`)}
                >
                  Select
                </Button>
              </Card>
            </div>
          );
        })}
      </SimpleGrid>
    </Box>
  );
};
