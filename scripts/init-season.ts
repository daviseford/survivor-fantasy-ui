/**
 * Generates a new season data file from scraped JSON.
 * Usage: yarn init-season <season_number>
 *
 * Reads from data/scraped/season_X.json and creates src/data/season_X/index.ts.
 * Run `yarn scrape <season_number>` first to produce the scraped JSON.
 */

import * as fs from "fs";
import * as path from "path";
import { generatePlayerSection } from "./lib/codegen.js";
import type { ScrapeResult } from "./lib/types.js";

const seasonNum = Number(process.argv[2]);

if (!seasonNum || isNaN(seasonNum)) {
  console.error("Usage: yarn init-season <season_number>");
  console.error("Example: yarn init-season 51");
  process.exit(1);
}

const scrapeResultPath = path.resolve(
  import.meta.dirname,
  "..",
  "data",
  "scraped",
  `season_${seasonNum}.json`,
);

if (!fs.existsSync(scrapeResultPath)) {
  console.error(`Scraped data not found: ${scrapeResultPath}`);
  console.error(`Run 'yarn scrape ${seasonNum}' first.`);
  process.exit(1);
}

const outputDir = path.resolve(
  import.meta.dirname,
  "..",
  "src",
  "data",
  `season_${seasonNum}`,
);

const outputPath = path.join(outputDir, "index.ts");

if (fs.existsSync(outputPath)) {
  console.error(`Season data file already exists: ${outputPath}`);
  console.error(
    `Use 'yarn backfill ${seasonNum}' to update an existing file.`,
  );
  process.exit(1);
}

console.log(`\nInitializing Season ${seasonNum}...`);
console.log(`  Source: ${scrapeResultPath}`);
console.log(`  Target: ${outputPath}\n`);

const scrapeData: ScrapeResult = JSON.parse(
  fs.readFileSync(scrapeResultPath, "utf-8"),
);

// Generate the player section from scraped data (no existing players or IMG constant)
const playerSection = generatePlayerSection(
  seasonNum,
  scrapeData.players,
  [],
  null,
);

// Build the complete file
const lines: string[] = [];

// Imports
lines.push(
  `import {\n  Challenge,\n  Elimination,\n  Episode,\n  GameEvent,\n  Player,\n} from "../../types";`,
);
lines.push("");

// Player section (const Players, types, buildPlayer, SEASON_XX_PLAYERS)
lines.push(playerSection);
lines.push("");

// Empty episode/challenge/elimination/event sections
lines.push(
  `export const SEASON_${seasonNum}_EPISODES = [] satisfies Episode<SeasonNumber>[];`,
);
lines.push("");
lines.push(`export const SEASON_${seasonNum}_CHALLENGES = {} satisfies Record<`);
lines.push(`  Challenge["id"],`);
lines.push(`  Challenge<PlayerName, SeasonNumber>`);
lines.push(`>;`);
lines.push("");
lines.push(
  `export const SEASON_${seasonNum}_ELIMINATIONS = {} satisfies Record<`,
);
lines.push(`  Elimination["id"],`);
lines.push(`  Elimination<PlayerName, SeasonNumber>`);
lines.push(`>;`);
lines.push("");
lines.push(`export const SEASON_${seasonNum}_EVENTS = {} satisfies Record<`);
lines.push(`  GameEvent["id"],`);
lines.push(`  GameEvent<PlayerName, SeasonNumber>`);
lines.push(`>;`);
lines.push("");

// Write the file
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, lines.join("\n"));

console.log(`Created: ${outputPath}`);
console.log(`\nNext steps:`);
console.log(`  1. Add player images to public/images/season_${seasonNum}/`);
console.log(`  2. Update image paths in the generated file`);
console.log(`  3. Run 'yarn format' and 'yarn tsc' to verify`);
