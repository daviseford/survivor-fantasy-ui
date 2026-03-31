import * as fs from "fs";
import * as path from "path";
import { generateSeasonFile } from "./lib/codegen.js";

const seasonNum = Number(process.argv[2]);

if (!seasonNum || isNaN(seasonNum)) {
  console.error("Usage: yarn backfill <season_number>");
  console.error("Example: yarn backfill 46");
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

const existingFilePath = path.resolve(
  import.meta.dirname,
  "..",
  "src",
  "data",
  `season_${seasonNum}`,
  "index.ts",
);

if (!fs.existsSync(existingFilePath)) {
  console.error(`Season data file not found: ${existingFilePath}`);
  process.exit(1);
}

console.log(`\nBackfilling Season ${seasonNum}...`);
console.log(`  Source: ${scrapeResultPath}`);
console.log(`  Target: ${existingFilePath}\n`);

try {
  const newContent = generateSeasonFile(
    seasonNum,
    scrapeResultPath,
    existingFilePath,
  );
  fs.writeFileSync(existingFilePath, newContent);
  console.log(`Updated: ${existingFilePath}`);
  console.log(`\nRun 'yarn format' and 'yarn tsc' to verify.`);
} catch (err) {
  console.error("Backfill failed:", err);
  process.exit(1);
}
