/**
 * Push generated season data to Firestore using Firebase Admin SDK.
 * Reuses the shared admin init from ./admin.ts.
 */

import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

// Import to trigger shared Firebase Admin initialization
import "./admin.js";

export async function pushSeasonToFirestore(
  seasonNum: number,
  dryRun = false,
  seasonImg = "",
): Promise<void> {
  const projectRoot = path.resolve(import.meta.dirname, "..", "..");

  const seasonKey = `season_${seasonNum}`;
  const seasonDataPath = path.resolve(
    projectRoot,
    "src",
    "data",
    seasonKey,
    "index.ts",
  );

  if (!fs.existsSync(seasonDataPath)) {
    throw new Error(
      `Season data file not found at ${seasonDataPath}. Generate it first.`,
    );
  }

  // Dynamically import the season data (use file:// URL for Windows compatibility)
  const mod = await import(
    new URL(`file:///${seasonDataPath.replace(/\\/g, "/")}`).href
  );

  const playersKey = `SEASON_${seasonNum}_PLAYERS`;
  const episodesKey = `SEASON_${seasonNum}_EPISODES`;
  const challengesKey = `SEASON_${seasonNum}_CHALLENGES`;
  const eliminationsKey = `SEASON_${seasonNum}_ELIMINATIONS`;
  const eventsKey = `SEASON_${seasonNum}_EVENTS`;
  const lookupKey = `SEASON_${seasonNum}_CASTAWAY_LOOKUP`;

  const players = mod[playersKey];
  const episodes = mod[episodesKey];
  const challenges = mod[challengesKey];
  const eliminations = mod[eliminationsKey];
  const events = mod[eventsKey];
  const castawayLookup = mod[lookupKey];

  if (!players || !episodes) {
    throw new Error(
      `Missing required exports (${playersKey}, ${episodesKey}) in ${seasonDataPath}`,
    );
  }

  // Build the documents to upload
  const documents = [
    {
      path: `seasons/${seasonKey}`,
      data: {
        id: seasonKey,
        order: seasonNum,
        name: `Survivor ${seasonNum}`,
        img: seasonImg,
        players,
        episodes,
        castawayLookup: castawayLookup || {},
      },
    },
    {
      path: `challenges/${seasonKey}`,
      data: challenges || {},
    },
    {
      path: `eliminations/${seasonKey}`,
      data: eliminations || {},
    },
    {
      path: `events/${seasonKey}`,
      data: events || {},
    },
  ];

  if (dryRun) {
    console.log(`\n[DRY RUN] Would upload the following to Firestore:\n`);
    for (const doc of documents) {
      const dataStr = JSON.stringify(doc.data, null, 2);
      const preview =
        dataStr.length > 200 ? dataStr.slice(0, 200) + "..." : dataStr;
      console.log(`  ${doc.path}:`);
      console.log(`    ${preview}\n`);
    }
    return;
  }

  const db = getFirestore();

  console.log(`\nUploading season ${seasonNum} data to Firestore...\n`);

  const failures: string[] = [];
  for (const doc of documents) {
    try {
      const [collection, docId] = doc.path.split("/");
      await db.collection(collection).doc(docId).set(doc.data);
      console.log(`  [OK] ${doc.path}`);
    } catch (err) {
      console.error(`  [FAIL] ${doc.path}:`, err);
      failures.push(doc.path);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Firestore upload partially failed. ${failures.length} document(s) failed: ${failures.join(", ")}`,
    );
  }

  console.log(`\nFirestore upload complete.`);
}
