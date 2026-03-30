import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  CopyButton,
  Divider,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Stepper,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconClipboardList,
  IconCopy,
  IconFlame,
  IconUserPlus,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { ref, update } from "firebase/database";
import { doc, setDoc } from "firebase/firestore";
import { shuffle, uniqBy } from "lodash-es";
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { v4 } from "uuid";
import { DraftTable } from "../components/DraftTable";
import { MyDraftedPlayers } from "../components/MyPlayers/MyDraftedPlayers";
import { PostDraftPropBetTable } from "../components/PropBetTables/PostDraftPropBetTable";
import { ScoringLegendTable } from "../components/ScoringTables";
import { PropBetsQuestions } from "../data/propbets";
import { db, rt_db } from "../firebase";
import { useCompetition } from "../hooks/useCompetition";
import { useDraft } from "../hooks/useDraft";
import { useSeason } from "../hooks/useSeason";
import { useUser } from "../hooks/useUser";
import {
  Competition,
  Draft,
  PropBetsEntry,
  PropBetsFormData,
  Season,
} from "../types";

export const DraftComponent = () => {
  const navigate = useNavigate();

  const { slimUser } = useUser();
  const { data: season } = useSeason();

  const { draft } = useDraft();
  const { data: competition } = useCompetition(draft?.competiton_id);

  const userHasSubmittedPropBets = Boolean(
    draft?.prop_bets?.find((x) => x.user_uid === slimUser?.uid),
  );

  const allPlayersDoneWithPropBets =
    draft?.prop_bets &&
    draft?.prop_bets?.length === draft?.participants?.length;

  const isInvalidNumberOfPlayers = !draft
    ? false
    : draft.total_players % draft.participants.length !== 0;

  const addPropBetsToDraft = async (values: PropBetsFormData) => {
    if (!draft || !slimUser || userHasSubmittedPropBets) return;

    const propBetEntry = {
      id: `propbet_${v4()}`,
      user_uid: slimUser?.uid,
      user_name: slimUser.displayName || slimUser.uid,
      values,
    } satisfies PropBetsEntry;

    const _propBets = [...(draft?.prop_bets || []), propBetEntry];

    const _draft = { ...draft, prop_bets: _propBets } satisfies Draft;

    try {
      await updateDraft(_draft);
      notifications.show({
        title: "Prop bets submitted",
        message: "Good luck!",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      notifications.show({
        title: "Failed to submit prop bets",
        message: err instanceof Error ? err.message : "Unknown error",
        color: "red",
        icon: <IconX size={16} />,
      });
    }
  };

  const createCompetition = async (competition_name: string) => {
    if (!season || !draft) return;

    const competition = {
      id: draft.competiton_id,
      competition_name,
      draft_id: draft.id,
      season_id: season?.id,
      season_num: season?.order,
      creator_uid: draft.creator_uid,
      participant_uids: draft.participants.map((x) => x.uid),
      participants: draft?.participants,
      draft_picks: draft.draft_picks,
      prop_bets: draft.prop_bets,
      finished: false,
      started: false,
      current_episode: null,
    } satisfies Competition;

    try {
      await setDoc(doc(db, "competitions", competition.id), competition);
      notifications.show({
        title: "Competition created!",
        message: competition_name,
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      notifications.show({
        title: "Failed to create competition",
        message: err instanceof Error ? err.message : "Unknown error",
        color: "red",
        icon: <IconX size={16} />,
      });
    }
  };

  const updateDraft = async (_draft: Draft) => {
    if (!draft?.id) return;
    await update(ref(rt_db), { ["drafts/" + draft.id]: _draft });
  };

  const userIsParticipant = useMemo(() => {
    if (!slimUser || !draft?.participants) return false;
    return draft?.participants.some((x) => x.uid === slimUser?.uid);
  }, [draft, slimUser]);

  const joinDraft = async () => {
    if (!draft || !slimUser?.uid) return;
    await updateDraft({
      ...draft,
      participants: uniqBy([...draft.participants, slimUser], (x) => x.uid),
    });
  };

  const startDraft = async () => {
    if (!draft || !slimUser?.uid) return;

    const _draftOrder = shuffle(draft.participants);

    const _draft = {
      ...draft,
      started: true,
      current_pick_number: 1,
      current_picker: _draftOrder[0],
      pick_order: _draftOrder,
    } satisfies Draft;

    await updateDraft(_draft);
  };

  const draftPlayer = async (playerName: string) => {
    if (!season || !draft || !slimUser?.uid) return;

    const finished = draft.current_pick_number >= draft.total_players;

    const pickOrderIdxOfLastPicker = draft.pick_order.findIndex(
      (x) => x.uid === draft.current_picker?.uid,
    );

    const nextCurrentPicker = finished
      ? null
      : draft.pick_order?.[pickOrderIdxOfLastPicker + 1] ?? draft.pick_order[0];

    const _draft = {
      ...draft,
      finished,
      current_pick_number: finished
        ? draft?.current_pick_number
        : draft?.current_pick_number + 1,
      current_picker: nextCurrentPicker,
      draft_picks: [
        ...(draft?.draft_picks || []),
        {
          season_id: season.id,
          season_num: season.order,
          order: draft.current_pick_number,
          user_uid: slimUser.uid,
          user_name: slimUser.displayName || slimUser.email || slimUser.uid,
          player_name: playerName,
        },
      ],
    } satisfies Draft;

    if (finished) {
      _draft.current_picker = null;
    }

    await updateDraft(_draft);
  };

  useEffect(() => {
    if (
      !draft?.finished ||
      competition ||
      draft.creator_uid !== slimUser?.uid ||
      !allPlayersDoneWithPropBets
    )
      return;

    const onClose = async (values: FormData) => {
      modals.closeAll();
      await createCompetition(values.name);
    };

    modals.open({
      title: "What should we call your Competition?",
      closeOnClickOutside: false,
      withCloseButton: false,
      children: <NameYourCompetition onSubmit={onClose} />,
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competition, draft, slimUser?.uid]);

  useEffect(() => {
    if (competition) {
      modals.closeAll();
    }
  }, [competition]);

  const isPlayerDrafted = (name: string) => {
    if (!draft?.draft_picks) return false;

    return draft.draft_picks.some((x) => x.player_name === name);
  };

  const isCurrentDrafter =
    draft?.started &&
    !draft.finished &&
    draft.current_picker?.uid === slimUser?.uid;

  if (!season) return <div>Error: Missing data</div>;

  // Determine current phase
  const phase = !draft?.started
    ? "pre-draft"
    : !draft?.finished
      ? "drafting"
      : !userHasSubmittedPropBets
        ? "prop-bets"
        : "completed";

  const activeStep = phase === "drafting" ? 0 : phase === "prop-bets" ? 1 : 2;

  return (
    <div>
      {phase === "pre-draft" ? (
        <Stack gap="lg" p="lg">
          {/* ===== PRE-DRAFT LOBBY ===== */}
          <Paper p="lg" radius="md" withBorder>
            <Stack gap="md">
              <Group gap="sm" align="center">
                <IconUsers size={22} color="var(--mantine-color-blue-6)" />
                <div>
                  <Title order={3}>Draft Lobby</Title>
                  <Text size="sm" c="dimmed">
                    Share the link to invite friends. The host starts the draft
                    once everyone has joined.
                  </Text>
                </div>
              </Group>
              <Divider />

              {/* Participants */}
              <div>
                <Group gap="xs" mb="xs">
                  <Text size="sm" fw={600}>
                    Participants
                  </Text>
                  <Badge variant="light" size="sm">
                    {draft?.participants?.length ?? 0} joined
                  </Badge>
                </Group>
                {draft?.participants?.length ? (
                  <Group gap="sm">
                    {draft.participants.map((p) => (
                      <Tooltip
                        label={p.displayName || p.email || p.uid}
                        key={p.uid}
                      >
                        <Badge
                          variant="light"
                          color="blue"
                          size="lg"
                          leftSection={
                            <Avatar size={20} radius="xl" color="blue">
                              {(p.displayName || p.email || "?")[0].toUpperCase()}
                            </Avatar>
                          }
                        >
                          {p.displayName || p.email || p.uid}
                        </Badge>
                      </Tooltip>
                    ))}
                  </Group>
                ) : (
                  <Text size="sm" c="dimmed">
                    No one has joined yet.
                  </Text>
                )}
              </div>

              {draft && isInvalidNumberOfPlayers && (
                <Alert color="orange" variant="light">
                  The {season?.players?.length ?? 0} contestants can't be split
                  evenly among {draft.participants.length} players. Invite
                  another friend or remove one to continue.
                </Alert>
              )}

              {/* Actions */}
              <Group gap="sm">
                {!slimUser && (
                  <Button
                    leftSection={<IconUserPlus size={16} />}
                    onClick={() =>
                      modals.openContextModal({
                        modal: "AuthModal",
                        innerProps: {},
                      })
                    }
                  >
                    Log in to join
                  </Button>
                )}

                {draft && !userIsParticipant && slimUser && (
                  <Button
                    leftSection={<IconUserPlus size={16} />}
                    onClick={joinDraft}
                  >
                    Join Draft
                  </Button>
                )}

                {draft &&
                  draft.creator_uid === slimUser?.uid &&
                  !isInvalidNumberOfPlayers && (
                    <Button
                      variant="gradient"
                      gradient={{ from: "blue", to: "cyan" }}
                      leftSection={<IconFlame size={16} />}
                      onClick={startDraft}
                      disabled={draft.participants.length < 2}
                    >
                      {draft.participants.length < 2
                        ? "Waiting for players..."
                        : "Start Draft"}
                    </Button>
                  )}

                {draft &&
                  draft.creator_uid !== slimUser?.uid &&
                  userIsParticipant && (
                    <Button variant="light" disabled>
                      Waiting for host to start...
                    </Button>
                  )}

                <CopyButton value={window.location.href}>
                  {({ copied, copy }) => (
                    <Button
                      color={copied ? "teal" : "gray"}
                      onClick={copy}
                      variant="light"
                      leftSection={
                        copied ? <IconCheck size={16} /> : <IconCopy size={16} />
                      }
                    >
                      {copied ? "Link copied!" : "Copy invite link"}
                    </Button>
                  )}
                </CopyButton>
              </Group>
            </Stack>
          </Paper>

          {/* Scoring reference */}
          <Paper p="lg" radius="md" withBorder>
            <Stack gap="md">
              <Group gap="sm" align="center">
                <IconClipboardList
                  size={22}
                  color="var(--mantine-color-teal-6)"
                />
                <Title order={3}>Scoring Reference</Title>
              </Group>
              <Divider />
              <ScoringLegendTable />
            </Stack>
          </Paper>
        </Stack>
      ) : (
        <>
          <Stepper active={activeStep} allowNextStepsSelect={false}>
            {/* ===== STEP 0: DRAFT ===== */}
            <Stepper.Step label="Draft" description="Pick your players">
              <Stack gap="md" mt="md">
                {/* Turn banner */}
                {draft?.current_picker && (
                  <Paper
                    p="md"
                    radius="md"
                    style={{
                      backgroundColor:
                        draft.current_picker.uid === slimUser?.uid
                          ? "var(--mantine-color-blue-0)"
                          : "var(--mantine-color-gray-0)",
                      border:
                        draft.current_picker.uid === slimUser?.uid
                          ? "2px solid var(--mantine-color-blue-4)"
                          : "1px solid var(--mantine-color-gray-3)",
                    }}
                  >
                    <Group justify="space-between" align="center" wrap="wrap">
                      <Group gap="sm">
                        <IconFlame
                          size={24}
                          color={
                            draft.current_picker.uid === slimUser?.uid
                              ? "var(--mantine-color-blue-6)"
                              : "var(--mantine-color-gray-5)"
                          }
                        />
                        <Title
                          order={3}
                          c={
                            draft.current_picker.uid === slimUser?.uid
                              ? "blue"
                              : "dimmed"
                          }
                        >
                          {draft.current_picker.uid === slimUser?.uid
                            ? "Your turn to pick!"
                            : `${draft.current_picker.displayName || draft.current_picker.email} is picking...`}
                        </Title>
                      </Group>
                      <Badge variant="light" size="lg">
                        Pick {draft?.current_pick_number} of{" "}
                        {draft?.total_players}
                      </Badge>
                    </Group>
                  </Paper>
                )}

                {/* Draft order */}
                <Group gap="xs" wrap="wrap">
                  <Text size="xs" c="dimmed" fw={600}>
                    Order:
                  </Text>
                  {draft?.pick_order?.map((p, i) => (
                    <Badge
                      key={p.uid}
                      variant={
                        p.uid === draft?.current_picker?.uid ? "filled" : "light"
                      }
                      color={
                        p.uid === draft?.current_picker?.uid ? "blue" : "gray"
                      }
                      size="sm"
                    >
                      {i + 1}. {p.displayName || p.email}
                    </Badge>
                  ))}
                </Group>

                {Boolean(draft?.draft_picks?.length) && <MyDraftedPlayers />}
              </Stack>
            </Stepper.Step>

            {/* ===== STEP 1: PROP BETS ===== */}
            <Stepper.Step
              label="Prop Bets"
              description="Place your predictions"
            >
              <Box p="xl">
                <Title order={3}>Place Your Bets</Title>
                <Text c="dimmed" size="sm" mb="md">
                  Predict what will happen this season. Points are awarded for
                  correct answers at the end of the season.
                </Text>
                <PropBets season={season} onSubmit={addPropBetsToDraft} />
              </Box>
            </Stepper.Step>

            {/* ===== STEP 2: SUMMARY ===== */}
            <Stepper.Step label="Summary" description="Review & compete">
              <Stack>
                {!allPlayersDoneWithPropBets && (
                  <Alert color="yellow">
                    Waiting for all participants to submit their prop bets (
                    {draft?.prop_bets?.length || 0} /{" "}
                    {draft?.participants?.length})
                  </Alert>
                )}

                {allPlayersDoneWithPropBets && competition && (
                  <Center>
                    <Button
                      size="lg"
                      onClick={() =>
                        navigate(`/competitions/${draft!.competiton_id}`)
                      }
                    >
                      Go to your competition
                    </Button>
                  </Center>
                )}

                <Center>
                  <MyDraftedPlayers />
                </Center>

                <Box p="lg">
                  <Title ta="center" order={3} mb="md">
                    Prop Bets
                  </Title>
                  <PostDraftPropBetTable />
                </Box>

                <Box p="lg">
                  <Title ta="center" order={3} mb="md">
                    Draft Results
                  </Title>
                  <DraftTable
                    draft_picks={draft!.draft_picks}
                    participants={draft!.participants}
                    players={season.players}
                  />
                </Box>

                <Box p="lg">
                  <Title ta="center" order={3} mb="md">
                    Scoring Legend
                  </Title>
                  <ScoringLegendTable />
                </Box>
              </Stack>
            </Stepper.Step>
          </Stepper>

          {/* ===== PLAYER GRID (during drafting, full-width below stepper) ===== */}
          {phase === "drafting" && (
            <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} mt="md">
              {season.players.map((p) => {
                const isDrafted = isPlayerDrafted(p.name);
                const draftedBy = !isDrafted
                  ? null
                  : draft?.draft_picks.find((x) => x.player_name === p.name);
                return (
                  <Paper
                    radius="md"
                    withBorder
                    p="sm"
                    key={p.name + "-grid"}
                    style={{
                      opacity: isDrafted ? 0.5 : 1,
                      cursor: isDrafted ? "default" : "pointer",
                    }}
                  >
                    <Stack gap={6} align="center">
                      <Avatar
                        src={p.img}
                        size={80}
                        radius={80}
                        alt={p.name}
                        style={{
                          filter: isDrafted ? "grayscale(1)" : "none",
                        }}
                        onClick={() => {
                          modals.open({
                            withCloseButton: false,
                            children: (
                              <Stack>
                                <Center>
                                  <Title order={3}>{p.name}</Title>
                                </Center>
                                <Center>
                                  <Avatar
                                    size={"100%"}
                                    src={p.img}
                                    radius={10}
                                    alt={p.name}
                                  />
                                </Center>
                                {p.description && (
                                  <Text ta="center" c="dimmed">
                                    {p.description.split(" | ").map((x, i) => (
                                      <span key={i}>
                                        {x}
                                        <br />
                                      </span>
                                    ))}
                                  </Text>
                                )}
                              </Stack>
                            ),
                          });
                        }}
                      />
                      <Text
                        ta="center"
                        fw={600}
                        size="sm"
                        c={isDrafted ? "dimmed" : undefined}
                      >
                        {p.name}
                      </Text>

                      {isDrafted && draftedBy ? (
                        <Badge variant="light" color="gray" size="xs">
                          {draftedBy.user_name}
                        </Badge>
                      ) : (
                        <Button
                          fullWidth
                          size="xs"
                          variant={isCurrentDrafter ? "filled" : "light"}
                          onClick={() => draftPlayer(p.name)}
                          disabled={
                            !draft?.started ||
                            draft.finished ||
                            !isCurrentDrafter ||
                            isDrafted
                          }
                        >
                          Draft
                        </Button>
                      )}
                    </Stack>
                  </Paper>
                );
              })}
            </SimpleGrid>
          )}

          {/* ===== DRAFT RESULTS (visible during drafting) ===== */}
          {phase === "drafting" && (draft?.draft_picks?.length ?? 0) > 0 && (
            <Box p="lg">
              <Title ta="center" order={3} mb="md">
                Draft Results
              </Title>
              <DraftTable
                draft_picks={draft!.draft_picks}
                participants={draft!.participants}
                players={season.players}
              />
            </Box>
          )}

          {/* ===== SCORING LEGEND (visible during drafting) ===== */}
          {phase === "drafting" && (
            <Box p="lg">
              <Title ta="center" order={3} mb="md">
                Scoring Legend
              </Title>
              <ScoringLegendTable />
            </Box>
          )}
        </>
      )}
    </div>
  );
};

type FormData = {
  name: string;
};

type Props = {
  onSubmit: (values: FormData) => void;
};

const NameYourCompetition = ({ onSubmit }: Props) => {
  const form = useForm({
    initialValues: {
      name: "",
    },
    validate: {
      name: isNotEmpty("Do a fun name :)"),
    },
  });

  return (
    <>
      <form
        onSubmit={form.onSubmit((values) => {
          return onSubmit(values);
        })}
      >
        <TextInput
          label="Name your competition"
          placeholder="Jeff Probst Lovers"
          data-autofocus
          {...form.getInputProps("name")}
        />
        <Button fullWidth type="submit" mt="md">
          Submit
        </Button>
      </form>
    </>
  );
};

type PropBetsProps = {
  season: Season;
  onSubmit: (values: PropBetsFormData) => void;
};

const PropBets = ({ season, onSubmit }: PropBetsProps) => {
  const form = useForm<PropBetsFormData>({
    initialValues: {
      propbet_first_vote: "",
      propbet_ftc: "",
      propbet_idols: "",
      propbet_immunities: "",
      propbet_medical_evac: "",
      propbet_winner: "",
    },
    validate: {
      propbet_first_vote: isNotEmpty("Enter an answer"),
      propbet_ftc: isNotEmpty("Enter an answer"),
      propbet_idols: isNotEmpty("Enter an answer"),
      propbet_immunities: isNotEmpty("Enter an answer"),
      propbet_medical_evac: isNotEmpty("Enter an answer"),
      propbet_winner: isNotEmpty("Enter an answer"),
    },
  });

  const players = season?.players.map((x) => x.name);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement> | undefined,
  ) => {
    e?.preventDefault();

    const _validate = form.validate();

    if (_validate.hasErrors) return;

    onSubmit(form.values);
  };

  return (
    <Box>
      <form onSubmit={handleSubmit}>
        <Stack>
          <Select
            required
            label={PropBetsQuestions.propbet_winner.description}
            description={
              PropBetsQuestions.propbet_winner.point_value + " points"
            }
            data={players}
            {...form.getInputProps("propbet_winner")}
          />
          <Select
            required
            label={PropBetsQuestions.propbet_first_vote.description}
            description={
              PropBetsQuestions.propbet_first_vote.point_value + " points"
            }
            data={players}
            {...form.getInputProps("propbet_first_vote")}
          />
          <Select
            required
            label={PropBetsQuestions.propbet_idols.description}
            description={
              PropBetsQuestions.propbet_idols.point_value + " points"
            }
            data={players}
            {...form.getInputProps("propbet_idols")}
          />
          <Select
            required
            label={PropBetsQuestions.propbet_immunities.description}
            description={
              PropBetsQuestions.propbet_immunities.point_value + " points"
            }
            data={players}
            {...form.getInputProps("propbet_immunities")}
          />
          <Select
            required
            label={PropBetsQuestions.propbet_ftc.description}
            description={PropBetsQuestions.propbet_ftc.point_value + " points"}
            data={players}
            {...form.getInputProps("propbet_ftc")}
          />
          <Select
            required
            label={PropBetsQuestions.propbet_medical_evac.description}
            description={
              PropBetsQuestions.propbet_medical_evac.point_value + " points"
            }
            data={["Yes", "No"]}
            {...form.getInputProps("propbet_medical_evac")}
          />

          <Button type="submit">Submit Prop Bets</Button>
        </Stack>
      </form>
    </Box>
  );
};
