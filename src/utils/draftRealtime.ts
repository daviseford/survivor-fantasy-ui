import type { Draft, DraftPick, PropBetsEntry, SlimUser } from "../types";

type IndexedRecord<T> = Record<string, T>;

type RealtimeDraftState = {
  started?: boolean;
  finished?: boolean;
  current_pick_number?: number;
};

export type RealtimeDraft = Omit<
  Draft,
  | "participants"
  | "pick_order"
  | "draft_picks"
  | "prop_bets"
  | "current_picker"
  | "current_pick_number"
  | "started"
  | "finished"
> & {
  participants?: IndexedRecord<SlimUser> | SlimUser[];
  pick_order_uids?: IndexedRecord<string> | string[];
  turns?: IndexedRecord<string>;
  draft_picks?: IndexedRecord<DraftPick> | DraftPick[];
  prop_bets?: IndexedRecord<PropBetsEntry> | PropBetsEntry[];
  state?: RealtimeDraftState;
  started?: boolean;
  finished?: boolean;
  current_pick_number?: number;
  current_picker?: SlimUser | null;
  pick_order?: SlimUser[];
};

const compareKeys = ([a]: [string, unknown], [b]: [string, unknown]) =>
  Number(a) - Number(b);

function recordToOrderedArray<T>(value?: IndexedRecord<T> | T[]): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return Object.entries(value)
    .sort(compareKeys)
    .map(([, item]) => item);
}

function recordValues<T>(value?: IndexedRecord<T> | T[]): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return Object.values(value);
}

export function buildParticipantMap(
  participants: SlimUser[],
): Record<string, SlimUser> {
  return Object.fromEntries(
    participants.map((participant) => [participant.uid, participant]),
  );
}

export function buildPickOrderUidMap(
  participants: SlimUser[],
): Record<string, string> {
  return Object.fromEntries(
    participants.map((participant, index) => [String(index), participant.uid]),
  );
}

export function buildTurnsMap(
  participants: SlimUser[],
  totalPlayers: number,
): Record<string, string> {
  if (participants.length === 0) return {};

  return Object.fromEntries(
    Array.from({ length: totalPlayers }, (_, index) => [
      String(index + 1),
      participants[index % participants.length].uid,
    ]),
  );
}

export function normalizeDraft(raw?: RealtimeDraft | null): Draft | undefined {
  if (!raw) return undefined;

  const participants = recordValues(raw.participants);
  const participantsByUid = new Map(
    participants.map((participant) => [participant.uid, participant]),
  );

  const draftPicks = recordValues(raw.draft_picks).sort(
    (a, b) => a.order - b.order,
  );
  const propBets = recordValues(raw.prop_bets);

  const pickOrderUids = recordToOrderedArray(raw.pick_order_uids);
  const legacyPickOrder = Array.isArray(raw.pick_order) ? raw.pick_order : [];
  const pickOrder =
    pickOrderUids.length > 0
      ? pickOrderUids
          .map((uid) => participantsByUid.get(uid))
          .filter((participant): participant is SlimUser =>
            Boolean(participant),
          )
      : legacyPickOrder;

  const currentPickNumber =
    raw.state?.current_pick_number ?? raw.current_pick_number ?? 0;
  const started = raw.state?.started ?? raw.started ?? false;
  const finished = raw.state?.finished ?? raw.finished ?? false;

  const turnUid =
    raw.turns?.[String(currentPickNumber)] ??
    (started && !finished && pickOrder.length > 0 && currentPickNumber > 0
      ? pickOrder[(currentPickNumber - 1) % pickOrder.length]?.uid
      : undefined);

  const currentPicker =
    !started || finished
      ? null
      : turnUid
        ? (participantsByUid.get(turnUid) ?? null)
        : (raw.current_picker ?? null);

  return {
    id: raw.id,
    season_id: raw.season_id,
    season_num: raw.season_num,
    competiton_id: raw.competiton_id,
    creator_uid: raw.creator_uid,
    participants,
    total_players: raw.total_players,
    current_pick_number: currentPickNumber,
    current_picker: currentPicker,
    pick_order: pickOrder,
    draft_picks: draftPicks,
    prop_bets: propBets,
    started,
    finished,
  };
}
