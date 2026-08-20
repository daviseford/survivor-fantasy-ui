import {
  Button,
  Checkbox,
  Divider,
  Group,
  Modal,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { useState } from "react";
import { proposeTrade } from "../../hooks/useTradeActions";
import {
  CastawayId,
  Competition,
  Player,
  Season,
  SlimUser,
  Trade,
} from "../../types";

export const ProposeTradeModal = ({
  opened,
  onClose,
  competition,
  season,
  existingTrades,
  eliminatedCastawayIds,
  myUid,
  myPlayers,
  playersByUid,
}: {
  opened: boolean;
  onClose: () => void;
  competition: Competition;
  season: Season;
  existingTrades: Trade[];
  eliminatedCastawayIds: CastawayId[];
  myUid: string;
  myPlayers: Player[];
  playersByUid: Record<string, Player[]>;
}) => {
  const [partnerUid, setPartnerUid] = useState<string | null>(null);
  const [mySelection, setMySelection] = useState<CastawayId[]>([]);
  const [theirSelection, setTheirSelection] = useState<CastawayId[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const partners = competition.participants.filter((p) => p.uid !== myUid);
  const alive = (players: Player[]) =>
    players.filter((p) => !eliminatedCastawayIds.includes(p.castaway_id));

  const partnerPlayers = partnerUid
    ? alive(playersByUid[partnerUid] ?? [])
    : [];

  const reset = () => {
    setPartnerUid(null);
    setMySelection([]);
    setTheirSelection([]);
  };

  const toggle = (
    id: CastawayId,
    selection: CastawayId[],
    setSelection: (ids: CastawayId[]) => void,
  ) =>
    setSelection(
      selection.includes(id)
        ? selection.filter((x) => x !== id)
        : [...selection, id],
    );

  const canSubmit =
    partnerUid !== null && mySelection.length > 0 && theirSelection.length > 0;

  const submit = async () => {
    if (!partnerUid) return;
    setSubmitting(true);
    const ok = await proposeTrade({
      competition,
      season,
      existingTrades,
      eliminatedCastawayIds,
      offeredByUid: myUid,
      offeredToUid: partnerUid,
      offeredCastawayIds: mySelection,
      requestedCastawayIds: theirSelection,
    });
    setSubmitting(false);
    if (ok) {
      reset();
      onClose();
    }
  };

  const playerCheckbox = (
    player: Player,
    selection: CastawayId[],
    setSelection: (ids: CastawayId[]) => void,
  ) => (
    <Checkbox
      key={player.castaway_id}
      label={player.full_name}
      checked={selection.includes(player.castaway_id)}
      onChange={() => toggle(player.castaway_id, selection, setSelection)}
    />
  );

  return (
    <Modal
      opened={opened}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Propose a trade"
      centered
    >
      <Stack gap="md">
        <Select
          label="Trade with"
          placeholder="Pick a participant"
          data={partners.map((p: SlimUser) => ({
            value: p.uid,
            label: p.displayName ?? p.email ?? p.uid,
          }))}
          value={partnerUid}
          onChange={(value) => {
            setPartnerUid(value);
            setTheirSelection([]);
          }}
        />

        <Divider label="You give up" labelPosition="center" />
        <Stack gap={6}>
          {alive(myPlayers).map((p) =>
            playerCheckbox(p, mySelection, setMySelection),
          )}
          {alive(myPlayers).length === 0 && (
            <Text size="sm" c="dimmed">
              You have no active players to trade.
            </Text>
          )}
        </Stack>

        <Divider label="You receive" labelPosition="center" />
        <Stack gap={6}>
          {!partnerUid && (
            <Text size="sm" c="dimmed">
              Choose a trade partner first.
            </Text>
          )}
          {partnerUid &&
            partnerPlayers.map((p) =>
              playerCheckbox(p, theirSelection, setTheirSelection),
            )}
          {partnerUid && partnerPlayers.length === 0 && (
            <Text size="sm" c="dimmed">
              They have no active players to trade.
            </Text>
          )}
        </Stack>

        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit} loading={submitting}>
            Propose trade
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
