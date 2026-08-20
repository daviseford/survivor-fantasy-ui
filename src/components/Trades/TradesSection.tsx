import { Alert, Badge, Button, Card, Group, Stack, Text } from "@mantine/core";
import { IconArrowsExchange, IconLock } from "@tabler/icons-react";
import { useState } from "react";
import { useChallenges } from "../../hooks/useChallenges";
import { useCompetition } from "../../hooks/useCompetition";
import { useCompetitionMeta } from "../../hooks/useCompetitionMeta";
import { useEliminations } from "../../hooks/useEliminations";
import { useEvents } from "../../hooks/useEvents";
import { useSeason } from "../../hooks/useSeason";
import {
  acceptTrade,
  cancelTrade,
  rejectTrade,
} from "../../hooks/useTradeActions";
import { useTrades } from "../../hooks/useTrades";
import { useUser } from "../../hooks/useUser";
import { CastawayId, Player, SlimUser, Trade } from "../../types";
import { getTradeLockEpisode } from "../../utils/tradeUtils";
import { ProposeTradeModal } from "./ProposeTradeModal";

const participantName = (participants: SlimUser[], uid: string): string =>
  participants.find((p) => p.uid === uid)?.displayName ??
  participants.find((p) => p.uid === uid)?.email ??
  "Unknown";

const castawayNames = (
  players: Player[] | undefined,
  ids: CastawayId[],
): string =>
  ids
    .map((id) => players?.find((p) => p.castaway_id === id)?.full_name ?? id)
    .join(", ");

const StatusBadge = ({ trade }: { trade: Trade }) => {
  if (trade.status === "accepted")
    return (
      <Badge color="green" variant="light">
        Accepted · points from Ep {trade.effective_episode}
      </Badge>
    );
  if (trade.status === "rejected")
    return (
      <Badge color="red" variant="light">
        Rejected
      </Badge>
    );
  if (trade.status === "canceled")
    return (
      <Badge color="gray" variant="light">
        Canceled
      </Badge>
    );
  return (
    <Badge color="yellow" variant="light">
      Pending
    </Badge>
  );
};

export const TradesSection = () => {
  const { slimUser } = useUser();
  const { data: competition } = useCompetition();
  const { data: season } = useSeason(competition?.season_id);
  const { data: trades } = useTrades(competition?.id);
  const { survivorsByUserUid, eliminatedSurvivors } = useCompetitionMeta();

  const { data: challenges } = useChallenges(competition?.season_id);
  const { data: eliminations } = useEliminations(competition?.season_id);
  const { data: events } = useEvents(competition?.season_id);

  const [modalOpen, setModalOpen] = useState(false);

  if (!competition || !season) return null;

  const myUid = slimUser?.uid;
  const isParticipant = !!myUid && competition.participant_uids.includes(myUid);

  const lockEpisode = getTradeLockEpisode(season);
  const tradingClosed = competition.finished || !!lockEpisode;

  const pending = trades.filter((t) => t.status === "pending");
  const incoming = pending.filter((t) => t.offered_to_uid === myUid);
  const outgoing = pending.filter((t) => t.offered_by_uid === myUid);
  const history = trades.filter((t) => t.status !== "pending");

  const describe = (trade: Trade) =>
    `${participantName(competition.participants, trade.offered_by_uid)} gives ${castawayNames(season.players, trade.offered_castaway_ids)} to ${participantName(competition.participants, trade.offered_to_uid)} for ${castawayNames(season.players, trade.requested_castaway_ids)}`;

  return (
    <Stack gap="md">
      {lockEpisode && !competition.finished && (
        <Alert
          variant="light"
          color="orange"
          icon={<IconLock size={18} />}
          title="Trades are locked"
        >
          Episode {lockEpisode.order} airs today. Trading reopens tomorrow.
        </Alert>
      )}

      {isParticipant && !competition.finished && (
        <Group>
          <Button
            leftSection={<IconArrowsExchange size={16} />}
            onClick={() => setModalOpen(true)}
            disabled={tradingClosed}
          >
            Propose trade
          </Button>
        </Group>
      )}

      {incoming.length > 0 && (
        <Stack gap="xs">
          <Text fw={600} size="sm">
            Incoming offers
          </Text>
          {incoming.map((trade) => (
            <Card key={trade.id} withBorder radius="md" padding="sm">
              <Group justify="space-between" align="center" wrap="wrap">
                <Text size="sm">{describe(trade)}</Text>
                <Group gap="xs">
                  <Button
                    size="compact-sm"
                    color="green"
                    disabled={tradingClosed}
                    onClick={() =>
                      acceptTrade({
                        trade,
                        competition,
                        season,
                        existingTrades: trades,
                        eliminatedCastawayIds: eliminatedSurvivors,
                        challenges,
                        eliminations,
                        events,
                      })
                    }
                  >
                    Accept
                  </Button>
                  <Button
                    size="compact-sm"
                    color="red"
                    variant="light"
                    onClick={() => rejectTrade(trade)}
                  >
                    Reject
                  </Button>
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      )}

      {outgoing.length > 0 && (
        <Stack gap="xs">
          <Text fw={600} size="sm">
            Your pending offers
          </Text>
          {outgoing.map((trade) => (
            <Card key={trade.id} withBorder radius="md" padding="sm">
              <Group justify="space-between" align="center" wrap="wrap">
                <Text size="sm">{describe(trade)}</Text>
                <Button
                  size="compact-sm"
                  color="gray"
                  variant="light"
                  onClick={() => cancelTrade(trade)}
                >
                  Cancel
                </Button>
              </Group>
            </Card>
          ))}
        </Stack>
      )}

      {history.length > 0 && (
        <Stack gap="xs">
          <Text fw={600} size="sm">
            History
          </Text>
          {history.map((trade) => (
            <Card key={trade.id} withBorder radius="md" padding="sm">
              <Group justify="space-between" align="center" wrap="wrap">
                <Text size="sm">{describe(trade)}</Text>
                <StatusBadge trade={trade} />
              </Group>
            </Card>
          ))}
        </Stack>
      )}

      {trades.length === 0 && (
        <Text size="sm" c="dimmed">
          No trades yet.
        </Text>
      )}

      {myUid && (
        <ProposeTradeModal
          opened={modalOpen}
          onClose={() => setModalOpen(false)}
          competition={competition}
          season={season}
          existingTrades={trades}
          eliminatedCastawayIds={eliminatedSurvivors}
          myUid={myUid}
          myPlayers={survivorsByUserUid[myUid] ?? []}
          playersByUid={survivorsByUserUid}
        />
      )}
    </Stack>
  );
};
