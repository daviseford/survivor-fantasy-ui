/**
 * Parses Survivor Wiki wikitext to extract contestant data from
 * {{Contestant}} infobox templates.
 */

export interface ContestantInfo {
  age?: number;
  hometown?: string;
  occupation?: string;
  previousSeasons?: number[];
  /** All season numbers this player appeared in (including the target season) */
  allSeasons?: number[];
  /** Wiki image filename (e.g., "S46 Ben Katzman.jpg") — needs URL resolution via API */
  imageFileName?: string;
  /** Nickname extracted from the bold intro paragraph (e.g., "Coach", "Q", "Boston Rob") */
  nickname?: string;
}

// --- Sub-template parsers ---

/** Parse {{Birth date and age|YYYY|M|D|mf=yes}} → { year, month, day, age } */
export function parseBirthDate(value: string): {
  year: number;
  month: number;
  day: number;
  age: number;
} | null {
  const match = value.match(
    /\{\{Birth date and age\|(\d{4})\|(\d{1,2})\|(\d{1,2})/i,
  );
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const now = new Date();
  let age = now.getFullYear() - year;
  if (
    now.getMonth() + 1 < month ||
    (now.getMonth() + 1 === month && now.getDate() < day)
  ) {
    age--;
  }

  return { year, month, day, age };
}

/** Parse {{S2|N}} → season number */
export function parseSeasonNumber(value: string): number | null {
  const match = value.match(/\{\{S2?\|(\d+)\}\}/);
  return match ? Number(match[1]) : null;
}

/**
 * Extract a contestant's nickname from the bold intro paragraph of their wiki page.
 *
 * Priority:
 * 1. "also known as '''Nickname'''" pattern (e.g., "Boston Rob")
 * 2. Quoted text within the first '''...''' bold block (e.g., "Q", "Coach", "Ozzy")
 * 3. null if no nickname found
 */
export function parseNickname(wikitext: string): string | null {
  // Priority 1: Check for "(also known as '''Nickname''')" pattern
  const akaMatch = wikitext.match(/\(also known as\s+'''([^']+)'''\)/i);
  if (akaMatch) {
    return akaMatch[1].trim();
  }

  // Priority 2: Find first '''...''' bold block and extract quoted text within it
  const boldMatch = wikitext.match(/'''([^']+)'''/);
  if (boldMatch) {
    const boldContent = boldMatch[1];
    // Match straight quotes or smart quotes (curly)
    const quoteMatch = boldContent.match(/[""\u201C]([^""\u201D]+)[""\u201D]/);
    if (quoteMatch) {
      return quoteMatch[1].trim();
    }
  }

  return null;
}

// --- Infobox parser ---

/**
 * Extract key-value pairs from a {{Contestant ...}} infobox block.
 * The template is a flat pipe-delimited structure:
 *   | key = value
 *   | key2 = value2
 */
export function parseInfoboxFields(
  wikitext: string,
): Record<string, string> | null {
  // Find the {{Contestant block using bracket-depth counting to handle nested templates
  const startMatch = wikitext.match(/\{\{Contestant\s*\n/i);
  if (!startMatch) return null;

  const blockStart = startMatch.index! + startMatch[0].length;
  let depth = 1;
  let blockEnd = -1;
  for (let i = blockStart; i < wikitext.length - 1; i++) {
    if (wikitext[i] === "{" && wikitext[i + 1] === "{") {
      depth++;
      i++; // skip second brace
    } else if (wikitext[i] === "}" && wikitext[i + 1] === "}") {
      depth--;
      if (depth === 0) {
        blockEnd = i;
        break;
      }
      i++; // skip second brace
    }
  }
  if (blockEnd === -1) return null;

  const block = wikitext.substring(blockStart, blockEnd);
  const fields: Record<string, string> = {};

  // Parse line-by-line for robustness with empty values
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.substring(1, eqIndex).trim();
    const value = trimmed.substring(eqIndex + 1).trim();
    if (/^\w+$/.test(key)) {
      fields[key] = value;
    }
  }

  return fields;
}

/**
 * Parse a full contestant page's wikitext into structured ContestantInfo.
 * Extracts data from the {{Contestant}} infobox template.
 */
export function parseContestantPage(
  wikitext: string,
  targetSeasonNum?: number,
): ContestantInfo | null {
  const fields = parseInfoboxFields(wikitext);
  if (!fields) return null;

  const info: ContestantInfo = {};

  // Nickname — extracted from bold intro paragraph, not the infobox
  const nickname = parseNickname(wikitext);
  if (nickname) {
    info.nickname = nickname;
  }

  // Parse birthdate → age
  if (fields.birthdate) {
    const birth = parseBirthDate(fields.birthdate);
    if (birth) {
      info.age = birth.age;
    }
  }

  // Hometown — take first if semicolon-separated (returning players)
  if (fields.hometown) {
    const raw = fields.hometown.replace(/<br\s*\/?>/gi, "").trim();
    // For returning players, hometowns are semicolon-separated
    const parts = raw.split(";").map((s) => s.trim());
    info.hometown = parts[0] || raw;
  }

  // Occupation — take first if semicolon-separated
  if (fields.occupation) {
    const raw = fields.occupation.replace(/<br\s*\/?>/gi, "").trim();
    const parts = raw.split(";").map((s) => s.trim());
    info.occupation = parts[0] || raw;
  }

  // Image filename — extract from infobox `image` field
  if (fields.image) {
    let imgFile = fields.image.trim();
    // Handle tabber format: <tabber>Label=[[File:S50 Colby.jpg]]</tabber>
    const fileMatch = imgFile.match(/\[\[File:([^\]|]+)/i);
    if (fileMatch) {
      imgFile = fileMatch[1].trim();
    }
    // Remove any remaining markup
    imgFile = imgFile.replace(/<[^>]+>/g, "").trim();
    if (imgFile && !imgFile.includes("{{") && !imgFile.includes("[[")) {
      info.imageFileName = imgFile;
    }
  }

  // Collect all season appearances
  const allSeasons: number[] = [];

  // Primary season
  if (fields.season) {
    const sn = parseSeasonNumber(fields.season);
    if (sn) allSeasons.push(sn);
  }

  // Additional seasons (season2, season3, ...)
  for (let i = 2; i <= 10; i++) {
    const key = `season${i}`;
    if (fields[key]) {
      const sn = parseSeasonNumber(fields[key]);
      if (sn) allSeasons.push(sn);
    }
  }

  info.allSeasons = allSeasons;

  // previousSeasons = seasons that appear BEFORE the target season in the list
  if (targetSeasonNum && allSeasons.length > 0) {
    const targetIndex = allSeasons.indexOf(targetSeasonNum);
    if (targetIndex === -1) {
      // Target season not listed on wiki yet — all known seasons are previous
      info.previousSeasons = [...allSeasons];
    } else if (targetIndex > 0) {
      info.previousSeasons = allSeasons.slice(0, targetIndex);
    } else {
      info.previousSeasons = [];
    }
  } else if (allSeasons.length > 1) {
    // If no target specified, all but the last are "previous"
    info.previousSeasons = allSeasons.slice(0, -1);
  }

  return info;
}

// --- Season infobox parser ---

export interface SeasonInfobox {
  /** Filming location (e.g., "Mamanuca Islands, Fiji") — wiki markup stripped */
  location?: string;
  /** Filming dates (e.g., "June 5, 2025 - June 30, 2025") */
  filmingDates?: string;
  /** Season air date range (e.g., "February 25, 2026 - May 20, 2026") */
  seasonRun?: string;
}

/**
 * Extract season metadata from the {{Season ...}} infobox on a season wiki page.
 * Uses the same pipe-delimited key=value format as {{Contestant}} but with a
 * different template name.
 */
export function parseSeasonInfobox(wikitext: string): SeasonInfobox | null {
  // Find the {{Season block
  const startMatch = wikitext.match(/\{\{Season\s*\n/i);
  if (!startMatch) return null;

  const blockStart = startMatch.index! + startMatch[0].length;
  let depth = 1;
  let blockEnd = -1;
  for (let i = blockStart; i < wikitext.length - 1; i++) {
    if (wikitext[i] === "{" && wikitext[i + 1] === "{") {
      depth++;
      i++;
    } else if (wikitext[i] === "}" && wikitext[i + 1] === "}") {
      depth--;
      if (depth === 0) {
        blockEnd = i;
        break;
      }
      i++;
    }
  }
  if (blockEnd === -1) return null;

  const block = wikitext.substring(blockStart, blockEnd);
  const fields: Record<string, string> = {};

  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.substring(1, eqIndex).trim();
    const value = trimmed.substring(eqIndex + 1).trim();
    if (/^\w+$/.test(key)) {
      fields[key] = value;
    }
  }

  const result: SeasonInfobox = {};

  if (fields.location) {
    // Strip wiki markup: {{wp|Page|Display}} → Display, {{wp|Page}} → Page
    let loc = fields.location;
    loc = loc.replace(
      /\{\{wp\|([^}|]+)(?:\|([^}]+))?\}\}/g,
      (_m, page, display) => display ?? page,
    );
    loc = loc.replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, "$2");
    loc = loc.replace(/<[^>]+>/g, "").trim();
    if (loc) result.location = loc;
  }

  if (fields.filmingdates) {
    let dates = fields.filmingdates;
    dates = dates.replace(/<ref>[^<]*<\/ref>/g, "").trim();
    if (dates) result.filmingDates = dates;
  }

  if (fields.seasonrun) {
    let run = fields.seasonrun;
    run = run.replace(/<ref>[^<]*<\/ref>/g, "").trim();
    if (run) result.seasonRun = run;
  }

  return result;
}
