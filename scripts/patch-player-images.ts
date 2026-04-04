/**
 * Patch empty img fields in season data files by matching player names
 * to existing image files on disk.
 *
 * Usage: yarn tsx scripts/patch-player-images.ts [season_numbers...]
 *   No args = patch all seasons with missing images
 */

import * as fs from "fs";
import * as path from "path";

const projectRoot = path.resolve(import.meta.dirname, "..");

function patchSeason(seasonNum: number): number {
  const seasonKey = `season_${seasonNum}`;
  const dataPath = path.join(projectRoot, "src", "data", seasonKey, "index.ts");
  const imgDir = path.join(projectRoot, "public", "images", seasonKey);

  if (!fs.existsSync(dataPath) || !fs.existsSync(imgDir)) return 0;

  // Build a map of normalized name -> image path
  const imageFiles = fs
    .readdirSync(imgDir)
    .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));

  const nameToImage = new Map<string, string>();
  for (const file of imageFiles) {
    // Skip logos
    if (file.includes("logo")) continue;
    // "Nicole-Mazullo.jpg" -> "nicole mazullo"
    const normalized = file
      .replace(/\.(jpg|jpeg|png|webp)$/i, "")
      .replace(/-/g, " ")
      .toLowerCase();
    nameToImage.set(normalized, `/images/${seasonKey}/${file}`);
  }

  let content = fs.readFileSync(dataPath, "utf-8");
  let patched = 0;

  // Match: full_name: "Some Name",\n    img: "",
  const regex = /full_name:\s*"([^"]+)",\s*\n(\s*)img:\s*"",/g;

  content = content.replace(
    regex,
    (match, fullName: string, indent: string) => {
      const normalized = fullName.toLowerCase();
      const imagePath = nameToImage.get(normalized);
      if (imagePath) {
        patched++;
        return `full_name: "${fullName}",\n${indent}img: "${imagePath}",`;
      }
      return match;
    },
  );

  if (patched > 0) {
    fs.writeFileSync(dataPath, content);
  }
  return patched;
}

// Parse args
const args = process.argv.slice(2).map(Number).filter(Boolean);
const seasons =
  args.length > 0 ? args : Array.from({ length: 50 }, (_, i) => i + 1);

let totalPatched = 0;
for (const s of seasons) {
  const count = patchSeason(s);
  if (count > 0) {
    console.log(`Season ${s}: patched ${count} player image(s)`);
    totalPatched += count;
  }
}
console.log(`\nDone. Patched ${totalPatched} total image references.`);
