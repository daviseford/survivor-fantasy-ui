/**
 * Read-only comparison of scraped results JSON against Firestore data.
 * Usage: npx tsx scripts/compare-firestore.ts <season_number>
 *
 * NEVER writes to Firestore. Read-only operations only.
 */

import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";
import type { ScrapeResultsOutput } from "./lib/types.js";

import "./lib/admin.js";

interface Mismatch {
  category: string;
  field: string;
  scraped: unknown;
  firestore: unknown;
}

const SEPARATOR = "=".repeat(60);

/** Group an array of items into a Map keyed by an extracted value. */
function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const group = map.get(key);
    if (group) {
      group.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

/** Record a mismatch and log it. */
function recordMismatch(
  mismatches: Mismatch[],
  mismatch: Mismatch,
  message: string,
): void {
  mismatches.push(mismatch);
  console.log(`  ${message}`);
}

/** Read a Firestore doc's data, returning an empty object if the doc does not exist. */
function docDataOrEmpty(
  doc: FirebaseFirestore.DocumentSnapshot,
): Record<string, any> {
  return doc.exists ? doc.data()! : {};
}

/** Episode field mappings: [scrapedKey, firestoreKey, displayLabel] */
const EPISODE_FIELDS: [string, string, string][] = [
  ["title", "name", "title"],
  ["isFinale", "finale", "finale"],
  ["postMerge", "post_merge", "post_merge"],
  ["mergeOccurs", "merge_occurs", "merge_occurs"],
];

async function compare(seasonNum: number): Promise<void> {
  const db = getFirestore();
  const seasonKey = `season_${seasonNum}`;

  const scrapedPath = path.resolve(
    import.meta.dirname,
    "..",
    "data",
    "scraped",
    `${seasonKey}_results.json`,
  );

  if (!fs.existsSync(scrapedPath)) {
    console.error(`Scraped results not found: ${scrapedPath}`);
    console.error(
      `This tool requires a *_results.json file for comparison. These files are no longer generated automatically.`,
    );
    console.error(
      `Run 'yarn new-season ${seasonNum} --force' to regenerate season data, then manually export results if needed.`,
    );
    process.exit(1);
  }

  const scraped: ScrapeResultsOutput = JSON.parse(
    fs.readFileSync(scrapedPath, "utf-8"),
  );

  console.log(`\n${SEPARATOR}`);
  console.log(`Comparing Season ${seasonNum}: scraped vs Firestore`);
  console.log(`Scraped at: ${scraped.scrapedAt}`);
  console.log(`${SEPARATOR}\n`);

  console.log("Reading Firestore data (read-only)...\n");

  const [seasonDoc, challengesDoc, eliminationsDoc, eventsDoc, voteHistoryDoc] =
    await Promise.all([
      db.collection("seasons").doc(seasonKey).get(),
      db.collection("challenges").doc(seasonKey).get(),
      db.collection("eliminations").doc(seasonKey).get(),
      db.collection("events").doc(seasonKey).get(),
      db.collection("vote_history").doc(seasonKey).get(),
    ]);

  if (!seasonDoc.exists) {
    console.error(`Season ${seasonKey} not found in Firestore.`);
    process.exit(1);
  }

  const fsSeasonData = seasonDoc.data()!;
  const fsChallenges = docDataOrEmpty(challengesDoc);
  const fsEliminations = docDataOrEmpty(eliminationsDoc);
  const fsEvents = docDataOrEmpty(eventsDoc);
  const fsVoteHistory = docDataOrEmpty(voteHistoryDoc);

  const mismatches: Mismatch[] = [];

  // --- Episodes ---
  console.log("--- EPISODES ---");
  const fsEpisodes: any[] = fsSeasonData.episodes || [];
  const fsEpByOrder = new Map(fsEpisodes.map((e: any) => [e.order, e]));
  const scrapedEpByOrder = new Map(scraped.episodes.map((e) => [e.order, e]));

  for (const [order, fsEp] of fsEpByOrder) {
    const scEp = scrapedEpByOrder.get(order);
    if (!scEp) {
      recordMismatch(
        mismatches,
        {
          category: `Episode ${order}`,
          field: "existence",
          scraped: "MISSING",
          firestore: fsEp.name,
        },
        `Episode ${order}: MISSING from scraped data`,
      );
      continue;
    }

    for (const [scKey, fsKey, label] of EPISODE_FIELDS) {
      const scVal = scEp[scKey as keyof typeof scEp];
      const fsVal = fsEp[fsKey];
      if (scVal !== fsVal) {
        recordMismatch(
          mismatches,
          {
            category: `Episode ${order}`,
            field: label,
            scraped: scVal,
            firestore: fsVal,
          },
          `Episode ${order} ${label}: scraped="${scVal}" vs firestore="${fsVal}"`,
        );
      }
    }
  }

  for (const [order, scEp] of scrapedEpByOrder) {
    if (!fsEpByOrder.has(order)) {
      console.log(
        `  Episode ${order}: in scraped but NOT in Firestore (future episode?) — "${scEp.title}"`,
      );
    }
  }

  const episodeMismatchCount = mismatches.filter((m) =>
    m.category.startsWith("Episode"),
  ).length;
  console.log(
    `  Summary: ${fsEpByOrder.size - episodeMismatchCount}/${fsEpByOrder.size} episodes match\n`,
  );

  // --- Challenges ---
  console.log("--- CHALLENGES ---");
  const fsChallengeList = Object.values(fsChallenges).sort(
    (a: any, b: any) => a.episode_num - b.episode_num || a.order - b.order,
  );
  const scrapedChallenges = [...scraped.challenges].sort(
    (a, b) => a.episodeNum - b.episodeNum || a.order - b.order,
  );

  console.log(
    `  Firestore: ${fsChallengeList.length} challenges, Scraped: ${scrapedChallenges.length} challenges`,
  );

  const fsChalByEp = groupBy(fsChallengeList, (c: any) => c.episode_num);
  const scChalByEp = groupBy(scrapedChallenges, (c) => c.episodeNum);

  const allChalEps = new Set([...fsChalByEp.keys(), ...scChalByEp.keys()]);
  for (const ep of [...allChalEps].sort((a, b) => a - b)) {
    const fsList = fsChalByEp.get(ep) || [];
    const scList = scChalByEp.get(ep) || [];

    if (fsList.length !== scList.length) {
      recordMismatch(
        mismatches,
        {
          category: `Challenges Ep${ep}`,
          field: "count",
          scraped: scList.length,
          firestore: fsList.length,
        },
        `Ep${ep}: count mismatch — scraped=${scList.length}, firestore=${fsList.length}`,
      );
    }

    const maxLen = Math.max(fsList.length, scList.length);
    for (let i = 0; i < maxLen; i++) {
      const fsC = fsList[i] as any;
      const scC = scList[i] as any;
      const label = `Ep${ep} Challenge #${i + 1}`;

      if (!fsC) {
        recordMismatch(
          mismatches,
          {
            category: label,
            field: "existence",
            scraped: `${scC.variant} (tribe: ${scC.winnerTribe})`,
            firestore: "MISSING",
          },
          `${label}: EXTRA in scraped — ${scC.variant}`,
        );
        continue;
      }
      if (!scC) {
        recordMismatch(
          mismatches,
          {
            category: label,
            field: "existence",
            scraped: "MISSING",
            firestore: `${fsC.variant}`,
          },
          `${label}: MISSING from scraped — ${fsC.variant}`,
        );
        continue;
      }

      if (scC.variant !== fsC.variant) {
        recordMismatch(
          mismatches,
          {
            category: label,
            field: "variant",
            scraped: scC.variant,
            firestore: fsC.variant,
          },
          `${label} variant: scraped="${scC.variant}" vs firestore="${fsC.variant}"`,
        );
      }

      const scWinners = [...(scC.winnerCastawayIds || [])].sort().join(", ");
      const fsWinners = [...(fsC.winning_castaways || [])].sort().join(", ");
      if (scWinners !== fsWinners) {
        recordMismatch(
          mismatches,
          {
            category: label,
            field: "winners",
            scraped: scWinners || `(tribe: ${scC.winnerTribe})`,
            firestore: fsWinners || "(none)",
          },
          `${label} winners: scraped=[${scWinners || `tribe:${scC.winnerTribe}`}] vs firestore=[${fsWinners}]`,
        );
      }
    }
  }
  console.log();

  // --- Eliminations ---
  console.log("--- ELIMINATIONS ---");
  const fsElimList = Object.values(fsEliminations).sort(
    (a: any, b: any) => a.episode_num - b.episode_num || a.order - b.order,
  );
  const scrapedElims = [...scraped.eliminations].sort(
    (a, b) => a.episodeNum - b.episodeNum || a.order - b.order,
  );

  console.log(
    `  Firestore: ${fsElimList.length} eliminations, Scraped: ${scrapedElims.length} eliminations`,
  );

  const fsElimByEp = groupBy(fsElimList, (e: any) => e.episode_num);
  const scElimByEp = groupBy(scrapedElims, (e) => e.episodeNum);

  const allElimEps = new Set([...fsElimByEp.keys(), ...scElimByEp.keys()]);
  for (const ep of [...allElimEps].sort((a, b) => a - b)) {
    const fsList = fsElimByEp.get(ep) || [];
    const scList = scElimByEp.get(ep) || [];

    if (fsList.length !== scList.length) {
      recordMismatch(
        mismatches,
        {
          category: `Eliminations Ep${ep}`,
          field: "count",
          scraped: scList.length,
          firestore: fsList.length,
        },
        `Ep${ep}: count mismatch — scraped=${scList.length}, firestore=${fsList.length}`,
      );
    }

    const maxLen = Math.max(fsList.length, scList.length);
    for (let i = 0; i < maxLen; i++) {
      const fsE = fsList[i] as any;
      const scE = scList[i] as any;
      const label = `Ep${ep} Elimination #${i + 1}`;

      if (!fsE) {
        recordMismatch(
          mismatches,
          {
            category: label,
            field: "existence",
            scraped: scE.castawayId,
            firestore: "MISSING",
          },
          `${label}: EXTRA in scraped — "${scE.castawayId}"`,
        );
        continue;
      }
      if (!scE) {
        recordMismatch(
          mismatches,
          {
            category: label,
            field: "existence",
            scraped: "MISSING",
            firestore: fsE.castaway_id,
          },
          `${label}: MISSING from scraped — "${fsE.castaway_id}"`,
        );
        continue;
      }

      if (scE.castawayId !== fsE.castaway_id) {
        recordMismatch(
          mismatches,
          {
            category: label,
            field: "player_name",
            scraped: scE.castawayId,
            firestore: fsE.castaway_id,
          },
          `${label} castaway_id: scraped="${scE.castawayId}" vs firestore="${fsE.castaway_id}"`,
        );
      }

      if (scE.variant !== fsE.variant) {
        recordMismatch(
          mismatches,
          {
            category: label,
            field: "variant",
            scraped: scE.variant,
            firestore: fsE.variant,
          },
          `${label} variant: scraped="${scE.variant}" vs firestore="${fsE.variant}"`,
        );
      }
    }
  }
  console.log();

  // --- Events ---
  console.log("--- EVENTS ---");
  const fsEventList = Object.values(fsEvents).sort(
    (a: any, b: any) => a.episode_num - b.episode_num,
  );
  const scrapedEvents = [...scraped.events].sort(
    (a, b) => a.episodeNum - b.episodeNum,
  );

  console.log(
    `  Firestore: ${fsEventList.length} events, Scraped: ${scrapedEvents.length} events`,
  );

  const fsEventsByAction = groupBy(
    fsEventList as any[],
    (e: any) => `ep${e.episode_num}_${e.action}_${e.castaway_id}`,
  );
  const scEventsByAction = groupBy(
    scrapedEvents,
    (e) => `ep${e.episodeNum}_${e.action}_${e.castawayId}`,
  );

  for (const [key, fsEvts] of fsEventsByAction) {
    if (!scEventsByAction.has(key)) {
      for (const e of fsEvts) {
        recordMismatch(
          mismatches,
          {
            category: "Events",
            field: key,
            scraped: "MISSING",
            firestore: `${e.action} — ${e.castaway_id} (ep${e.episode_num})`,
          },
          `MISSING from scraped: ${e.action} — ${e.castaway_id} (ep${e.episode_num})`,
        );
      }
    }
  }

  for (const [key, scEvts] of scEventsByAction) {
    if (!fsEventsByAction.has(key)) {
      for (const e of scEvts) {
        console.log(
          `  EXTRA in scraped: ${e.action} — ${e.castawayId} (ep${e.episodeNum})`,
        );
      }
    }
  }
  console.log();

  // --- Vote History ---
  console.log("--- VOTE HISTORY ---");
  const fsVoteHistoryList = Object.values(fsVoteHistory).sort(
    (a: any, b: any) =>
      a.episode_num - b.episode_num ||
      a.sog_id - b.sog_id ||
      a.vote_order - b.vote_order,
  );
  const scrapedVotes = [...(scraped.voteHistory || [])].sort(
    (a, b) =>
      a.episodeNum - b.episodeNum ||
      a.sogId - b.sogId ||
      a.voteOrder - b.voteOrder,
  );

  console.log(
    `  Firestore: ${fsVoteHistoryList.length} votes, Scraped: ${scrapedVotes.length} votes`,
  );

  const fsVotesByKey = groupBy(
    fsVoteHistoryList as any[],
    (v: any) =>
      `sog${v.sog_id}_vo${v.vote_order}_${v.voter_castaway_id}_${v.target_castaway_id}`,
  );
  const scVotesByKey = groupBy(
    scrapedVotes,
    (v) =>
      `sog${v.sogId}_vo${v.voteOrder}_${v.voterCastawayId}_${v.targetCastawayId}`,
  );

  for (const [key, fsVotes] of fsVotesByKey) {
    if (!scVotesByKey.has(key)) {
      for (const v of fsVotes) {
        recordMismatch(
          mismatches,
          {
            category: "VoteHistory",
            field: key,
            scraped: "MISSING",
            firestore: `${(v as any).voter_castaway_id} → ${(v as any).target_castaway_id} (ep${(v as any).episode_num})`,
          },
          `MISSING from scraped: ${(v as any).voter_castaway_id} → ${(v as any).target_castaway_id} (ep${(v as any).episode_num})`,
        );
      }
    }
  }

  for (const [key, scVotes] of scVotesByKey) {
    if (!fsVotesByKey.has(key)) {
      for (const v of scVotes) {
        console.log(
          `  EXTRA in scraped: ${v.voterCastawayId} → ${v.targetCastawayId} (ep${v.episodeNum})`,
        );
      }
    }
  }
  console.log();

  if (scraped.warnings.length > 0) {
    console.log("--- SCRAPER WARNINGS ---");
    for (const w of scraped.warnings) {
      console.log(`  ${w}`);
    }
    console.log();
  }

  // --- Summary ---
  console.log(SEPARATOR);
  console.log(`SUMMARY: Season ${seasonNum}`);
  console.log(`  Total mismatches: ${mismatches.length}`);
  if (mismatches.length === 0) {
    console.log(`  PASS — scraped data matches Firestore`);
  } else {
    console.log(`  FAIL — mismatches found:`);
    const byCat = new Map<string, number>();
    for (const m of mismatches) {
      const cat = m.category.split(" ")[0];
      byCat.set(cat, (byCat.get(cat) || 0) + 1);
    }
    for (const [cat, count] of byCat) {
      console.log(`    ${cat}: ${count} mismatches`);
    }
  }
  console.log(`${SEPARATOR}\n`);

  process.exit(mismatches.length > 0 ? 1 : 0);
}

// --- CLI ---
const seasonNum = Number(process.argv[2]);
if (!seasonNum || isNaN(seasonNum)) {
  console.error("Usage: npx tsx scripts/compare-firestore.ts <season_number>");
  process.exit(1);
}

compare(seasonNum).catch((err) => {
  console.error("Comparison failed:", err);
  process.exit(1);
});
