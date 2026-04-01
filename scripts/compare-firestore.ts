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

// Trigger Firebase Admin init (read-only usage)
import "./lib/admin.js";

interface Mismatch {
  category: string;
  field: string;
  scraped: unknown;
  firestore: unknown;
}

async function compare(seasonNum: number): Promise<void> {
  const db = getFirestore();
  const seasonKey = `season_${seasonNum}`;

  // --- Load scraped results ---
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

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Comparing Season ${seasonNum}: scraped vs Firestore`);
  console.log(`Scraped at: ${scraped.scrapedAt}`);
  console.log(`${"=".repeat(60)}\n`);

  // --- Read Firestore (READ ONLY) ---
  console.log("Reading Firestore data (read-only)...\n");

  const [seasonDoc, challengesDoc, eliminationsDoc, eventsDoc] =
    await Promise.all([
      db.collection("seasons").doc(seasonKey).get(),
      db.collection("challenges").doc(seasonKey).get(),
      db.collection("eliminations").doc(seasonKey).get(),
      db.collection("events").doc(seasonKey).get(),
    ]);

  if (!seasonDoc.exists) {
    console.error(`Season ${seasonKey} not found in Firestore.`);
    process.exit(1);
  }

  const fsSeasonData = seasonDoc.data()!;
  const fsChallenges: Record<string, any> = challengesDoc.exists
    ? challengesDoc.data()!
    : {};
  const fsEliminations: Record<string, any> = eliminationsDoc.exists
    ? eliminationsDoc.data()!
    : {};
  const fsEvents: Record<string, any> = eventsDoc.exists
    ? eventsDoc.data()!
    : {};

  const mismatches: Mismatch[] = [];

  // --- Compare Episodes ---
  console.log("--- EPISODES ---");
  const fsEpisodes: any[] = fsSeasonData.episodes || [];
  const scrapedEpisodes = scraped.episodes;

  // Only compare episodes that exist in BOTH (Firestore is truth, scraper may have future episodes)
  const fsEpByOrder = new Map(fsEpisodes.map((e: any) => [e.order, e]));
  const scrapedEpByOrder = new Map(scrapedEpisodes.map((e) => [e.order, e]));

  // Check each Firestore episode has a scraped match
  for (const [order, fsEp] of fsEpByOrder) {
    const scEp = scrapedEpByOrder.get(order);
    if (!scEp) {
      mismatches.push({
        category: `Episode ${order}`,
        field: "existence",
        scraped: "MISSING",
        firestore: fsEp.name,
      });
      console.log(`  Episode ${order}: MISSING from scraped data`);
      continue;
    }

    // Compare episode title
    if (scEp.title !== fsEp.name) {
      mismatches.push({
        category: `Episode ${order}`,
        field: "title",
        scraped: scEp.title,
        firestore: fsEp.name,
      });
      console.log(
        `  Episode ${order} title: scraped="${scEp.title}" vs firestore="${fsEp.name}"`,
      );
    }

    // Compare flags
    if (scEp.isFinale !== fsEp.finale) {
      mismatches.push({
        category: `Episode ${order}`,
        field: "finale",
        scraped: scEp.isFinale,
        firestore: fsEp.finale,
      });
      console.log(
        `  Episode ${order} finale: scraped=${scEp.isFinale} vs firestore=${fsEp.finale}`,
      );
    }

    if (scEp.postMerge !== fsEp.post_merge) {
      mismatches.push({
        category: `Episode ${order}`,
        field: "post_merge",
        scraped: scEp.postMerge,
        firestore: fsEp.post_merge,
      });
      console.log(
        `  Episode ${order} post_merge: scraped=${scEp.postMerge} vs firestore=${fsEp.post_merge}`,
      );
    }

    if (scEp.mergeOccurs !== fsEp.merge_occurs) {
      mismatches.push({
        category: `Episode ${order}`,
        field: "merge_occurs",
        scraped: scEp.mergeOccurs,
        firestore: fsEp.merge_occurs,
      });
      console.log(
        `  Episode ${order} merge_occurs: scraped=${scEp.mergeOccurs} vs firestore=${fsEp.merge_occurs}`,
      );
    }
  }

  // Check for extra scraped episodes not in Firestore
  for (const [order, scEp] of scrapedEpByOrder) {
    if (!fsEpByOrder.has(order)) {
      console.log(
        `  Episode ${order}: in scraped but NOT in Firestore (future episode?) — "${scEp.title}"`,
      );
    }
  }

  const matchedEpCount =
    fsEpByOrder.size -
    mismatches.filter((m) => m.category.startsWith("Episode")).length;
  console.log(
    `  Summary: ${matchedEpCount}/${fsEpByOrder.size} episodes match\n`,
  );

  // --- Compare Challenges ---
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

  // Group by episode for comparison
  const fsChalByEp = new Map<number, any[]>();
  for (const c of fsChallengeList) {
    const ep = c.episode_num;
    if (!fsChalByEp.has(ep)) fsChalByEp.set(ep, []);
    fsChalByEp.get(ep)!.push(c);
  }

  const scChalByEp = new Map<number, any[]>();
  for (const c of scrapedChallenges) {
    const ep = c.episodeNum;
    if (!scChalByEp.has(ep)) scChalByEp.set(ep, []);
    scChalByEp.get(ep)!.push(c);
  }

  const allChalEps = new Set([...fsChalByEp.keys(), ...scChalByEp.keys()]);
  for (const ep of [...allChalEps].sort((a, b) => a - b)) {
    const fsList = fsChalByEp.get(ep) || [];
    const scList = scChalByEp.get(ep) || [];

    if (fsList.length !== scList.length) {
      mismatches.push({
        category: `Challenges Ep${ep}`,
        field: "count",
        scraped: scList.length,
        firestore: fsList.length,
      });
      console.log(
        `  Ep${ep}: count mismatch — scraped=${scList.length}, firestore=${fsList.length}`,
      );
    }

    // Compare each challenge in order
    const maxLen = Math.max(fsList.length, scList.length);
    for (let i = 0; i < maxLen; i++) {
      const fsC = fsList[i];
      const scC = scList[i];
      const label = `Ep${ep} Challenge #${i + 1}`;

      if (!fsC) {
        console.log(`  ${label}: EXTRA in scraped — ${scC.variant}`);
        mismatches.push({
          category: label,
          field: "existence",
          scraped: `${scC.variant} (tribe: ${scC.winnerTribe})`,
          firestore: "MISSING",
        });
        continue;
      }
      if (!scC) {
        console.log(`  ${label}: MISSING from scraped — ${fsC.variant}`);
        mismatches.push({
          category: label,
          field: "existence",
          scraped: "MISSING",
          firestore: `${fsC.variant}`,
        });
        continue;
      }

      // Compare variant
      if (scC.variant !== fsC.variant) {
        mismatches.push({
          category: label,
          field: "variant",
          scraped: scC.variant,
          firestore: fsC.variant,
        });
        console.log(
          `  ${label} variant: scraped="${scC.variant}" vs firestore="${fsC.variant}"`,
        );
      }

      // Compare winners (normalize: sort names for comparison)
      const scWinners = [...(scC.winnerCastawayIds || [])].sort().join(", ");
      const fsWinners = [...(fsC.winning_castaways || [])].sort().join(", ");
      if (scWinners !== fsWinners) {
        mismatches.push({
          category: label,
          field: "winners",
          scraped: scWinners || `(tribe: ${scC.winnerTribe})`,
          firestore: fsWinners || "(none)",
        });
        console.log(
          `  ${label} winners: scraped=[${scWinners || `tribe:${scC.winnerTribe}`}] vs firestore=[${fsWinners}]`,
        );
      }
    }
  }
  console.log();

  // --- Compare Eliminations ---
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

  // Group by episode
  const fsElimByEp = new Map<number, any[]>();
  for (const e of fsElimList) {
    const ep = e.episode_num;
    if (!fsElimByEp.has(ep)) fsElimByEp.set(ep, []);
    fsElimByEp.get(ep)!.push(e);
  }

  const scElimByEp = new Map<number, any[]>();
  for (const e of scrapedElims) {
    const ep = e.episodeNum;
    if (!scElimByEp.has(ep)) scElimByEp.set(ep, []);
    scElimByEp.get(ep)!.push(e);
  }

  const allElimEps = new Set([...fsElimByEp.keys(), ...scElimByEp.keys()]);
  for (const ep of [...allElimEps].sort((a, b) => a - b)) {
    const fsList = fsElimByEp.get(ep) || [];
    const scList = scElimByEp.get(ep) || [];

    if (fsList.length !== scList.length) {
      mismatches.push({
        category: `Eliminations Ep${ep}`,
        field: "count",
        scraped: scList.length,
        firestore: fsList.length,
      });
      console.log(
        `  Ep${ep}: count mismatch — scraped=${scList.length}, firestore=${fsList.length}`,
      );
    }

    // Compare each elimination
    const maxLen = Math.max(fsList.length, scList.length);
    for (let i = 0; i < maxLen; i++) {
      const fsE = fsList[i];
      const scE = scList[i];
      const label = `Ep${ep} Elimination #${i + 1}`;

      if (!fsE) {
        console.log(`  ${label}: EXTRA in scraped — "${scE.castawayId}"`);
        mismatches.push({
          category: label,
          field: "existence",
          scraped: scE.castawayId,
          firestore: "MISSING",
        });
        continue;
      }
      if (!scE) {
        console.log(`  ${label}: MISSING from scraped — "${fsE.castaway_id}"`);
        mismatches.push({
          category: label,
          field: "existence",
          scraped: "MISSING",
          firestore: fsE.castaway_id,
        });
        continue;
      }

      // Compare castaway IDs
      const scId = scE.castawayId;
      const fsId = fsE.castaway_id;
      const nameMatches = scId === fsId;

      if (!nameMatches) {
        mismatches.push({
          category: label,
          field: "player_name",
          scraped: scId,
          firestore: fsId,
        });
        console.log(
          `  ${label} castaway_id: scraped="${scId}" vs firestore="${fsId}"`,
        );
      }

      // Compare variant
      if (scE.variant !== fsE.variant) {
        mismatches.push({
          category: label,
          field: "variant",
          scraped: scE.variant,
          firestore: fsE.variant,
        });
        console.log(
          `  ${label} variant: scraped="${scE.variant}" vs firestore="${fsE.variant}"`,
        );
      }
    }
  }
  console.log();

  // --- Compare Events ---
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

  // Group by action type for easier comparison
  const fsEventsByAction = new Map<string, any[]>();
  for (const e of fsEventList) {
    const key = `ep${e.episode_num}_${e.action}_${e.castaway_id}`;
    if (!fsEventsByAction.has(key)) fsEventsByAction.set(key, []);
    fsEventsByAction.get(key)!.push(e);
  }

  const scEventsByAction = new Map<string, any[]>();
  for (const e of scrapedEvents) {
    const key = `ep${e.episodeNum}_${e.action}_${e.castawayId}`;
    if (!scEventsByAction.has(key)) scEventsByAction.set(key, []);
    scEventsByAction.get(key)!.push(e);
  }

  // Find events in Firestore but not scraped
  for (const [key, fsEvts] of fsEventsByAction) {
    if (!scEventsByAction.has(key)) {
      for (const e of fsEvts) {
        mismatches.push({
          category: "Events",
          field: key,
          scraped: "MISSING",
          firestore: `${e.action} — ${e.castaway_id} (ep${e.episode_num})`,
        });
        console.log(
          `  MISSING from scraped: ${e.action} — ${e.castaway_id} (ep${e.episode_num})`,
        );
      }
    }
  }

  // Find events scraped but not in Firestore
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

  // --- Warnings from scraper ---
  if (scraped.warnings.length > 0) {
    console.log("--- SCRAPER WARNINGS ---");
    for (const w of scraped.warnings) {
      console.log(`  ${w}`);
    }
    console.log();
  }

  // --- Summary ---
  console.log(`${"=".repeat(60)}`);
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
  console.log(`${"=".repeat(60)}\n`);

  // Exit with error code if mismatches found
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
