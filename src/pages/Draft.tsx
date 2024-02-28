import {
  Alert,
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  Center,
  CopyButton,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { onValue, ref, update } from "firebase/database";
import { doc, setDoc } from "firebase/firestore";
import { shuffle, uniqBy } from "lodash-es";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { v4 } from "uuid";
import { DraftTable } from "../components/DraftTable";
import { db, rt_db } from "../firebase";
import { useCompetition } from "../hooks/useCompetition";
import { useSeason } from "../hooks/useSeason";
import { useUser } from "../hooks/useUser";
import { Competition, Draft } from "../types";

export const DraftComponent = () => {
  const { draftId } = useParams();

  const navigate = useNavigate();

  const { slimUser } = useUser();
  const { data: season } = useSeason();

  const [draft, setDraft] = useState<Draft>();
  const [competitionId, setCompetitionId] = useState<Competition["id"]>();

  const { data: competition } = useCompetition(competitionId);

  console.log({ slimUser, draft });

  useEffect(() => {
    if (!season || !draftId || !slimUser) return;

    const draftRef = ref(rt_db, "drafts/" + draftId);
    onValue(draftRef, (snapshot) => {
      const data = snapshot.val();
      console.log("rt data", data);
      setDraft(data || undefined);
    });
  }, [draftId, season, slimUser]);

  const createCompetition = async (competition_name: string) => {
    if (!season || !draft) return;

    const id = `competition_${v4()}` as const;

    const competition = {
      id,
      competition_name,
      draft_id: draft.id,
      season_id: season?.id,
      season_num: season?.order,
      creator_uid: draft.creator_uid,
      participant_uids: draft.participants.map((x) => x.uid),
      participants: draft?.participants,
      draft_picks: draft.draft_picks,
      finished: false,
      started: false,
      current_episode: null,
    } satisfies Competition;

    console.log("CREATING A COMPETITION: ", competition);
    await setDoc(doc(db, "competitions", id), competition);

    setCompetitionId(id);
  };

  const updateDraft = async (_draft: Draft) => {
    await update(ref(rt_db), { ["drafts/" + draftId]: _draft });
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

  // todo: use this info
  const isInvalidNumberOfPlayers = !draft
    ? false
    : draft.total_players % draft.participants.length !== 0;

  const startDraft = async () => {
    console.log("START DRAFT");
    if (!draft || !slimUser?.uid) return;

    const _draftOrder = shuffle(draft.participants);

    const _draft = {
      ...draft,
      started: true,
      current_pick_number: 1,
      current_picker: _draftOrder[0],
      pick_order: _draftOrder,
    } satisfies Draft;

    console.log({ _draftOrder, isInvalidNumberOfPlayers, _draft });

    await updateDraft(_draft);
  };

  const draftPlayer = async (playerName: string) => {
    console.log("Selected " + playerName);

    if (!season || !draft || !slimUser?.uid) return;

    const finished = draft.current_pick_number >= draft.total_players;

    // e.g. 2
    const pickOrderIdxOfLastPicker = draft.pick_order.findIndex(
      (x) => x.uid === draft.current_picker?.uid,
    );

    const nextCurrentPicker = finished
      ? null
      : // The next "current_picker" will either be the next entry in the array
        // Or, if there isn't a next one, we loop back to the start
        draft.pick_order?.[pickOrderIdxOfLastPicker + 1] ?? draft.pick_order[0];

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
          user_name: slimUser.displayName || slimUser.uid,
          player_name: playerName,
        },
      ],
    } satisfies Draft;

    if (finished) {
      _draft.current_picker = null;
    }

    console.log(_draft);

    await updateDraft(_draft);

    // if (finished) {
    //   const onClose = async () => {
    //     modals.closeAll();
    //     // create an entry in our DB
    //     await createCompetition();
    //   };

    //   modals.open({
    //     title: "What should we call your Competition?",
    //     children: <NameYourCompetition onSubmit={onClose} />,
    //   });

    //   // await createCompetition();
    // }
  };

  useEffect(() => {
    if (!draft?.finished || competition || draft.creator_uid !== slimUser?.uid)
      return;

    const onClose = async (values: FormData) => {
      modals.closeAll();
      // create an entry in our DB
      await createCompetition(values.name);
    };

    modals.open({
      title: "What should we call your Competition?",
      closeOnClickOutside: false,
      withCloseButton: false,
      children: <NameYourCompetition onSubmit={onClose} />,
    });

    // await createCompetition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competition, draft, slimUser?.uid]);

  const isPlayerDrafted = (name: string) => {
    if (!draft?.draft_picks) return false;

    return draft.draft_picks.some((x) => x.player_name === name);
  };

  const isCurrentDrafter =
    draft?.started &&
    !draft.finished &&
    draft.current_picker?.uid === slimUser?.uid;

  if (!season) return <div>Error: Missing data</div>;

  return (
    <div>
      <Stack>
        <Group>
          {season && !slimUser && (
            <Button
              onClick={() =>
                modals.openContextModal({ modal: "AuthModal", innerProps: {} })
              }
            >
              Log in to join this draft
            </Button>
          )}

          {draft && !userIsParticipant && slimUser && (
            <Button onClick={joinDraft}>Join Draft</Button>
          )}

          {draft &&
            !draft?.started &&
            draft.creator_uid === slimUser?.uid &&
            !isInvalidNumberOfPlayers && (
              <Button
                onClick={startDraft}
                disabled={draft.participants.length < 2}
              >
                Start Draft
                {draft.participants.length < 2
                  ? " (waiting for more players)"
                  : ""}
              </Button>
            )}

          {draft && !draft?.started && draft.creator_uid !== slimUser?.uid && (
            <Button disabled={true}>Waiting for host to start the draft</Button>
          )}

          {draft && !draft?.started && (
            <CopyButton value={window.location.href}>
              {({ copied, copy }) => (
                <Button
                  color={copied ? "teal" : "blue"}
                  onClick={copy}
                  variant="outline"
                >
                  {copied
                    ? "Copied url"
                    : "Invite friends to join this draft (send them this url)"}
                </Button>
              )}
            </CopyButton>
          )}

          {draft?.finished && (competition?.id || competitionId) && (
            <Button
              onClick={() =>
                navigate(`/competitions/${competition?.id || competitionId}`)
              }
            >
              Go to your newly created competition to get started
            </Button>
          )}
        </Group>

        {draft && isInvalidNumberOfPlayers && (
          <Alert color="red">
            You cannot draft evenly with this number of players. Please invite a
            friend or start over.
          </Alert>
        )}

        <Breadcrumbs separator="|">
          <Title order={3}>Draft ID: ...{draft?.id.slice(-4)}</Title>
          <Title order={3}>
            Status:{" "}
            {!draft
              ? "Not created"
              : draft.finished
                ? "Finished"
                : draft?.started
                  ? "Started"
                  : "Not started"}
          </Title>
          <Title order={3}>
            Participants:{" "}
            {draft?.participants
              .map((x) => x.displayName || x.email || x.uid)
              .join(", ")}
          </Title>
        </Breadcrumbs>

        <Breadcrumbs separator="|">
          {Boolean(draft?.current_pick_number) && (
            <Title order={3}>Current Pick: {draft?.current_pick_number}</Title>
          )}

          {draft?.current_picker && (
            <Title order={3}>
              Picking: {draft?.current_picker?.displayName}
            </Title>
          )}

          {draft?.draft_picks && (
            <Title order={3}>
              Remaining Picks:{" "}
              {draft?.total_players - (draft?.draft_picks?.length || 0)}
            </Title>
          )}
          {draft?.pick_order && (
            <Title order={3}>
              Draft Order:{" "}
              {draft.pick_order.map((x) => x.displayName).join(", ")}
            </Title>
          )}
        </Breadcrumbs>

        {draft?.current_picker && (
          <Center p={"xl"}>
            <Title
              c={draft.current_picker.uid === slimUser?.uid ? "blue" : "gray"}
            >
              {draft.current_picker.uid === slimUser?.uid
                ? "You are up!"
                : `${draft.current_picker.displayName} is picking`}{" "}
            </Title>
          </Center>
        )}
        {draft?.finished && (
          <Center p={"xl"}>
            <Title c={"blue"}>Finished!</Title>
          </Center>
        )}
      </Stack>

      {!draft?.finished && (
        <SimpleGrid cols={4}>
          {season.players.map((p) => {
            const isDrafted = isPlayerDrafted(p.name);

            const draftedBy = !isDrafted
              ? null
              : draft?.draft_picks.find((x) => x.player_name === p.name)
                  ?.user_name;

            return (
              <Paper
                radius="md"
                withBorder
                p="lg"
                bg={
                  isDrafted
                    ? "var(--mantine-color-gray-4)"
                    : "var(--mantine-color-body)"
                }
              >
                <Avatar
                  src={p.img}
                  size={120}
                  radius={120}
                  mx="auto"
                  onClick={() => {
                    modals.open({
                      withCloseButton: false,
                      children: (
                        <Stack>
                          <Center>
                            <Title>{p.name}</Title>
                          </Center>
                          <Center>
                            <Avatar size={"100%"} src={p.img} radius={10} />
                          </Center>

                          <Center>
                            {p.description && (
                              <Text ta="center" fz="lg" c="dimmed">
                                {p.description.split(" | ").map((x) => (
                                  <>
                                    {x}
                                    <br />
                                  </>
                                ))}
                              </Text>
                            )}
                          </Center>
                        </Stack>
                      ),
                    });
                  }}
                />
                <Text ta="center" fz="lg" fw={500} mt="md">
                  {p.name}
                </Text>
                {p.description && (
                  <Text ta="center" fz="sm" c="dimmed">
                    {p.description.split(" | ").map((x) => (
                      <>
                        {x}
                        <br />
                      </>
                    ))}
                  </Text>
                )}
                <Group justify="space-between" mt="md" mb="xs">
                  <Badge color="pink">Season {season.order}</Badge>
                  {draftedBy && (
                    <Badge color={"blue"}>Drafted by {draftedBy}</Badge>
                  )}
                  <Badge color={isDrafted ? "red" : "green"}>
                    {isDrafted ? "Drafted" : "Available"}
                  </Badge>
                </Group>

                {!isDrafted && (
                  <Button
                    fullWidth
                    onClick={() => draftPlayer(p.name)}
                    disabled={
                      !draft?.started ||
                      draft.finished ||
                      !isCurrentDrafter ||
                      isDrafted
                    }
                  >
                    Draft Me
                  </Button>
                )}
              </Paper>
            );
          })}
        </SimpleGrid>
      )}

      {draft?.started && (
        <DraftTable
          draft_picks={draft.draft_picks}
          participants={draft.participants}
          players={season.players}
        />
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
