import { describe, expect, it } from "vitest";
import { findAbandonedDrafts } from "../draft-cleanup";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

function makeDraft(
  overrides: {
    finished?: boolean;
    created_at?: number | null;
  } = {},
) {
  return {
    state: { finished: overrides.finished ?? false },
    ...(overrides.created_at !== null
      ? { created_at: overrides.created_at ?? NOW }
      : {}),
  };
}

describe("findAbandonedDrafts", () => {
  it("deletes unfinished draft older than 7 days", () => {
    const drafts = {
      draft_old: makeDraft({ created_at: NOW - SEVEN_DAYS_MS - 1 }),
    };
    const result = findAbandonedDrafts(drafts, NOW);
    expect(result.toDelete).toEqual(["draft_old"]);
  });

  it("keeps finished draft regardless of age", () => {
    const drafts = {
      draft_done: makeDraft({
        finished: true,
        created_at: NOW - 30 * SEVEN_DAYS_MS,
      }),
    };
    const result = findAbandonedDrafts(drafts, NOW);
    expect(result.toDelete).toEqual([]);
    expect(result.skippedFinished).toBe(1);
  });

  it("backfills draft with no created_at and does not delete it", () => {
    const drafts = {
      draft_nodate: makeDraft({ created_at: null }),
    };
    const result = findAbandonedDrafts(drafts, NOW);
    expect(result.toBackfill).toEqual(["draft_nodate"]);
    expect(result.toDelete).toEqual([]);
  });

  it("keeps unfinished draft younger than 7 days", () => {
    const drafts = {
      draft_recent: makeDraft({ created_at: NOW - SEVEN_DAYS_MS + 60_000 }),
    };
    const result = findAbandonedDrafts(drafts, NOW);
    expect(result.toDelete).toEqual([]);
    expect(result.skippedTooRecent).toBe(1);
  });

  it("handles empty drafts object", () => {
    const result = findAbandonedDrafts({}, NOW);
    expect(result.toDelete).toEqual([]);
    expect(result.toBackfill).toEqual([]);
    expect(result.skippedFinished).toBe(0);
    expect(result.skippedTooRecent).toBe(0);
  });

  it("correctly categorizes a mix of drafts", () => {
    const drafts = {
      draft_delete: makeDraft({ created_at: NOW - SEVEN_DAYS_MS - 1 }),
      draft_keep_finished: makeDraft({
        finished: true,
        created_at: NOW - 100 * 24 * 60 * 60 * 1000,
      }),
      draft_keep_recent: makeDraft({ created_at: NOW - 1000 }),
      draft_backfill: makeDraft({ created_at: null }),
    };
    const result = findAbandonedDrafts(drafts, NOW);
    expect(result.toDelete).toEqual(["draft_delete"]);
    expect(result.toBackfill).toEqual(["draft_backfill"]);
    expect(result.skippedFinished).toBe(1);
    expect(result.skippedTooRecent).toBe(1);
  });
});
