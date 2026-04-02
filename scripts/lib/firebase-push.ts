/**
 * Push generated season data to Firestore using Firebase Admin SDK.
 * Reuses the shared admin init from ./admin.ts.
 */

import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

// Import to trigger shared Firebase Admin initialization
import "./admin.js";

interface FirestoreDocument {
  collection: string;
  docId: string;
  data: Record<string, unknown>;
}

function getSeasonExport(
  mod: Record<string, unknown>,
  seasonNum: number,
  suffix: string,
): unknown {
  return mod[`SEASON_${seasonNum}_${suffix}`];
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

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

  // Use file:// URL for Windows compatibility with dynamic import
  const mod = await import(
    new URL(`file:///${seasonDataPath.replace(/\\/g, "/")}`).href
  );

  const players = getSeasonExport(mod, seasonNum, "PLAYERS");
  const episodes = getSeasonExport(mod, seasonNum, "EPISODES");
  const challenges = getSeasonExport(mod, seasonNum, "CHALLENGES");
  const eliminations = getSeasonExport(mod, seasonNum, "ELIMINATIONS");
  const events = getSeasonExport(mod, seasonNum, "EVENTS");
  const castawayLookup = getSeasonExport(mod, seasonNum, "CASTAWAY_LOOKUP");

  if (!players || !episodes) {
    throw new Error(
      `Missing required exports (SEASON_${seasonNum}_PLAYERS, SEASON_${seasonNum}_EPISODES) in ${seasonDataPath}`,
    );
  }

  const documents: FirestoreDocument[] = [
    {
      collection: "seasons",
      docId: seasonKey,
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
      collection: "challenges",
      docId: seasonKey,
      data: (challenges || {}) as Record<string, unknown>,
    },
    {
      collection: "eliminations",
      docId: seasonKey,
      data: (eliminations || {}) as Record<string, unknown>,
    },
    {
      collection: "events",
      docId: seasonKey,
      data: (events || {}) as Record<string, unknown>,
    },
  ];

  if (dryRun) {
    console.log(`\n[DRY RUN] Would upload the following to Firestore:\n`);
    for (const doc of documents) {
      const preview = truncate(JSON.stringify(doc.data, null, 2), 200);
      console.log(`  ${doc.collection}/${doc.docId}:`);
      console.log(`    ${preview}\n`);
    }
    return;
  }

  const db = getFirestore();
  console.log(`\nUploading season ${seasonNum} data to Firestore...\n`);

  const failures: string[] = [];
  for (const doc of documents) {
    const docPath = `${doc.collection}/${doc.docId}`;
    try {
      await db.collection(doc.collection).doc(doc.docId).set(doc.data);
      console.log(`  [OK] ${docPath}`);
    } catch (err) {
      console.error(`  [FAIL] ${docPath}:`, err);
      failures.push(docPath);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Firestore upload partially failed. ${failures.length} document(s) failed: ${failures.join(", ")}`,
    );
  }

  console.log(`\nFirestore upload complete.`);
}
