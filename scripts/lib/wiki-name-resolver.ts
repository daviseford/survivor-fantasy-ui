/**
 * Layered wiki name resolver — maps survivoR full_name to the correct
 * Survivor wiki page title using a 3-layer strategy:
 *   1. Static override map (known mismatches)
 *   2. full_name direct lookup
 *   3. castaway short name + last name construction
 */

import type { ScrapedPlayer } from "./types.js";
import { fetchWikitext } from "./wiki-api.js";

/**
 * Static overrides for players whose survivoR full_name doesn't match
 * the Survivor wiki page title. Maps full_name → wiki page title.
 */
export const WIKI_NAME_OVERRIDES: Record<string, string> = {
  "Alexandra Pohevitz": "Allie Pohevitz",
  "Alexandrea Elliott": "Ali Elliott",
  "Andria Herd": "Dreamz Herd",
  "Anh-Tuan Bui": "Cao Boi Bui",
  "Debra Beebe": "Debbie Beebe",
  "Desiree Williams": "Desi Williams",
  "Edward Fox": "Eddie Fox",
  "James Crittenden": "Chad Crittenden",
  "James Reid": "Rocky Reid",
  "James Tarantino": "Jimmy Tarantino",
  "James Thomas Jr.": "J.T. Thomas",
  "John Calderon": "J.P. Calderon",
  "John Hilsabeck": "JP Hilsabeck",
  "Kenward Bernis": "Boo Bernis",
  "Kimberly Mullen": "Kim Mullen",
  "Lisette Linares": "Lisi Linares",
  "Matthew Lenahan": "Sash Lenahan",
  "Michael Zernow": "Frosti Zernow",
  "Nathan Gonzalez": "Nate Gonzalez",
  "Rebekah Lee": "Becky Lee",
  "Ricard Foye": "Ricard Foyé",
  "Robert Crowley": "Bob Crowley",
  "Robert Zbacnik": "Robb Zbacnik",
  "Roberta Saint-Amour": "RC Saint-Amour",
  "Shannon Waters": "Shambo Waters",
  "Steve Morris": "Chicken Morris",
  "Taylor Lee Stocker": "Taylor Stocker",
  "Tiffany Ervin": "Tiffany Nicole Ervin",
  "Vince Sly": "Vince S.",
  "Virgilio Garcia": "Billy Garcia",
  "Wendy-Jo DeSmidt-Kohlhoff": "Wendy DeSmidt-Kohlhoff",
  "Yung Hwang": "Woo Hwang",
  "Zach Wurthenberger": "Zach Wurtenberger",
};

/** Name suffixes to strip when extracting the last name. */
const NAME_SUFFIXES = new Set(["Jr.", "Sr.", "II", "III", "IV"]);

/**
 * Extract the last name from a full name string.
 * Strips trailing suffixes like "Jr." and "Sr." when there are
 * enough name parts to fall back to a real last name.
 */
export function extractLastName(fullName: string): string {
  const parts = fullName.split(" ");
  let last = parts[parts.length - 1];
  if (NAME_SUFFIXES.has(last) && parts.length > 2) {
    last = parts[parts.length - 2];
  }
  return last;
}

/** Result from resolving a wiki page title. */
export interface WikiResolution {
  title: string;
  wikitext: string;
  layer: "override" | "full_name" | "castaway";
}

/** Signature for the wikitext fetch function (injectable for testing). */
type WikitextFetcher = (pageName: string) => Promise<string | null>;

/**
 * Resolve the correct wiki page title for a player using a 3-layer strategy:
 *   1. Static override map
 *   2. full_name (current behavior)
 *   3. castaway short name + last name
 *
 * Returns the resolved title, fetched wikitext, and which layer matched,
 * or null if all layers fail. Deduplicates fetch attempts so the same
 * title is never fetched twice.
 */
export async function resolveWikiPageTitle(
  player: ScrapedPlayer,
  fetcher: WikitextFetcher = fetchWikitext,
): Promise<WikiResolution | null> {
  const attempted = new Set<string>();

  // Layer 1: Static override map
  const override = WIKI_NAME_OVERRIDES[player.wikiPageTitle];
  if (override) {
    attempted.add(override);
    const wikitext = await fetcher(override);
    if (wikitext) return { title: override, wikitext, layer: "override" };
  }

  // Layer 2: full_name (current behavior)
  attempted.add(player.wikiPageTitle);
  const wikitext = await fetcher(player.wikiPageTitle);
  if (wikitext) {
    return { title: player.wikiPageTitle, wikitext, layer: "full_name" };
  }

  // Layer 3: castaway short name + last name
  const shortName = player.castawayShortName;
  const firstName = player.wikiPageTitle.split(" ")[0];
  if (shortName && shortName !== firstName) {
    const candidateTitle = `${shortName} ${extractLastName(player.wikiPageTitle)}`;
    if (!attempted.has(candidateTitle)) {
      const castWikitext = await fetcher(candidateTitle);
      if (castWikitext) {
        return {
          title: candidateTitle,
          wikitext: castWikitext,
          layer: "castaway",
        };
      }
    }
  }

  return null;
}
