const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

type DraftSummary = {
  state?: { finished?: boolean };
  created_at?: number;
};

export function findAbandonedDrafts(
  drafts: Record<string, DraftSummary>,
  now: number,
): {
  toDelete: string[];
  toBackfill: string[];
  skippedFinished: number;
  skippedTooRecent: number;
} {
  const toDelete: string[] = [];
  const toBackfill: string[] = [];
  let skippedFinished = 0;
  let skippedTooRecent = 0;

  for (const [id, draft] of Object.entries(drafts)) {
    if (draft.state?.finished === true) {
      skippedFinished++;
      continue;
    }

    if (draft.created_at == null) {
      toBackfill.push(id);
      continue;
    }

    const age = now - draft.created_at;
    if (age > SEVEN_DAYS_MS) {
      toDelete.push(id);
    } else {
      skippedTooRecent++;
    }
  }

  return { toDelete, toBackfill, skippedFinished, skippedTooRecent };
}
