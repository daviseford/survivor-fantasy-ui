import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconArrowRight,
  IconArrowsExchange,
  IconCheck,
  IconChevronDown,
  IconClock,
  IconHistory,
  IconLock,
  IconPlus,
  IconX,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
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
import { useUser } from "../../hooks/useUser";
import { CastawayId, Player, Trade } from "../../types";
import { getParticipantName } from "../../utils/misc";
import { getTradeLockEpisode } from "../../utils/tradeUtils";
import { ProposeTradeModal } from "./ProposeTradeModal";
import styles from "./TradesSection.module.css";

const HISTORY_BATCH_SIZE = 5;

const resolvedAt = (trade: Trade): string =>
  typeof trade.resolved_at === "string" ? trade.resolved_at : trade.created_at;

type TradePlayer = Pick<Player, "castaway_id" | "full_name" | "img">;

const getPlayers = (
  players: Player[] | undefined,
  ids: CastawayId[],
): TradePlayer[] =>
  ids.map(
    (id) =>
      players?.find((player) => player.castaway_id === id) ?? {
        castaway_id: id,
        full_name: id,
        img: "",
      },
  );

const StatusBadge = ({
  trade,
  currentEpisode,
}: {
  trade: Trade;
  /** null means the competition is not episode-limited, so nothing is hidden. */
  currentEpisode: number | null;
}) => {
  if (trade.status === "accepted") {
    // A cutoff is normally the next episode to be revealed, which is safe to
    // name. Trades accepted before the cutoff was tied to `current_episode`
    // carry the season's latest *data* episode instead, which would reveal how
    // far the season has progressed -- hide anything beyond the next reveal.
    const cutoff = trade.effective_episode;
    const showCutoff =
      typeof cutoff === "number" &&
      (currentEpisode === null || cutoff <= currentEpisode + 1);
    return (
      <Badge
        color="green"
        variant="light"
        leftSection={<IconCheck size={12} />}
      >
        {showCutoff ? `Accepted · from Ep ${cutoff}` : "Accepted"}
      </Badge>
    );
  }
  if (trade.status === "rejected")
    return (
      <Badge color="red" variant="light" leftSection={<IconX size={12} />}>
        Declined
      </Badge>
    );
  if (trade.status === "canceled")
    return (
      <Badge color="gray" variant="light" leftSection={<IconX size={12} />}>
        Canceled
      </Badge>
    );
  return (
    <Badge color="yellow" variant="light" leftSection={<IconClock size={12} />}>
      Pending
    </Badge>
  );
};

const PlayerList = ({ players }: { players: TradePlayer[] }) => (
  <Stack gap={6}>
    {players.map((player) => (
      <Group key={player.castaway_id} gap="xs" wrap="nowrap">
        <Avatar src={player.img || undefined} alt="" size={30} />
        <Text size="sm" fw={600} lh={1.25}>
          {player.full_name}
        </Text>
      </Group>
    ))}
  </Stack>
);

const Exchange = ({
  leftLabel,
  leftPlayers,
  rightLabel,
  rightPlayers,
}: {
  leftLabel: string;
  leftPlayers: TradePlayer[];
  rightLabel: string;
  rightPlayers: TradePlayer[];
}) => (
  <div className={styles.exchange}>
    <Box className={styles.exchangeSide}>
      <Text className={styles.exchangeLabel}>{leftLabel}</Text>
      <PlayerList players={leftPlayers} />
    </Box>
    <div className={styles.exchangeArrow} aria-hidden="true">
      <IconArrowsExchange size={18} />
    </div>
    <Box className={styles.exchangeSide}>
      <Text className={styles.exchangeLabel}>{rightLabel}</Text>
      <PlayerList players={rightPlayers} />
    </Box>
  </div>
);

const TradeOffer = ({
  trade,
  title,
  subtitle,
  leftLabel,
  leftPlayers,
  rightLabel,
  rightPlayers,
  status,
  actions,
}: {
  trade: Trade;
  title: string;
  subtitle: string;
  leftLabel: string;
  leftPlayers: TradePlayer[];
  rightLabel: string;
  rightPlayers: TradePlayer[];
  status?: React.ReactNode;
  actions?: React.ReactNode;
}) => (
  <Box className={styles.offer} data-trade-id={trade.id}>
    <Group justify="space-between" align="flex-start" gap="sm" wrap="nowrap">
      <div>
        <Text fw={700} size="sm">
          {title}
        </Text>
        <Text size="xs" c="dimmed">
          {subtitle}
        </Text>
      </div>
      {status}
    </Group>

    <Exchange
      leftLabel={leftLabel}
      leftPlayers={leftPlayers}
      rightLabel={rightLabel}
      rightPlayers={rightPlayers}
    />

    {actions && <div className={styles.offerActions}>{actions}</div>}
  </Box>
);

type TradesSectionProps = {
  trades: Trade[];
  tradesLoaded: boolean;
  tradesError: Error | null;
};

export const TradesSection = ({
  trades,
  tradesLoaded,
  tradesError,
}: TradesSectionProps) => {
  const { slimUser } = useUser();
  const { data: competition } = useCompetition();
  const { data: season } = useSeason(competition?.season_id);
  // The propose modal works with tradable rosters (every accepted trade
  // applied), not display rosters: a player already promised away in a trade
  // that cuts over next episode cannot be offered again.
  const { tradableSurvivorsByUserUid, eliminatedSurvivors } =
    useCompetitionMeta();

  const { data: challenges, isReady: areChallengesReady } = useChallenges(
    competition?.season_id,
  );
  const { data: eliminations, isReady: areEliminationsReady } = useEliminations(
    competition?.season_id,
  );
  const { data: events, isReady: areEventsReady } = useEvents(
    competition?.season_id,
  );

  // acceptTrade derives the points cutoff from these three records. Accepting
  // before they arrive would compute a cutoff of episode 1 and hand over every
  // point already scored -- and the cutoff can never be corrected afterwards,
  // because firestore.rules only allows updates while status is "pending".
  const isScoringDataReady =
    areChallengesReady && areEliminationsReady && areEventsReady;

  const [modalOpen, setModalOpen] = useState(false);
  const [resolvingTradeId, setResolvingTradeId] = useState<string | null>(null);
  const [historyVisibility, setHistoryVisibility] = useState({
    competitionId: competition?.id,
    count: HISTORY_BATCH_SIZE,
  });

  const visibleHistoryCount =
    historyVisibility.competitionId === competition?.id
      ? historyVisibility.count
      : HISTORY_BATCH_SIZE;
  const myUid = slimUser?.uid;

  const { incoming, outgoing, history } = useMemo(() => {
    const pending = trades.filter((trade) => trade.status === "pending");

    return {
      incoming: pending.filter((trade) => trade.offered_to_uid === myUid),
      outgoing: pending.filter((trade) => trade.offered_by_uid === myUid),
      history: trades
        .filter((trade) => trade.status !== "pending")
        .sort((a, b) => resolvedAt(b).localeCompare(resolvedAt(a))),
    };
  }, [myUid, trades]);
  const visibleHistory = useMemo(
    () => history.slice(0, visibleHistoryCount),
    [history, visibleHistoryCount],
  );
  const remainingHistoryCount = history.length - visibleHistory.length;

  if (!competition || !season) return null;

  const isParticipant = !!myUid && competition.participant_uids.includes(myUid);

  const lockEpisode = getTradeLockEpisode(season, competition.current_episode);
  const tradingClosed = competition.finished || !!lockEpisode;

  const resolveTrade = async (
    tradeId: string,
    action: () => Promise<unknown>,
  ) => {
    setResolvingTradeId(tradeId);
    try {
      await action();
    } finally {
      setResolvingTradeId(null);
    }
  };

  // The pending subtitles describe an action still open ("review", "waiting"),
  // so resolved trades get a status-appropriate line instead.
  const subtitleFor = (trade: Trade, pendingCopy: string): string => {
    if (trade.status === "accepted") return "Completed trade";
    if (trade.status === "rejected") return "Offer declined";
    if (trade.status === "canceled") return "Offer withdrawn";
    return pendingCopy;
  };

  const perspective = (trade: Trade) => {
    const offeredPlayers = getPlayers(
      season.players,
      trade.offered_castaway_ids,
    );
    const requestedPlayers = getPlayers(
      season.players,
      trade.requested_castaway_ids,
    );
    const offeredBy = getParticipantName(
      competition.participants,
      trade.offered_by_uid,
      competition.team_names,
    );
    const offeredTo = getParticipantName(
      competition.participants,
      trade.offered_to_uid,
      competition.team_names,
    );

    if (trade.offered_to_uid === myUid) {
      return {
        title: `Offer from ${offeredBy}`,
        subtitle: subtitleFor(trade, "Review what changes hands"),
        leftLabel: "You receive",
        leftPlayers: offeredPlayers,
        rightLabel: "You send",
        rightPlayers: requestedPlayers,
      };
    }

    if (trade.offered_by_uid === myUid) {
      return {
        title: `Offer to ${offeredTo}`,
        subtitle: subtitleFor(trade, "Waiting for their response"),
        leftLabel: "You send",
        leftPlayers: offeredPlayers,
        rightLabel: "You receive",
        rightPlayers: requestedPlayers,
      };
    }

    return {
      title: `${offeredBy} and ${offeredTo}`,
      subtitle: subtitleFor(trade, "Trade between participants"),
      leftLabel: `${offeredBy} sends`,
      leftPlayers: offeredPlayers,
      rightLabel: `${offeredTo} sends`,
      rightPlayers: requestedPlayers,
    };
  };

  return (
    <Stack gap="lg">
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

      {tradesError && (
        <Alert
          variant="light"
          color="red"
          icon={<IconAlertCircle size={18} />}
          title="Trade activity is unavailable"
          role="alert"
        >
          Refresh the page to reconnect before proposing or responding to a
          trade.
        </Alert>
      )}

      {isParticipant && !competition.finished && (
        <Group justify="flex-end">
          <Button
            leftSection={<IconPlus size={17} />}
            onClick={() => setModalOpen(true)}
            disabled={tradingClosed || !tradesLoaded || !!tradesError}
          >
            Propose trade
          </Button>
        </Group>
      )}

      {incoming.length > 0 && (
        <Stack gap="sm">
          <Group gap="xs">
            <Title order={4}>Incoming offers</Title>
            <Badge color="grape" variant="light" circle>
              {incoming.length}
            </Badge>
          </Group>
          {incoming.map((trade) => {
            const view = perspective(trade);
            const isResolving = resolvingTradeId === trade.id;

            return (
              <TradeOffer
                key={trade.id}
                trade={trade}
                {...view}
                status={
                  <Badge color="grape" variant="light">
                    Your move
                  </Badge>
                }
                actions={
                  <Group gap="xs" justify="flex-end">
                    <Button
                      variant="subtle"
                      color="red"
                      leftSection={<IconX size={16} />}
                      disabled={isResolving}
                      onClick={() =>
                        resolveTrade(trade.id, () => rejectTrade(trade))
                      }
                    >
                      Decline
                    </Button>
                    <Button
                      color="green"
                      leftSection={<IconCheck size={16} />}
                      disabled={
                        tradingClosed ||
                        (competition.current_episode === null &&
                          !isScoringDataReady)
                      }
                      loading={isResolving}
                      onClick={() =>
                        resolveTrade(trade.id, () =>
                          acceptTrade({
                            isScoringDataReady,
                            trade,
                            competition,
                            season,
                            existingTrades: trades,
                            eliminatedCastawayIds: eliminatedSurvivors,
                            challenges,
                            eliminations,
                            events,
                          }),
                        )
                      }
                    >
                      Accept offer
                    </Button>
                  </Group>
                }
              />
            );
          })}
        </Stack>
      )}

      {outgoing.length > 0 && (
        <Stack gap="sm">
          <Group gap="xs">
            <Title order={4}>Sent offers</Title>
            <Badge color="yellow" variant="light" circle>
              {outgoing.length}
            </Badge>
          </Group>
          {outgoing.map((trade) => {
            const view = perspective(trade);
            const isResolving = resolvingTradeId === trade.id;

            return (
              <TradeOffer
                key={trade.id}
                trade={trade}
                {...view}
                status={
                  <StatusBadge
                    trade={trade}
                    currentEpisode={competition.current_episode}
                  />
                }
                actions={
                  <Button
                    variant="subtle"
                    color="gray"
                    loading={isResolving}
                    onClick={() =>
                      resolveTrade(trade.id, () => cancelTrade(trade))
                    }
                  >
                    Withdraw offer
                  </Button>
                }
              />
            );
          })}
        </Stack>
      )}

      {!tradesLoaded && !tradesError && (
        <Center py="xl" role="status" aria-live="polite">
          <Stack align="center" gap="xs">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              Loading trade activity
            </Text>
          </Stack>
        </Center>
      )}

      {tradesLoaded && history.length > 0 && (
        <Stack gap="sm">
          <Group justify="space-between" gap="sm" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
              <IconHistory size={18} color="var(--mantine-color-dimmed)" />
              <Title order={4}>Trade history</Title>
            </Group>
            <Text
              size="xs"
              c="dimmed"
              style={{ whiteSpace: "nowrap" }}
              aria-live="polite"
            >
              Showing {visibleHistory.length} of {history.length}
            </Text>
          </Group>
          {visibleHistory.map((trade) => (
            <TradeOffer
              key={trade.id}
              trade={trade}
              {...perspective(trade)}
              status={
                <StatusBadge
                  trade={trade}
                  currentEpisode={competition.current_episode}
                />
              }
            />
          ))}
          {remainingHistoryCount > 0 && (
            <Button
              variant="light"
              size="md"
              fullWidth
              leftSection={<IconChevronDown size={17} />}
              onClick={() =>
                setHistoryVisibility((current) => ({
                  competitionId: competition.id,
                  count:
                    (current.competitionId === competition.id
                      ? current.count
                      : HISTORY_BATCH_SIZE) + HISTORY_BATCH_SIZE,
                }))
              }
            >
              Load {Math.min(HISTORY_BATCH_SIZE, remainingHistoryCount)} more
            </Button>
          )}
        </Stack>
      )}

      {tradesLoaded && trades.length === 0 && (
        <Box className={styles.emptyState}>
          <div className={styles.emptyIcon} aria-hidden="true">
            <IconArrowRight size={22} />
          </div>
          <div>
            <Text fw={700}>No trade activity yet</Text>
            <Text size="sm" c="dimmed">
              Propose a swap when you spot a deal that helps both teams.
            </Text>
          </div>
        </Box>
      )}

      {myUid && !tradesError && (
        <ProposeTradeModal
          opened={modalOpen}
          onClose={() => setModalOpen(false)}
          competition={competition}
          season={season}
          existingTrades={trades}
          eliminatedCastawayIds={eliminatedSurvivors}
          myUid={myUid}
          myPlayers={tradableSurvivorsByUserUid[myUid] ?? []}
          playersByUid={tradableSurvivorsByUserUid}
        />
      )}
    </Stack>
  );
};
