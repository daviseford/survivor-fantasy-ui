/**
 * Push generated season data to Firestore using Firebase Admin SDK.
 */

import * as fs from "fs";
import * as path from "path";

export async function pushSeasonToFirestore(
  seasonNum: number,
  dryRun = false,
): Promise<void> {
  const projectRoot = path.resolve(import.meta.dirname, "..", "..");
  const keyPath = path.join(projectRoot, "firebase-private-key.json");

  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `Firebase service account key not found at ${keyPath}.\n` +
        `Download it from the Firebase console and save it as firebase-private-key.json in the project root.`,
    );
  }

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

  // Dynamically import the season data
  const mod = await import(seasonDataPath);

  const playersKey = `SEASON_${seasonNum}_PLAYERS`;
  const episodesKey = `SEASON_${seasonNum}_EPISODES`;
  const challengesKey = `SEASON_${seasonNum}_CHALLENGES`;
  const eliminationsKey = `SEASON_${seasonNum}_ELIMINATIONS`;
  const eventsKey = `SEASON_${seasonNum}_EVENTS`;

  const players = mod[playersKey];
  const episodes = mod[episodesKey];
  const challenges = mod[challengesKey];
  const eliminations = mod[eliminationsKey];
  const events = mod[eventsKey];

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
        img: "",
        players,
        episodes,
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

  // Initialize Firebase Admin
  const { default: admin } = await import("firebase-admin");
  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf-8"));

  // Only initialize if not already initialized
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  const db = admin.firestore();

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
