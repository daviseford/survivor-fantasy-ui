import {
  Box,
  Button,
  Card,
  Center,
  Code,
  Group,
  Loader,
  MultiSelect,
  NumberInput,
  Select,
  SimpleGrid,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { hasLength, useForm } from "@mantine/form";
import { doc, setDoc } from "firebase/firestore";
import { last, orderBy } from "lodash-es";
import { useEffect } from "react";
import { v4 } from "uuid";
import { db } from "../../firebase";
import { useChallenges } from "../../hooks/useChallenges";
import { useEliminations } from "../../hooks/useEliminations";
import { useSeason } from "../../hooks/useSeason";
import { useTeamAssignments } from "../../hooks/useTeamAssignments";
import { useTeams } from "../../hooks/useTeams";
import { Challenge, ChallengeWinActions, Team } from "../../types";
import { getPlayersOnTeam } from "../../utils/teamUtils";

export const CreateChallenge = () => {
  const { data: season, isLoading } = useSeason();
  const { data: eliminations } = useEliminations(season?.id);
  const { data: challenges } = useChallenges(season?.id);
  const { data: teams } = useTeams(season?.id);
  const { data: teamAssignments } = useTeamAssignments(season?.id);

  const form = useForm<Challenge>({
    initialValues: {
      id: `challenge_${v4()}`,
      season_num: 1,
      season_id: "season_1",
      episode_id: "episode_1",
      episode_num: 1,
      variant: ChallengeWinActions[0],
      winning_players: [],
      order: 0,
    },

    validate: {
      winning_players: hasLength({ min: 1 }, "Add winning player(s)"),
    },

    transformValues: (values) => ({
      ...values,
      episode_id: `episode_${values.episode_num}`,
      season_id: `season_${values.season_num}`,
    }),
  });

  // Set initial values with async request
  useEffect(() => {
    if (season && challenges) {
      const order = (last(orderBy(challenges, (x) => x.order))?.order || 0) + 1;
      const episode_num = season.episodes.length;

      form.setValues({
        season_num: season.order,
        season_id: season.id,
        episode_num: episode_num,
        episode_id: `episode_${episode_num}`,
        order,
      });
      form.resetDirty();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season, challenges]);

  if (isLoading) {
    return (
      <Center>
        <Loader size="xl" />
      </Center>
    );
  }

  if (!season?.episodes?.length) {
    return (
      <Center>
        <Text>Create an Episode first before adding events</Text>
      </Center>
    );
  }

  const handleSubmit = async (values: Challenge) => {
    const _validate = form.validate();

    if (_validate.hasErrors) return;

    const ref = doc(db, `challenges/${season?.id}`);

    await setDoc(ref, { [values.id]: values }, { merge: true });

    // reset id and important form values
    form.setValues({
      id: `challenge_${v4()}`,
      winning_players: [],
      winning_team_id: null,
    });
  };

  const teamList = Object.values(teams || {});
  const teamSelectData = teamList.map((t) => ({
    value: t.id,
    label: t.name,
  }));
  const hasEpisodeSnapshot = Boolean(
    teamAssignments[String(form.values.episode_num)],
  );

  const handleWinningTeamChange = (teamId: string | null) => {
    if (!teamId) {
      form.setFieldValue("winning_team_id", null);
      form.setFieldValue("winning_players", []);
      return;
    }

    const episodeSnapshot =
      teamAssignments[String(form.values.episode_num)] ?? {};
    const playersOnTeam = getPlayersOnTeam(
      episodeSnapshot,
      teamId as Team["id"],
    );

    form.setFieldValue("winning_team_id", teamId as Team["id"]);
    form.setFieldValue("winning_players", playersOnTeam);
  };

  const eliminatedPlayers = Object.values(eliminations).map(
    (x) => x.player_name,
  );
  const playerNames = season?.players
    .map((x) => x.name)
    .filter((x) => !eliminatedPlayers.includes(x));

  return (
    <Card withBorder>
      <Card.Section p={"md"}>
        <Title order={4}>Create a new Challenge</Title>
      </Card.Section>

      <Card.Section p={"md"}>
        <SimpleGrid cols={{ base: 1, md: 2 }}>
          <Box maw={340} mx="auto">
            <form onSubmit={form.onSubmit((values) => handleSubmit(values))}>
              <TextInput
                withAsterisk
                readOnly
                label="Season #"
                value={form.values.season_num}
              />

              <NumberInput
                withAsterisk
                label="Episode #"
                min={1}
                max={season?.episodes.length}
                {...form.getInputProps("episode_num")}
              />

              <NumberInput
                withAsterisk
                label="Order"
                min={1}
                {...form.getInputProps("order")}
              />

              {teamSelectData.length > 0 && (
                <Select
                  label="Winning Team (optional)"
                  placeholder={
                    hasEpisodeSnapshot
                      ? "Select a team to auto-fill winners"
                      : "No team assignments for this episode"
                  }
                  description={
                    !hasEpisodeSnapshot
                      ? "Assign players to teams for this episode first"
                      : undefined
                  }
                  data={teamSelectData}
                  clearable
                  searchable
                  disabled={!hasEpisodeSnapshot}
                  value={form.values.winning_team_id ?? null}
                  onChange={handleWinningTeamChange}
                />
              )}

              <MultiSelect
                withAsterisk
                label="Winning Players"
                data={playerNames}
                searchable
                {...form.getInputProps("winning_players")}
              />

              <Select
                withAsterisk
                label="Challenge Variant"
                data={ChallengeWinActions}
                searchable
                {...form.getInputProps("variant")}
              />

              <Group justify="flex-end" mt="md">
                <Button type="submit">Submit</Button>
              </Group>
            </form>
          </Box>
          <Box>
            Generated Payload:
            <Code block>{JSON.stringify(form.values, null, 2)}</Code>
          </Box>
        </SimpleGrid>
      </Card.Section>
    </Card>
  );
};
