import {
  Badge,
  Card,
  Group,
  Image,
  SimpleGrid,
  Table,
  Text,
} from "@mantine/core";
import { onValue, ref, update } from "firebase/database";
import { shuffle, uniqBy } from "lodash-es";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { rt_db } from "../firebase";
import { useSeason } from "../hooks/useSeason";
import { useUser } from "../hooks/useUser";
import { Draft } from "../types";

export const DraftComponent = () => {
  const { draftId } = useParams();

  const { slimUser } = useUser();
  const { season } = useSeason();

  const [draft, setDraft] = useState<Draft>();

  console.log({ slimUser: slimUser, draft });

  useEffect(() => {
    if (!season || !draftId) return;

    const draftRef = ref(rt_db, "drafts/" + draftId);
    onValue(draftRef, (snapshot) => {
      const data = snapshot.val();
      console.log("rt data", data);
      setDraft(data || undefined);
    });
  }, [draftId, season]);

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

  const startDraft = async () => {
    console.log("START DRAFT");
    if (!draft || !slimUser?.uid) return;

    // todo: use this info
    const isInvalidNumberOfPlayers =
      draft.total_players % draft.participants.length !== 0;

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
        ...(draft.draft_picks || []),
        {
          season_id: Number(season),
          order: draft.current_pick_number,
          user_uid: slimUser.uid,
          player_name: playerName,
        },
      ],
    } satisfies Draft;

    if (finished) {
      _draft.current_picker = null;
    }

    console.log(_draft);

    await updateDraft(_draft);
  };

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
      {/* {!draft && <button onClick={() => createDraft()}>Create Draft</button>} */}

      {draft && !userIsParticipant && (
        <button onClick={joinDraft}>Join Draft</button>
      )}

      {draft && !draft?.started && (
        <button onClick={startDraft} disabled={draft.participants.length < 2}>
          Start Draft
          {draft.participants.length < 2 ? " (waiting for more players)" : ""}
        </button>
      )}

      <h3>
        Joined users:{" "}
        {draft?.participants
          .map((x) => x.displayName || x.email || x.uid)
          .join(", ")}
      </h3>
      <h1>Current Pick: {draft?.current_pick_number}</h1>

      <h2>
        Draft Status:{" "}
        {!draft
          ? "Not created"
          : draft.finished
            ? "Finished"
            : draft?.started
              ? "Started"
              : "Not started"}
      </h2>
      {draft?.current_picker && (
        <h2>Current Picker: {draft?.current_picker?.displayName}</h2>
      )}
      {draft?.pick_order && (
        <h2>
          Draft Order: {draft.pick_order.map((x) => x.displayName).join(", ")}
        </h2>
      )}
      {draft && (
        <h2>
          Remaining Picks:{" "}
          {draft?.total_players - (draft?.draft_picks?.length || 0)}
        </h2>
      )}

      <SimpleGrid cols={4}>
        {season.players.map((x) => {
          const isDrafted = isPlayerDrafted(x.name);
          return (
            <div key={x.name}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Card.Section>
                  {x.img && <Image src={x.img} height={160} alt={x.name} />}
                </Card.Section>

                <Group justify="space-between" mt="md" mb="xs">
                  <Text fw={500}>{x.name}</Text>
                  <Badge color="pink">Season {season.order}</Badge>
                  <Badge color={isDrafted ? "red" : "green"}>
                    {isDrafted ? "Drafted" : "Not drafted"}
                  </Badge>
                </Group>

                {/* <Text size="sm" c="dimmed">
        With Fjord Tours you can explore more of the magical fjord landscapes with tours and
        activities on and around the fjords of Norway
      </Text> */}

                <button
                  onClick={() => draftPlayer(x.name)}
                  disabled={
                    !draft?.started ||
                    draft.finished ||
                    !isCurrentDrafter ||
                    isDrafted
                  }
                >
                  Draft Me
                </button>
              </Card>
            </div>
          );
        })}
      </SimpleGrid>

      {draft?.started && <DraftTable draft={draft} />}
    </div>
  );
};

const DraftTable = ({ draft }: { draft: Draft }) => {
  const rows = draft.draft_picks.map((x) => {
    return (
      <Table.Tr key={x.player_name}>
        <Table.Td>{x.order}</Table.Td>
        <Table.Td>{x.player_name}</Table.Td>
        <Table.Td>
          {draft.participants.find((p) => p.uid === x.user_uid)?.displayName}
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <div>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Draft Position</Table.Th>
            <Table.Th>Player Name</Table.Th>
            <Table.Th>Drafted By</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </div>
  );
};
