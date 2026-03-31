import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { ContestantSource, ScrapedContestant } from "../types.js";

const BASE_URL = "https://survivor.fandom.com";
const DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse a wiki-style age string. Handles formats like "25", "25 (at time of filming)", etc.
 */
function parseAge(text: string): number | undefined {
  const match = text.match(/(\d{1,3})/);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Parse previous seasons from a cell that may contain links like "Survivor 12", "S12", etc.
 */
function parsePreviousSeasons(
  text: string,
  currentSeason: number,
): number[] | undefined {
  const seasons: number[] = [];
  // Match patterns like "Survivor 12", "S12", standalone numbers in context
  const matches = text.matchAll(/(?:Survivor|S)\s*(\d{1,2})/gi);
  for (const m of matches) {
    const num = parseInt(m[1], 10);
    if (num !== currentSeason && num >= 1 && num <= 50) {
      seasons.push(num);
    }
  }
  return seasons.length > 0 ? seasons.sort((a, b) => a - b) : undefined;
}

/**
 * Extract the first meaningful paragraph from a player's wiki page as a bio.
 */
function extractBio($: cheerio.CheerioAPI): string | undefined {
  // The first <p> in .mw-parser-output that has substantial text
  const paragraphs = $(".mw-parser-output > p");
  for (let i = 0; i < paragraphs.length; i++) {
    const text = $(paragraphs[i]).text().trim();
    // Skip empty paragraphs or very short ones
    if (text.length > 50) {
      // Take just the first two sentences
      const sentences = text.match(/[^.!?]+[.!?]+/g);
      if (sentences && sentences.length > 0) {
        return sentences.slice(0, 2).join("").trim();
      }
      return text.slice(0, 200).trim();
    }
  }
  return undefined;
}

/**
 * Scrape an individual player's wiki page for detailed info.
 */
async function scrapePlayerPage(
  url: string,
  seasonNum: number,
): Promise<Partial<ScrapedContestant>> {
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  [warn] Failed to fetch ${url}: ${res.status}`);
    return {};
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  const result: Partial<ScrapedContestant> = {};

  // Helper to find a value by label text in the infobox
  const getInfoboxValue = (label: string): string | undefined => {
    let value: string | undefined;
    $(".pi-item").each((_, el) => {
      const labelEl = $(el).find(".pi-data-label, .pi-header");
      if (labelEl.text().trim().toLowerCase().includes(label.toLowerCase())) {
        const valueEl = $(el).find(".pi-data-value, .pi-font");
        if (valueEl.length) {
          value = valueEl.text().trim();
        }
      }
    });
    return value;
  };

  // Age - look in infobox
  const ageText = getInfoboxValue("age") ?? getInfoboxValue("Age at time");
  if (ageText) {
    result.ageOnSeason = parseAge(ageText);
  }

  // Hometown/Residence
  const hometown =
    getInfoboxValue("hometown") ??
    getInfoboxValue("residence") ??
    getInfoboxValue("current residence");
  if (hometown) {
    result.hometown = hometown.replace(/\n/g, ", ").trim();
  }

  // Profession/Occupation
  const profession =
    getInfoboxValue("occupation") ?? getInfoboxValue("profession");
  if (profession) {
    result.profession = profession.replace(/\n/g, ", ").trim();
  }

  // Previous seasons
  const seasonsText = getInfoboxValue("season");
  if (seasonsText) {
    result.previousSeasons = parsePreviousSeasons(seasonsText, seasonNum);
  }

  // Bio
  result.bio = extractBio($);

  return result;
}

/**
 * Fandom wiki scraper: scrapes the Survivor Wiki (survivor.fandom.com).
 */
export const fandomSource: ContestantSource = {
  name: "Survivor Wiki (Fandom)",

  async scrapeseason(seasonNum: number): Promise<ScrapedContestant[]> {
    const seasonUrl = `${BASE_URL}/wiki/Survivor_${seasonNum}`;
    console.log(`Fetching season page: ${seasonUrl}`);

    const res = await fetch(seasonUrl);
    if (!res.ok) {
      throw new Error(
        `Failed to fetch season page: ${res.status} ${res.statusText}`,
      );
    }
    const html = await res.text();
    const $ = cheerio.load(html);

    // Find the cast/contestants table. Usually a wikitable with player names and links.
    // Strategy: look for tables with headers like "Contestant", "Castaway", "Name"
    const contestants: ScrapedContestant[] = [];
    const seenNames = new Set<string>();

    const tables = $("table.wikitable");
    let castTable: cheerio.Cheerio<AnyNode> | null = null;

    tables.each((_, table) => {
      const headers = $(table)
        .find("th")
        .map((_, th) => $(th).text().trim().toLowerCase())
        .get();
      if (
        headers.some(
          (h) =>
            h.includes("castaway") ||
            h.includes("contestant") ||
            h.includes("name"),
        )
      ) {
        castTable = $(table);
        return false; // break
      }
    });

    if (!castTable) {
      // Fallback: try the first large wikitable
      console.warn(
        "  [warn] Could not find cast table by header. Trying first large wikitable.",
      );
      tables.each((_, table) => {
        const rows = $(table).find("tr");
        if (rows.length > 10) {
          castTable = $(table);
          return false;
        }
      });
    }

    if (!castTable) {
      console.warn(
        "  [warn] No cast table found on season page. Returning empty.",
      );
      return [];
    }

    // Determine which column index has the contestant name/link
    const headerRow = $(castTable!).find("tr").first();
    const headers = headerRow
      .find("th")
      .map((_, th) => $(th).text().trim().toLowerCase())
      .get();

    let nameColIdx = headers.findIndex(
      (h) =>
        h.includes("castaway") ||
        h.includes("contestant") ||
        h.includes("name"),
    );
    if (nameColIdx === -1) nameColIdx = 0;

    // Parse each row
    const rows = $(castTable!).find("tr").slice(1); // skip header
    rows.each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length <= nameColIdx) return;

      const nameCell = $(cells[nameColIdx]);
      const link = nameCell.find("a").first();
      const name = (link.text().trim() || nameCell.text().trim()).replace(
        /\s+/g,
        " ",
      );

      if (!name || seenNames.has(name)) return;
      seenNames.add(name);

      const href = link.attr("href");
      const playerUrl = href
        ? href.startsWith("http")
          ? href
          : `${BASE_URL}${href}`
        : "";

      contestants.push({
        scrapedName: name,
        sourceUrl: playerUrl,
      });
    });

    console.log(`  Found ${contestants.length} contestants in cast table.`);

    // Now scrape each player's individual page for details
    for (let i = 0; i < contestants.length; i++) {
      const contestant = contestants[i];
      if (!contestant.sourceUrl) continue;

      console.log(
        `  [${i + 1}/${contestants.length}] Scraping ${contestant.scrapedName}...`,
      );

      try {
        const details = await scrapePlayerPage(contestant.sourceUrl, seasonNum);
        Object.assign(contestant, details);
      } catch (err) {
        console.warn(
          `  [warn] Error scraping ${contestant.scrapedName}: ${err}`,
        );
      }

      // Be polite - delay between requests
      if (i < contestants.length - 1) {
        await sleep(DELAY_MS);
      }
    }

    return contestants;
  },
};
