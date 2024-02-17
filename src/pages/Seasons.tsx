import {
  Badge,
  Button,
  Card,
  Group,
  Image,
  SimpleGrid,
  Text,
} from "@mantine/core";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import { Season } from "../types";

export const Seasons = () => {
  const [seasons, setSeasons] = useState<Season[]>([]);

  useEffect(() => {
    const _seasons = collection(db, "seasons");

    const getSeasons = async () => {
      const querySnapshot = await getDocs(_seasons);

      console.log({ querySnapshot });

      const data = querySnapshot.docs.map((x) => x.data()) as Season[];

      setSeasons(data);
    };

    getSeasons();
  }, []);

  console.log(seasons);

  return (
    <SimpleGrid cols={3}>
      {seasons.map((x) => {
        return (
          <div key={x.id}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Card.Section>
                <Image src={x.img} width={160} alt={x.name} />
              </Card.Section>

              <Group justify="space-between" mt="md" mb="xs">
                <Text fw={500}>{x.name}</Text>
                <Badge color="pink">Season {x.order}</Badge>
              </Group>

              {/* <Text size="sm" c="dimmed">
        With Fjord Tours you can explore more of the magical fjord landscapes with tours and
        activities on and around the fjords of Norway
      </Text> */}

              <Link to={`/seasons/${x.order}`}>
                <Button color="blue" fullWidth mt="md" radius="md">
                  Visit
                </Button>
              </Link>
            </Card>
          </div>
        );
      })}
    </SimpleGrid>
  );
};
