import {
  Badge,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  IconChevronLeft,
  IconChevronRight,
  IconEye,
} from "@tabler/icons-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { Competition, Season } from "../../types";

type Props = {
  competition: Competition;
  season: Season;
  isCreator: boolean;
};

export const EpisodeAdvanceControl = ({
  competition,
  season,
  isCreator,
}: Props) => {
  const currentEpisode = competition.current_episode;

  if (currentEpisode === null) return null;

  const totalEpisodes = season.episodes?.length ?? 0;
  const currentEpisodeData = season.episodes?.find(
    (e) => e.order === currentEpisode,
  );
  const canAdvance = currentEpisode < totalEpisodes;
  const canGoBack = currentEpisode > 0;

  const advanceEpisode = async () => {
    const newValue = Math.min(totalEpisodes, currentEpisode + 1);
    await updateDoc(doc(db, "competitions", competition.id), {
      current_episode: newValue,
    });
  };

  const goBackEpisode = () => {
    modals.openConfirmModal({
      title: "Go back one episode?",
      children: (
        <Text size="sm">
          Participants may have already seen Episode {currentEpisode}
          &apos;s results. Going back will hide them again.
        </Text>
      ),
      labels: { confirm: "Go Back", cancel: "Cancel" },
      confirmProps: { color: "orange" },
      onConfirm: async () => {
        const newValue = Math.max(0, currentEpisode - 1);
        await updateDoc(doc(db, "competitions", competition.id), {
          current_episode: newValue,
        });
      },
    });
  };

  if (!isCreator) {
    return (
      <Paper p="sm" radius="md" withBorder>
        <Group gap="xs" justify="center">
          <IconEye size={16} />
          <Text size="sm" fw={500}>
            Watch-Along — Episode {currentEpisode} of {totalEpisodes}
          </Text>
        </Group>
      </Paper>
    );
  }

  return (
    <Paper p="md" radius="md" withBorder>
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <IconEye size={18} color="var(--mantine-color-blue-6)" />
            <Title order={4}>Watch-Along</Title>
            <Badge variant="light" size="sm">
              Episode {currentEpisode} of {totalEpisodes}
            </Badge>
          </Group>
        </Group>

        {currentEpisode === 0 ? (
          <Text size="sm" c="dimmed">
            No episodes revealed yet. Reveal the first episode when your group
            is ready.
          </Text>
        ) : (
          <Text size="sm" c="dimmed">
            Showing: Episode {currentEpisode}
            {currentEpisodeData ? ` — ${currentEpisodeData.name}` : ""}
          </Text>
        )}

        <Group gap="xs">
          <Button
            variant="light"
            color="gray"
            size="sm"
            leftSection={<IconChevronLeft size={16} />}
            disabled={!canGoBack}
            onClick={goBackEpisode}
          >
            Go Back
          </Button>
          <Button
            variant="filled"
            size="sm"
            rightSection={<IconChevronRight size={16} />}
            disabled={!canAdvance}
            onClick={advanceEpisode}
          >
            {currentEpisode === 0
              ? "Reveal Episode 1"
              : `Reveal Episode ${currentEpisode + 1}`}
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
};
