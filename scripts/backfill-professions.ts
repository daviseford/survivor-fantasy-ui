/**
 * Backfill profession data into existing season files.
 *
 * Fetches each player's occupation from the Survivor Wiki and patches
 * the corresponding season data file to add profession fields.
 *
 * Usage:
 *   yarn tsx scripts/backfill-professions.ts              # all seasons
 *   yarn tsx scripts/backfill-professions.ts 46 47 48     # specific seasons
 *   yarn tsx scripts/backfill-professions.ts --dry-run    # preview without writing
 */

import * as fs from "fs";
import * as path from "path";
import { delay, fetchWikitext } from "./lib/wiki-api.js";
import { parseContestantPage } from "./lib/wikitext-parser.js";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const TOTAL_SEASONS = 50;

function getSeasonFilePath(seasonNum: number): string {
  return path.join(
    PROJECT_ROOT,
    "src",
    "data",
    `season_${seasonNum}`,
    "index.ts",
  );
}

function escapeString(s: string): string {
  if (!s.includes('"')) return `"${s}"`;
  if (!s.includes("'")) return `'${s}'`;
  return `'${s.replace(/'/g, "\\'")}'`;
}

interface PlayerMatch {
  fullName: string;
  startIdx: number;
  endIdx: number;
  block: string;
}

/**
 * Extract individual buildPlayer blocks from a season file.
 */
function extractPlayerBlocks(content: string): PlayerMatch[] {
  const players: PlayerMatch[] = [];
  const regex = /buildPlayer\(\{/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const start = match.index;
    // Find the matching closing })
    let depth = 0;
    let i = content.indexOf("{", start);
    for (; i < content.length; i++) {
      if (content[i] === "{") depth++;
      else if (content[i] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    // Include the closing paren: })
    const end = i + 2; // past }
    const block = content.slice(start, end);

    // Extract full_name
    const nameMatch = block.match(/full_name:\s*(?:"([^"]+)"|'([^']+)')/);
    const fullName = nameMatch ? nameMatch[1] || nameMatch[2] : "";

    if (fullName) {
      players.push({ fullName, startIdx: start, endIdx: end, block });
    }
  }

  return players;
}

/**
 * Add profession field to a buildPlayer block (after age line, before hometown line).
 * Also updates description to include occupation.
 */
function addProfessionToBlock(block: string, profession: string): string {
  // Skip if profession already present
  if (/\bprofession:/.test(block)) return block;

  let updated = block;

  // Insert profession after age line
  const ageLineMatch = updated.match(/(    age: \d+,\n)/);
  if (ageLineMatch) {
    const insertAfter = ageLineMatch.index! + ageLineMatch[0].length;
    updated =
      updated.slice(0, insertAfter) +
      `    profession: ${escapeString(profession)},\n` +
      updated.slice(insertAfter);
  } else {
    // No age line — insert before hometown line
    const hometownMatch = updated.match(/(    hometown: )/);
    if (hometownMatch) {
      updated =
        updated.slice(0, hometownMatch.index!) +
        `    profession: ${escapeString(profession)},\n` +
        updated.slice(hometownMatch.index!);
    }
  }

  // Update description to include Occupation
  const descMatch = updated.match(/description: (["'])(.+?)\1/);
  if (descMatch && !descMatch[2].includes("Occupation:")) {
    const oldDesc = descMatch[2];
    const newDesc = oldDesc
      ? `${oldDesc} | Occupation: ${profession}`
      : `Occupation: ${profession}`;
    updated = updated.replace(
      descMatch[0],
      `description: ${escapeString(newDesc)}`,
    );
  }

  return updated;
}

async function processSeason(
  seasonNum: number,
  dryRun: boolean,
): Promise<{ total: number; updated: number; skipped: number }> {
  const filePath = getSeasonFilePath(seasonNum);
  if (!fs.existsSync(filePath)) {
    console.log(`  Season ${seasonNum}: file not found — skipping`);
    return { total: 0, updated: 0, skipped: 0 };
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const players = extractPlayerBlocks(content);

  let updated = 0;
  let skipped = 0;
  const replacements: { oldBlock: string; newBlock: string }[] = [];

  for (let i = 0; i < players.length; i++) {
    const player = players[i];

    // Skip if already has profession
    if (/\bprofession:/.test(player.block)) {
      skipped++;
      continue;
    }

    console.log(`    [${i + 1}/${players.length}] ${player.fullName}`);

    const wikitext = await fetchWikitext(player.fullName);
    if (!wikitext) {
      console.log(`      ⚠ Wiki page not found`);
      if (i < players.length - 1) await delay(150);
      continue;
    }

    const info = parseContestantPage(wikitext, seasonNum);
    if (!info?.occupation) {
      console.log(`      ⚠ No occupation found`);
      if (i < players.length - 1) await delay(150);
      continue;
    }

    console.log(`      → ${info.occupation}`);
    replacements.push({
      oldBlock: player.block,
      newBlock: addProfessionToBlock(player.block, info.occupation),
    });
    updated++;

    if (i < players.length - 1) await delay(150);
  }

  if (replacements.length > 0 && !dryRun) {
    let newContent = content;
    for (const { oldBlock, newBlock } of replacements) {
      newContent = newContent.replace(oldBlock, newBlock);
    }
    fs.writeFileSync(filePath, newContent);
  }

  return { total: players.length, updated, skipped };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith("--")));
  const positional = args
    .filter((a) => !a.startsWith("--"))
    .map(Number)
    .filter((n) => !isNaN(n) && n >= 1 && n <= TOTAL_SEASONS);

  const dryRun = flags.has("--dry-run");
  const seasonNums =
    positional.length > 0
      ? positional
      : Array.from({ length: TOTAL_SEASONS }, (_, i) => i + 1);

  console.log(
    `Backfilling professions for ${seasonNums.length} season(s)${dryRun ? " [DRY RUN]" : ""}`,
  );

  let totalPlayers = 0;
  let totalUpdated = 0;

  for (const seasonNum of seasonNums) {
    console.log(`\n  Season ${seasonNum}:`);
    const result = await processSeason(seasonNum, dryRun);
    totalPlayers += result.total;
    totalUpdated += result.updated;
  }

  console.log(`\nDone! Updated ${totalUpdated}/${totalPlayers} players.`);
  if (dryRun) {
    console.log("(Dry run — no files were modified)");
  } else {
    console.log("Run 'yarn format' and 'yarn tsc' to verify.");
  }
}

main().catch((err) => {
  console.error("\nBackfill failed:", err);
  process.exit(1);
});
