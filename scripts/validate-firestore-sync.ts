/**
 * Validate that Firestore event data matches local season data files.
 *
 * Compares local SEASON_N_EVENTS exports against a Firestore snapshot
 * to detect missing or mismatched events. Run after regenerating season
 * data to check if Firestore needs a re-push.
 *
 * Usage:
 *   yarn tsx scripts/validate-firestore-sync.ts                  # validate all seasons
 *   yarn tsx scripts/validate-firestore-sync.ts 47 48 49         # validate specific seasons
 *   yarn tsx scripts/validate-firestore-sync.ts --snapshot <dir> # use specific snapshot
 *
 * Requires a recent Firestore snapshot (run: yarn tsx scripts/snapshot-firestore.ts)
 */

import * as fs from "fs";
import * as path from "path";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const SNAPSHOT_BASE = path.join(PROJECT_ROOT, "data", "firestore-snapshots");

interface EventRecord {
  action: string;
  castaway_id: string;
  episode_num: number;
  multiplier: number | null;
}

function getLatestSnapshotDir(): string | null {
  if (!fs.existsSync(SNAPSHOT_BASE)) return null;
  const dirs = fs
    .readdirSync(SNAPSHOT_BASE)
    .filter((d) => fs.statSync(path.join(SNAPSHOT_BASE, d)).isDirectory())
    .sort()
    .reverse();
  return dirs[0] ? path.join(SNAPSHOT_BASE, dirs[0]) : null;
}

function getSeasonDataPath(seasonNum: number): string {
  return path.resolve(
    PROJECT_ROOT,
    "src",
    "data",
    `season_${seasonNum}`,
    "index.ts",
  );
}

function discoverSeasons(): number[] {
  const dataDir = path.join(PROJECT_ROOT, "src", "data");
  return fs
    .readdirSync(dataDir)
    .filter((d) => d.startsWith("season_"))
    .map((d) => Number(d.replace("season_", "")))
    .filter((n) => !isNaN(n) && fs.existsSync(getSeasonDataPath(n)))
    .sort((a, b) => a - b);
}

function eventKey(e: EventRecord): string {
  return `${e.action}|${e.castaway_id}|ep${e.episode_num}|x${e.multiplier ?? "null"}`;
}

interface SeasonDiff {
  seasonNum: number;
  localOnly: EventRecord[];
  firestoreOnly: EventRecord[];
  localCount: number;
  firestoreCount: number;
}

async function compareEvents(
  seasonNum: number,
  snapshotDir: string,
): Promise<SeasonDiff | null> {
  const seasonKey = `season_${seasonNum}`;

  // Load local events
  const localPath = getSeasonDataPath(seasonNum);
  if (!fs.existsSync(localPath)) return null;

  const mod = await import(
    new URL(`file:///${localPath.replace(/\\/g, "/")}`).href
  );
  const localEvents: Record<string, EventRecord> =
    mod[`SEASON_${seasonNum}_EVENTS`] || {};
  const localList = Object.values(localEvents);

  // Load Firestore snapshot events
  const firestorePath = path.join(snapshotDir, seasonKey, "events.json");
  let firestoreList: EventRecord[] = [];
  if (fs.existsSync(firestorePath)) {
    const raw = JSON.parse(fs.readFileSync(firestorePath, "utf-8"));
    firestoreList = Object.values(raw);
  }

  const localKeys = new Set(localList.map(eventKey));
  const firestoreKeys = new Set(firestoreList.map(eventKey));

  const localOnly = localList.filter((e) => !firestoreKeys.has(eventKey(e)));
  const firestoreOnly = firestoreList.filter(
    (e) => !localKeys.has(eventKey(e)),
  );

  return {
    seasonNum,
    localOnly,
    firestoreOnly,
    localCount: localList.length,
    firestoreCount: firestoreList.length,
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let snapshotDir: string | null = null;
  const positional: number[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--snapshot" && args[i + 1]) {
      snapshotDir = args[++i];
    } else if (!args[i].startsWith("--")) {
      const n = Number(args[i]);
      if (!isNaN(n)) positional.push(n);
    }
  }

  snapshotDir = snapshotDir || getLatestSnapshotDir();
  if (!snapshotDir || !fs.existsSync(snapshotDir)) {
    console.error(
      "No Firestore snapshot found. Run: yarn tsx scripts/snapshot-firestore.ts",
    );
    process.exit(1);
  }
  console.log(`Using snapshot: ${path.relative(PROJECT_ROOT, snapshotDir)}\n`);

  const seasonNums =
    positional.length > 0
      ? positional.sort((a, b) => a - b)
      : discoverSeasons();

  let totalMissing = 0;
  let totalExtra = 0;
  const outOfSync: SeasonDiff[] = [];

  for (const seasonNum of seasonNums) {
    const diff = await compareEvents(seasonNum, snapshotDir);
    if (!diff) continue;

    if (diff.localOnly.length > 0 || diff.firestoreOnly.length > 0) {
      outOfSync.push(diff);
      totalMissing += diff.localOnly.length;
      totalExtra += diff.firestoreOnly.length;

      console.log(
        `Season ${seasonNum}: ${diff.localOnly.length} missing from Firestore, ${diff.firestoreOnly.length} extra in Firestore (local: ${diff.localCount}, Firestore: ${diff.firestoreCount})`,
      );

      for (const e of diff.localOnly) {
        console.log(
          `  MISSING: ${e.action} for ${e.castaway_id} ep${e.episode_num}${e.multiplier != null ? ` (x${e.multiplier})` : ""}`,
        );
      }
      for (const e of diff.firestoreOnly) {
        console.log(
          `  EXTRA:   ${e.action} for ${e.castaway_id} ep${e.episode_num}${e.multiplier != null ? ` (x${e.multiplier})` : ""}`,
        );
      }
    }
  }

  console.log(
    `\n${outOfSync.length === 0 ? "All seasons in sync!" : `${outOfSync.length} season(s) out of sync. ${totalMissing} events missing from Firestore, ${totalExtra} extra.`}`,
  );

  if (outOfSync.length > 0) {
    const seasonList = outOfSync.map((d) => d.seasonNum).join(" ");
    console.log(
      `\nTo fix, run:\n  yarn tsx scripts/push-seasons.ts --collections events ${seasonList}`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Validation failed:", err);
  process.exit(1);
});
