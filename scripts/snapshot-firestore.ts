/**
 * Snapshot all season data from Firestore + RTDB drafts to local JSON.
 * Serves as both a comparison baseline and pre-migration backup.
 *
 * Usage: npx tsx scripts/snapshot-firestore.ts [season_numbers...]
 *
 * Examples:
 *   npx tsx scripts/snapshot-firestore.ts           # all seasons + all drafts
 *   npx tsx scripts/snapshot-firestore.ts 46 48 50  # specific seasons + all drafts
 *
 * READ-ONLY — never writes to Firestore or RTDB.
 */

import { getDatabase } from "firebase-admin/database";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

// Trigger Firebase Admin init (read-only usage)
import "./lib/admin.js";

const COLLECTIONS = [
  "seasons",
  "challenges",
  "eliminations",
  "events",
] as const;

function writeJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

async function snapshotSeason(
  db: FirebaseFirestore.Firestore,
  seasonNum: number,
  outDir: string,
): Promise<void> {
  const seasonKey = `season_${seasonNum}`;
  const seasonDir = path.join(outDir, seasonKey);

  fs.mkdirSync(seasonDir, { recursive: true });

  for (const collection of COLLECTIONS) {
    const doc = await db.collection(collection).doc(seasonKey).get();
    const data = doc.exists ? doc.data() : null;
    writeJson(path.join(seasonDir, `${collection}.json`), data);

    let status: string;
    if (!data) {
      status = "missing";
    } else if (collection === "seasons") {
      status = "exists";
    } else {
      status = String(Object.keys(data).length);
    }
    console.log(`  ${seasonKey}/${collection}: ${status}`);
  }
}

async function main(): Promise<void> {
  const db = getFirestore();
  const args = process.argv.slice(2).map(Number).filter(Boolean);

  // If no args, discover all seasons from the seasons collection
  let seasonNums: number[];
  if (args.length > 0) {
    seasonNums = args;
  } else {
    const snapshot = await db.collection("seasons").get();
    seasonNums = snapshot.docs
      .map((doc) => {
        const match = doc.id.match(/^season_(\d+)$/);
        return match ? Number(match[1]) : 0;
      })
      .filter(Boolean)
      .sort((a, b) => a - b);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = path.join("data", "firestore-snapshots", timestamp);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Snapshotting ${seasonNums.length} seasons to ${outDir}/\n`);

  for (const num of seasonNums) {
    await snapshotSeason(db, num, outDir);
  }

  // Snapshot RTDB drafts
  console.log("\n  Snapshotting RTDB drafts...");
  const rtdb = getDatabase();
  const draftsSnapshot = await rtdb.ref("drafts").once("value");
  const draftsData = draftsSnapshot.val();
  const draftCount = draftsData ? Object.keys(draftsData).length : 0;
  writeJson(path.join(outDir, "rtdb_drafts.json"), draftsData);
  console.log(`  rtdb/drafts: ${draftCount} drafts`);

  // Snapshot competitions from Firestore
  console.log("\n  Snapshotting competitions...");
  const competitionsSnap = await db.collection("competitions").get();
  const competitions = Object.fromEntries(
    competitionsSnap.docs.map((doc) => [doc.id, doc.data()]),
  );
  writeJson(path.join(outDir, "competitions.json"), competitions);
  console.log(`  competitions: ${competitionsSnap.docs.length}`);

  // Write a manifest
  const manifest = {
    snapshotAt: new Date().toISOString(),
    seasons: seasonNums,
    collections: [...COLLECTIONS],
    extras: ["rtdb_drafts", "competitions"],
  };
  writeJson(path.join(outDir, "manifest.json"), manifest);

  console.log(`\nSnapshot complete: ${outDir}/`);
}

main().catch((err) => {
  console.error("Snapshot failed:", err);
  process.exit(1);
});
