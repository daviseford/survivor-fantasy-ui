/**
 * Migration script: Backfill competition lifecycle state.
 *
 * - Removes the vestigial `started` field from all competition documents
 * - Sets `finished: true` for competitions whose season has a `win_survivor` event
 * - Sets `finished: false` for competitions whose season is still in progress
 *
 * Uses admin SDK (bypasses Firestore security rules). The migration does NOT
 * apply the client-side episode gate — it sets finished based on whether the
 * season has a winner, regardless of current_episode. This is a retrospective
 * data correction.
 *
 * Usage:
 *   yarn tsx scripts/migrate-competition-state.ts            # dry run (default)
 *   yarn tsx scripts/migrate-competition-state.ts --upload    # write to Firestore
 */

import { FieldValue, getFirestore } from "firebase-admin/firestore";

// Trigger Firebase Admin init
import "./lib/admin.js";

async function main(): Promise<void> {
  const upload = process.argv.includes("--upload");
  const db = getFirestore();

  // Log project ID for operator verification
  const projectId = db.projectId;
  console.log(`Firebase project: ${projectId}`);
  console.log(
    `Mode: ${upload ? "UPLOAD (writing to Firestore)" : "DRY RUN (read-only)"}\n`,
  );

  // Read all competitions
  const competitionsSnap = await db.collection("competitions").get();
  console.log(`Found ${competitionsSnap.docs.length} competitions\n`);

  for (const compDoc of competitionsSnap.docs) {
    const comp = compDoc.data();
    const compId = compDoc.id;
    const seasonId = comp.season_id as string;

    // Read the season's events
    const eventsDoc = await db.collection("events").doc(seasonId).get();
    const eventsData = eventsDoc.exists ? (eventsDoc.data() ?? {}) : {};
    const hasWinner = Object.values(eventsData).some(
      (e: unknown) => (e as { action: string }).action === "win_survivor",
    );

    const oldStarted = comp.started;
    const oldFinished = comp.finished;
    const newFinished = hasWinner;

    const changes: string[] = [];

    if (oldStarted !== undefined) {
      changes.push(`started: ${oldStarted} -> (removed)`);
    }

    if (oldFinished !== newFinished) {
      changes.push(`finished: ${oldFinished} -> ${newFinished}`);
    }

    if (changes.length === 0) {
      console.log(`  ${compId} (${seasonId}): no changes needed`);
      continue;
    }

    console.log(
      `  ${compId} (${seasonId}, ep=${comp.current_episode ?? "null"}): ${changes.join(", ")}`,
    );

    if (upload) {
      const update: Record<string, unknown> = {
        finished: newFinished,
      };

      // Remove the started field entirely
      if (oldStarted !== undefined) {
        update.started = FieldValue.delete();
      }

      await db.collection("competitions").doc(compId).update(update);
      console.log(`    -> written`);
    }
  }

  if (!upload) {
    console.log("\nDry run complete. Re-run with --upload to apply changes.");
  } else {
    console.log("\nMigration complete.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
