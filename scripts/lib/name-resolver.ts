/**
 * Resolves player names between the app's local data and wiki page titles.
 * Uses cast table links as the primary source, with fuzzy fallback.
 */

import { CastTableEntry } from "./wikitext-parser";

export interface NameMatch {
  localName: string;
  wikiPageTitle: string;
  matchStatus: "exact" | "fuzzy" | "unmatched";
}

/**
 * Normalize a name for comparison: lowercase, remove quotes, collapse whitespace,
 * replace underscores with spaces.
 */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/['""\u201C\u201D\u2018\u2019]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract the last name (last space-separated word) */
function lastName(name: string): string {
  const cleaned = name.replace(/_/g, " ").replace(/['""\u201C\u201D\u2018\u2019]/g, "").trim();
  const parts = cleaned.split(/\s+/);
  return parts[parts.length - 1].toLowerCase();
}

/** Extract words that could be first names or nicknames */
function firstNames(name: string): string[] {
  const cleaned = name
    .replace(/_/g, " ")
    .replace(/['""\u201C\u201D\u2018\u2019]/g, "")
    .trim();
  const parts = cleaned.split(/\s+/);
  // Return all parts except the last (which is the last name)
  return parts.slice(0, -1).map((p) => p.toLowerCase());
}

/**
 * Match scraped wiki names to local player names.
 *
 * Strategy:
 * 1. Exact match after normalization
 * 2. Wiki display name matches local name
 * 3. Fuzzy: last name match + any first name/nickname overlap
 */
export function resolveNames(
  localNames: string[],
  castEntries: CastTableEntry[],
): NameMatch[] {
  const results: NameMatch[] = [];
  const matchedLocalNames = new Set<string>();

  for (const entry of castEntries) {
    const wikiNorm = normalize(entry.wikiPageTitle);
    const displayNorm = normalize(entry.displayName);

    // Strategy 1: Exact match after normalization
    let matched = localNames.find(
      (local) => normalize(local) === wikiNorm || normalize(local) === displayNorm,
    );

    // Strategy 2: Last name match + first name overlap
    if (!matched) {
      const wikiLast = lastName(entry.wikiPageTitle);
      const wikiFirsts = new Set([
        ...firstNames(entry.wikiPageTitle),
        ...firstNames(entry.displayName),
      ]);

      matched = localNames.find((local) => {
        if (matchedLocalNames.has(local)) return false;
        if (lastName(local) !== wikiLast) return false;
        const localFirsts = firstNames(local);
        return localFirsts.some((f) => wikiFirsts.has(f));
      });

      if (matched) {
        results.push({
          localName: matched,
          wikiPageTitle: entry.wikiPageTitle,
          matchStatus: "fuzzy",
        });
        matchedLocalNames.add(matched);
        continue;
      }
    }

    if (matched) {
      results.push({
        localName: matched,
        wikiPageTitle: entry.wikiPageTitle,
        matchStatus: "exact",
      });
      matchedLocalNames.add(matched);
    } else {
      results.push({
        localName: "",
        wikiPageTitle: entry.wikiPageTitle,
        matchStatus: "unmatched",
      });
    }
  }

  return results;
}
