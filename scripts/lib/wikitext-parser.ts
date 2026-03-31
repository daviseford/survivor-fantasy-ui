/**
 * Parses Survivor Wiki wikitext to extract contestant data from
 * {{Contestant}} infobox templates and season cast tables.
 */

export interface ContestantInfo {
  age?: number;
  hometown?: string;
  occupation?: string;
  tribes?: string[];
  finishPlacement?: string;
  daysLasted?: string;
  previousSeasons?: number[];
  /** All season numbers this player appeared in (including the target season) */
  allSeasons?: number[];
}

export interface CastTableEntry {
  wikiPageTitle: string;
  displayName: string;
  age?: number;
  location?: string;
  occupation?: string;
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

/** Parse {{tribeicon|name}} or {{tribeicon4|name}} entries → array of tribe names */
export function parseTribes(value: string): string[] {
  const matches = value.matchAll(/\{\{tribeicon\d*\|([^|}]+)/gi);
  return [...matches].map((m) => m[1].trim());
}

/** Parse {{S2|N}} → season number */
export function parseSeasonNumber(value: string): number | null {
  const match = value.match(/\{\{S2?\|(\d+)\}\}/);
  return match ? Number(match[1]) : null;
}

/** Parse days field "X/Y" → "X/Y" string, or null if empty */
export function parseDays(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
}

/** Parse place field — returns the raw string or null if empty */
export function parsePlace(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
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
  // Find the {{Contestant block — handle optional {{Spoiler}} prefix
  const contestantMatch = wikitext.match(
    /\{\{Contestant\s*\n([\s\S]*?)\n\}\}/i,
  );
  if (!contestantMatch) return null;

  const block = contestantMatch[1];
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

  // Find the tribes/place/days for the target season
  if (targetSeasonNum && allSeasons.length > 0) {
    const seasonIndex = allSeasons.indexOf(targetSeasonNum);
    if (seasonIndex === -1) {
      // Target season not listed — skip tribes/place/days
      return info;
    }
    const suffix = seasonIndex <= 0 ? "" : String(seasonIndex + 1);

    const tribesKey = `tribes${suffix}`;
    const placeKey = `place${suffix}`;
    const daysKey = `days${suffix}`;

    if (fields[tribesKey]) {
      info.tribes = parseTribes(fields[tribesKey]);
    }
    if (fields[placeKey]) {
      info.finishPlacement = parsePlace(fields[placeKey]);
    }
    if (fields[daysKey]) {
      info.daysLasted = parseDays(fields[daysKey]);
    }
  } else {
    // Single-season player: use the base fields
    if (fields.tribes) {
      info.tribes = parseTribes(fields.tribes);
    }
    if (fields.place) {
      info.finishPlacement = parsePlace(fields.place);
    }
    if (fields.days) {
      info.daysLasted = parseDays(fields.days);
    }
  }

  return info;
}

// --- Cast table parser ---

/**
 * Parse a season page's cast table wikitext to extract contestant links.
 * Looks for '''[[Name]]''' bold wiki links in the table.
 */
export function parseCastTable(wikitext: string): CastTableEntry[] {
  const entries: CastTableEntry[] = [];

  // Match contestant rows: '''[[Name]]''' followed by <small> tag with bio
  const rowRegex =
    /'''\[\[([^\]|]+)(?:\|[^\]]+)?\]\]'''(?:<br\s*\/?>)?<small>([^<]*(?:<br\s*\/?>)?[^<]*)<\/small>/gi;

  let match: RegExpExecArray | null;
  while ((match = rowRegex.exec(wikitext)) !== null) {
    const wikiPageTitle = match[1].trim();
    const smallContent = match[2].trim();

    const entry: CastTableEntry = {
      wikiPageTitle,
      displayName: wikiPageTitle.replace(/_/g, " "),
    };

    // Parse <small> content: "age, City, ST<br />Occupation"
    // Split on <br /> first to separate location line from occupation line
    const parts = smallContent
      .split(/<br\s*\/?>/i)
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.length >= 1) {
      // First part: "age, City, ST"
      const firstPart = parts[0];
      const commaIndex = firstPart.indexOf(",");
      if (commaIndex > -1) {
        const ageStr = firstPart.substring(0, commaIndex).trim();
        const age = Number(ageStr);
        if (!isNaN(age) && age > 0 && age < 120) {
          entry.age = age;
        }
        entry.location = firstPart.substring(commaIndex + 1).trim();
      }
    }

    if (parts.length >= 2) {
      entry.occupation = parts[1];
    }

    entries.push(entry);
  }

  return entries;
}
