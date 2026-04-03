/**
 * Delete abandoned drafts from the Firebase Realtime Database.
 *
 * A draft is abandoned if state.finished !== true and created_at is
 * more than 7 days ago. Drafts without created_at are backfilled with
 * the current timestamp so they become eligible on the next run.
 *
 * Usage: yarn tsx scripts/cleanup-abandoned-drafts.ts
 */

import { getDatabase } from "firebase-admin/database";
import * as fs from "fs";
import "./lib/admin.js";
import { findAbandonedDrafts } from "./lib/draft-cleanup.js";

interface CleanupResult {
  backfilled: number;
  deleted: string[];
  skippedFinished: number;
  skippedTooRecent: number;
  error?: string;
}

async function main(): Promise<void> {
  const now = Date.now();
  const db = getDatabase();
  const draftsRef = db.ref("drafts");

  const snapshot = await draftsRef.once("value");
  const allDrafts = snapshot.val() as Record<string, unknown> | null;

  if (!allDrafts || Object.keys(allDrafts).length === 0) {
    console.log("No drafts found in RTDB.");
    writeResult({
      backfilled: 0,
      deleted: [],
      skippedFinished: 0,
      skippedTooRecent: 0,
    });
    return;
  }

  console.log(`Found ${Object.keys(allDrafts).length} total drafts.`);

  const { toDelete, toBackfill, skippedFinished, skippedTooRecent } =
    findAbandonedDrafts(
      allDrafts as Record<
        string,
        { state?: { finished?: boolean }; created_at?: number }
      >,
      now,
    );

  // Backfill missing created_at
  if (toBackfill.length > 0) {
    console.log(`\nBackfilling created_at for ${toBackfill.length} drafts:`);
    for (const id of toBackfill) {
      console.log(`  - ${id}`);
      await draftsRef.child(id).child("created_at").set(now);
    }
  }

  // Dry-run log
  console.log(`\nDrafts to delete (${toDelete.length}):`);
  for (const id of toDelete) {
    console.log(`  - ${id}`);
  }
  console.log(
    `Skipped: ${skippedFinished} finished, ${skippedTooRecent} too recent, ${toBackfill.length} backfilled`,
  );

  // Delete
  for (const id of toDelete) {
    await draftsRef.child(id).remove();
  }

  console.log(`\nDeleted ${toDelete.length} abandoned drafts.`);

  writeResult({
    backfilled: toBackfill.length,
    deleted: toDelete,
    skippedFinished,
    skippedTooRecent,
  });
  process.exit(0);
}

function writeResult(result: CleanupResult): void {
  fs.writeFileSync("cleanup-result.json", JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("Cleanup failed:", err);
  writeResult({
    backfilled: 0,
    deleted: [],
    skippedFinished: 0,
    skippedTooRecent: 0,
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
