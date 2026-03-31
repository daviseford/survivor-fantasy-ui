import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { MatchResult, PlayerMetaEntry } from "./types.js";

/**
 * Serialize a PlayerMetaEntry to a TypeScript object literal string.
 */
function serializeEntry(meta: PlayerMetaEntry, indent: string): string {
  const lines: string[] = [];
  lines.push(`${indent}{`);
  if (meta.ageOnSeason !== undefined)
    lines.push(`${indent}  ageOnSeason: ${meta.ageOnSeason},`);
  if (meta.hometown)
    lines.push(`${indent}  hometown: ${JSON.stringify(meta.hometown)},`);
  if (meta.profession)
    lines.push(`${indent}  profession: ${JSON.stringify(meta.profession)},`);
  if (meta.bio) lines.push(`${indent}  bio: ${JSON.stringify(meta.bio)},`);
  if (meta.previousSeasons?.length)
    lines.push(
      `${indent}  previousSeasons: [${meta.previousSeasons.join(", ")}],`,
    );
  if (meta.sourceUrl)
    lines.push(`${indent}  sourceUrl: ${JSON.stringify(meta.sourceUrl)},`);
  lines.push(`${indent}}`);
  return lines.join("\n");
}

/**
 * Generate the content for a playerMeta.ts file.
 */
export function generatePlayerMetaSource(
  seasonNum: number,
  matches: MatchResult[],
): string {
  const constName = `SEASON_${seasonNum}_PLAYER_META`;

  const lines: string[] = [];
  lines.push(`import type { PlayerMeta } from "../../types";`);
  lines.push(``);
  lines.push(`export const ${constName}: Record<string, PlayerMeta> = {`);

  for (const match of matches) {
    lines.push(
      `  ${JSON.stringify(match.appName)}: ${serializeEntry(match.meta, "  ")},`,
    );
  }

  lines.push(`};`);
  lines.push(``);

  return lines.join("\n");
}

/**
 * Write a playerMeta.ts file for a season.
 */
export function writePlayerMeta(
  seasonNum: number,
  matches: MatchResult[],
  projectRoot: string,
): string {
  const content = generatePlayerMetaSource(seasonNum, matches);
  const filePath = resolve(
    projectRoot,
    `src/data/season_${seasonNum}/playerMeta.ts`,
  );
  writeFileSync(filePath, content, "utf-8");
  return filePath;
}
