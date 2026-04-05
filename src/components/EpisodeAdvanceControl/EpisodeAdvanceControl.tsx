import {
  Badge,
  Button,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconChevronLeft,
  IconChevronRight,
  IconEye,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { doc, updateDoc } from "firebase/firestore";
import { useState } from "react";
import { db } from "../../firebase";
import { Competition, Season } from "../../types";

type Props = {
  competition: Competition;
  season: Season;
  isCreator: boolean;
  hasWinner: boolean;
};

const EpisodePickerModal = ({
  season,
  onConfirm,
}: {
  season: Season;
  onConfirm: (episode: number) => void;
}) => {
  const [selected, setSelected] = useState<string>("0");

  const episodeOptions = [
    { value: "0", label: "No episodes revealed" },
    ...(season.episodes ?? []).map((e) => ({
      value: String(e.order),
      label: `Episode ${e.order} — ${e.name}`,
    })),
  ];

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Choose which episode you&apos;re up to. Episodes after this will be
        hidden to prevent spoilers.
      </Text>
      <Select
        label="Current episode"
        data={episodeOptions}
        value={selected}
        onChange={(v) => setSelected(v ?? "0")}
        allowDeselect={false}
      />
      <Group justify="flex-end" gap="xs">
        <Button variant="light" color="gray" onClick={() => modals.closeAll()}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            modals.closeAll();
            onConfirm(Number(selected));
          }}
        >
          Switch to Watch-Along
        </Button>
      </Group>
    </Stack>
  );
};

export const EpisodeAdvanceControl = ({
  competition,
  season,
  isCreator,
  hasWinner,
}: Props) => {
  const currentEpisode = competition.current_episode;
  const totalEpisodes = season.episodes?.length ?? 0;

  // Non-creators in Live mode see nothing
  if (currentEpisode == null && !isCreator) return null;

  const updateEpisode = async (newValue: number | null) => {
    try {
      await updateDoc(doc(db, "competitions", competition.id), {
        current_episode: newValue,
      });
    } catch (err) {
      notifications.show({
        title: "Failed to update episode",
        message: err instanceof Error ? err.message : "Unknown error",
        color: "red",
      });
    }
  };

  // Live mode — creator view
  if (currentEpisode == null) {
    const openEpisodePicker = () => {
      modals.open({
        title: "Switch to Watch-Along",
        children: (
          <EpisodePickerModal season={season} onConfirm={updateEpisode} />
        ),
      });
    };

    return (
      <Paper p="md" radius="md" withBorder>
        <Stack gap="sm">
          <Group gap="xs">
            <IconPlayerPlay size={18} color="var(--mantine-color-green-6)" />
            <Title order={4}>Live</Title>
            <Badge variant="light" color="green" size="sm">
              All episodes visible
            </Badge>
          </Group>
          <Text size="sm" c="dimmed">
            All episode results are shown as they happen. Switch to watch-along
            mode if you need to avoid spoilers.
          </Text>
          <Button
            variant="light"
            size="sm"
            leftSection={<IconEye size={16} />}
            onClick={openEpisodePicker}
          >
            Switch to Watch-Along
          </Button>
        </Stack>
      </Paper>
    );
  }

  // Watch-Along mode
  const currentEpisodeData = season.episodes?.find(
    (e) => e.order === currentEpisode,
  );
  const canAdvance = currentEpisode < totalEpisodes;
  const canGoBack = currentEpisode > 0;

  const advanceEpisode = () => {
    updateEpisode(Math.min(totalEpisodes, currentEpisode + 1));
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
      onConfirm: () => {
        updateEpisode(Math.max(0, currentEpisode - 1));
      },
    });
  };

  const switchToLive = () => {
    const willAutoFinish = hasWinner && !competition.finished;
    const warningText = willAutoFinish
      ? `This will reveal all ${totalEpisodes} episodes including results. This competition will be automatically marked as complete because the season has ended. This cannot be undone.`
      : `This will reveal all ${totalEpisodes} episodes including results. Are you sure?`;

    modals.openConfirmModal({
      title: "Switch to Live?",
      children: <Text size="sm">{warningText}</Text>,
      labels: { confirm: "Reveal All Episodes", cancel: "Cancel" },
      confirmProps: { color: "orange" },
      onConfirm: () => {
        updateEpisode(null);
      },
    });
  };

  // Watch-Along — non-creator read-only view
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

  // Watch-Along — creator view
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

        <Group gap="xs" justify="center">
          <Button
            variant="light"
            color="gray"
            size="compact-sm"
            leftSection={<IconChevronLeft size={14} />}
            disabled={!canGoBack}
            onClick={goBackEpisode}
          >
            Back
          </Button>
          <Button
            variant="filled"
            size="compact-sm"
            rightSection={<IconChevronRight size={14} />}
            disabled={!canAdvance}
            onClick={advanceEpisode}
          >
            {currentEpisode === 0
              ? "Reveal Ep 1"
              : `Reveal Ep ${currentEpisode + 1}`}
          </Button>
        </Group>
        <Button
          variant="subtle"
          size="compact-sm"
          onClick={switchToLive}
          style={{ alignSelf: "center" }}
        >
          Switch to Live
        </Button>
      </Stack>
    </Paper>
  );
};
