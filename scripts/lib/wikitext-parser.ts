/**
 * Parses Survivor Wiki wikitext to extract contestant data from
 * {{Contestant}} infobox templates and season cast tables,
 * as well as episode guides and voting history tables.
 */

import type {
  PlayerTribeHistory,
  ScrapedChallenge,
  ScrapedElimination,
  ScrapedEpisode,
  ScrapedGameEvent,
} from "./types.js";

export interface ContestantInfo {
  age?: number;
  hometown?: string;
  occupation?: string;
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

/** Parse {{S2|N}} → season number */
export function parseSeasonNumber(value: string): number | null {
  const match = value.match(/\{\{S2?\|(\d+)\}\}/);
  return match ? Number(match[1]) : null;
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

// --- Episode guide parser ---

/**
 * Extract the tribe name and inner content from a {{tribebox|tribe|content}} template.
 * Returns null if no tribebox is found.
 */
function parseTribebox(
  text: string,
): { tribe: string; content: string } | null {
  // Match {{tribebox|TRIBE|CONTENT}} — content may contain nested templates
  const m = text.match(
    /\{\{[Tt]ribebox\|([^|}]+?)(?:\|([^}]*(?:\{\{[^}]*\}\}[^}]*)*))?\}\}/,
  );
  if (!m) return null;
  return { tribe: m[1].trim().toLowerCase(), content: (m[2] ?? "").trim() };
}

/**
 * Extract episode title from {{Ep|SSEE}} template.
 * Returns the raw title text from the episode link on that line, or
 * constructs "Episode N" from the template code.
 */
function parseEpTemplate(text: string): string {
  const m = text.match(/\{\{Ep\|(\d{4,5})\}\}/);
  if (!m) return "";
  // The template encodes season + episode as e.g. 4601 = S46E01, 0903 = S09E03
  // Always take the last 2 digits as the episode number
  const code = m[1];
  const epNum = parseInt(code.slice(code.length - 2), 10);
  return `Episode ${epNum}`;
}

/**
 * Parse an eliminated player cell: {{tribebox|tribe|Name<br />(vote)}}
 * Returns { name, voteString, tribe } or null.
 */
function parseEliminatedCell(cellText: string): {
  name: string;
  voteString: string;
  tribe: string;
} | null {
  const tb = parseTribebox(cellText);
  if (!tb || !tb.content) return null;

  // Content format: "Name<br />(vote-string)" or "Name<br>(vote-string)"
  // Also handles "Name<br />(no vote)"
  let content = tb.content;
  // Remove {{sup|...}} footnotes
  content = content.replace(/\{\{sup\|[^}]*\}\}/gi, "");
  // Remove [[#endnote...]] links
  content = content.replace(/\[\[#[^\]]*\]\]/g, "");
  // Remove bold markers
  content = content.replace(/'''?/g, "");

  // Split on <br>, <br />, or <br/>
  const parts = content.split(/<br\s*\/?>/i);
  const name = parts[0].trim();
  if (!name) return null;

  let voteString = "";
  if (parts.length > 1) {
    // Extract vote from parentheses
    const voteMatch = parts.slice(1).join(" ").match(/\(([^)]+)\)/);
    if (voteMatch) {
      // Collapse internal whitespace around hyphens/semicolons for numeric votes
      // but preserve meaningful words like "no vote"
      voteString = voteMatch[1]
        .replace(/\s*([;-])\s*/g, "$1")
        .replace(/\n/g, "")
        .trim();
    }
  }

  return { name, voteString, tribe: tb.tribe };
}

/**
 * Parse a finish cell: {{nowrap|1st Voted Out<br />Day 3}} or similar.
 * Returns the full finish text.
 */
function parseFinishCell(cellText: string): string {
  // Match {{nowrap|...}} content
  const nowrapMatch = cellText.match(/\{\{nowrap\|([^}]+)\}\}/i);
  let text = nowrapMatch ? nowrapMatch[1] : cellText;
  // Clean up HTML
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<[^>]+>/g, "");
  text = text.trim();
  return text;
}

/**
 * Determine elimination variant from finish text.
 */
function classifyElimination(
  finishText: string,
  voteString: string,
): ScrapedElimination["variant"] {
  const lower = finishText.toLowerCase();
  if (
    lower.includes("sole survivor") ||
    lower.includes("runner-up") ||
    lower.includes("second runner-up")
  ) {
    return "final_tribal_council";
  }
  if (lower.includes("evacuated") || lower.includes("medevac")) {
    return "medical";
  }
  if (lower.includes("quit")) {
    return "quitter";
  }
  if (
    lower.includes("voted out") ||
    lower.includes("eliminated") ||
    voteString
  ) {
    return "tribal";
  }
  return "other";
}

/**
 * Detect whether a challenge cell indicates a combined reward+immunity challenge.
 * This is true when the cell uses colspan="2" AND the notes reference "combined".
 */
function isCombinedCell(cellText: string): boolean {
  return /colspan\s*=\s*"?2"?/i.test(cellText);
}

/**
 * Parse challenge winners from a tribebox cell.
 * Returns { tribe, names[] } where names is empty for tribal wins
 * and contains player names for individual wins.
 */
function parseChallengeWinners(cellText: string): {
  tribe: string;
  names: string[];
} | null {
  const tb = parseTribebox(cellText);
  if (!tb) {
    // Fallback: handle style="{{tribecolor|tribe}}" pattern (e.g., post-merge individual challenges)
    const tribecolorMatch = cellText.match(
      /\{\{tribecolor\|([^|}]+)\}\}/i,
    );
    if (tribecolorMatch) {
      const tribe = tribecolorMatch[1].trim().toLowerCase();
      // Extract content after the style pipe: ...;"| Maria{{sup|...}}
      // Look for content AFTER the style closing: border-bottom:none;"| NAME
      const styleContentMatch = cellText.match(
        /;\s*border-[^"]*"\|\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]*)*)/,
      );
      if (styleContentMatch) {
        let content = styleContentMatch[1];
        content = content.replace(/\{\{sup\|[^}]*\}\}/gi, "").trim();
        // If the extracted name matches the tribe key, it's a tribe win (not a player)
        if (content.toLowerCase() !== tribe) {
          const names = content
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean);
          if (names.length > 0) {
            return { tribe, names };
          }
        }
      }
      return { tribe, names: [] };
    }
    return null;
  }

  if (!tb.content) {
    // Tribal win — no individual names
    return { tribe: tb.tribe, names: [] };
  }

  // Parse individual names from content — may be comma-separated
  let content = tb.content;
  // Remove {{sup|...}}
  content = content.replace(/\{\{sup\|[^}]*\}\}/gi, "");
  // Remove [...] bracket groups (these are reward-sharing members, not winners)
  content = content.replace(/\[[^\]]*\]/g, "");
  // Remove <br />, <br>
  content = content.replace(/<br\s*\/?>/gi, ",");
  // Remove bold
  content = content.replace(/'''?/g, "");

  const names = content
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);

  if (names.length === 0) {
    return { tribe: tb.tribe, names: [] };
  }

  return { tribe: tb.tribe, names };
}

/**
 * Check if a notes section mentions "combined" reward and immunity challenge.
 */
function hasCombinedFootnote(wikitext: string): boolean {
  return /[Cc]ombined\s+[Rr]eward\s+and\s+[Ii]mmunity\s+[Cc]hallenge/i.test(
    wikitext,
  );
}

/**
 * Parse the episode guide table from a Survivor season wiki page.
 *
 * Extracts episodes, challenges, and eliminations from the standard
 * episode guide table format used on Survivor Wiki.
 */
export function parseEpisodeGuide(
  wikitext: string,
  _seasonNum: number,
): {
  episodes: ScrapedEpisode[];
  challenges: ScrapedChallenge[];
  eliminations: ScrapedElimination[];
  warnings: string[];
} {
  const episodes: ScrapedEpisode[] = [];
  const challenges: ScrapedChallenge[] = [];
  const eliminations: ScrapedElimination[] = [];
  const warnings: string[] = [];

  // Check if there's a "combined" footnote in the whole text
  const globalCombined = hasCombinedFootnote(wikitext);

  // Dynamically detect extra columns between "Challenges" and "Eliminated" in the header.
  // S9 has 0 extras, S46 has 1 (Journey), S50 has 2 (Exiled + Journey).
  // We count rowspan header cells that appear between "Challenges" and "Eliminated".
  let extraColumnsBeforeEliminated = 0;
  {
    const headerLines = wikitext.split("\n");
    let seenChallengesHeader = false;
    for (const hl of headerLines) {
      const trimmedH = hl.trim();
      if (!trimmedH.startsWith("!")) continue;
      if (/Challenges/i.test(trimmedH)) {
        seenChallengesHeader = true;
        continue;
      }
      if (seenChallengesHeader) {
        if (/Eliminated/i.test(trimmedH)) break;
        // Count rowspan="2" header cells (these are extra columns like Exiled, Journey)
        if (/rowspan/i.test(trimmedH)) {
          extraColumnsBeforeEliminated++;
        }
      }
    }
  }

  // Split the wikitext into rows by |- delimiters
  const lines = wikitext.split("\n");

  // We need to parse the table row by row. The episode guide has a complex
  // structure with rowspan cells that span multiple table rows.
  // Strategy: split into table rows (delimited by |-), then parse cells.

  // First, find all the table rows (separated by |-)
  const tableRows: string[][] = [];
  let currentRow: string[] = [];
  let inHeader = true;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "|-") {
      if (currentRow.length > 0) {
        tableRows.push(currentRow);
      }
      currentRow = [];
      inHeader = false;
      continue;
    }
    if (trimmed.startsWith("!")) {
      // Header row
      continue;
    }
    if (trimmed.startsWith("|}") || trimmed.startsWith("{|")) {
      if (currentRow.length > 0) {
        tableRows.push(currentRow);
      }
      currentRow = [];
      continue;
    }
    if (!inHeader && trimmed.startsWith("|")) {
      currentRow.push(trimmed);
    }
  }
  if (currentRow.length > 0) {
    tableRows.push(currentRow);
  }

  // Now we need to parse the rows while tracking rowspan state.
  // Each data row in the episode guide has these columns (0-indexed):
  // [0] Episode number, [1] Episode title, [2] Air date,
  // [3] Reward winner, [4] Immunity winner,
  // [5..5+N-1] Extra columns (e.g. Exiled, Journey),
  // [5+N] Eliminated, [6+N] Finish, [7+N] Viewers, [8+N] Ratings
  //
  // N = extraColumnsBeforeEliminated:
  //   S9:  N=0  → Eliminated at col 5
  //   S46: N=1  → Journey at col 5, Eliminated at col 6
  //   S50: N=2  → Exiled at col 5, Journey at col 6, Eliminated at col 7

  // Track rowspan: for each column index, how many more rows it spans
  const rowspanRemaining: number[] = new Array(12).fill(0);
  const rowspanValues: string[] = new Array(12).fill("");

  // We'll track which episodes we've seen
  const episodeMap = new Map<
    number,
    {
      title: string;
      airDate: string;
      finishTexts: string[];
      eliminations: Array<{
        name: string;
        voteString: string;
        tribe: string;
        finishText: string;
      }>;
      /** Ordered list of challenges as they appear in the wiki table */
      challengeEntries: Array<{
        cell: string;
        variant: "reward" | "immunity" | "combined";
      }>;
    }
  >();

  // Track all tribes seen per episode to detect merge
  const tribesByEpisode = new Map<number, Set<string>>();

  // Determine column indices based on how many extra columns exist.
  // Base layout: [0]EpNum [1]Title [2]AirDate [3]Reward [4]Immunity [5]Eliminated [6]Finish ...
  // With extras: Exiled/Journey columns insert between Immunity(4) and Eliminated.
  const eliminatedCol = 5 + extraColumnsBeforeEliminated;
  const finishCol = 6 + extraColumnsBeforeEliminated;

  // Parse each data row
  // Skip header rows — look for rows that start with episode numbers
  let doneParsingRows = false;

  for (const row of tableRows) {
    if (doneParsingRows) continue;

    // Build the effective cells for this row by accounting for rowspans
    const effectiveCells: string[] = [];
    let rawCellIndex = 0;

    for (let colIdx = 0; colIdx < 12; colIdx++) {
      if (rowspanRemaining[colIdx] > 0) {
        effectiveCells.push(rowspanValues[colIdx]);
        rowspanRemaining[colIdx]--;
      } else if (rawCellIndex < row.length) {
        const rawCell = row[rawCellIndex];
        rawCellIndex++;

        // Check for rowspan
        const rowspanMatch = rawCell.match(/rowspan\s*=\s*"?(\d+)"?/i);
        const rowspan = rowspanMatch ? parseInt(rowspanMatch[1], 10) : 1;

        // Check for colspan
        const colspanMatch = rawCell.match(/colspan\s*=\s*"?(\d+)"?/i);
        const colspan = colspanMatch ? parseInt(colspanMatch[1], 10) : 1;

        if (rowspan > 1) {
          rowspanRemaining[colIdx] = rowspan - 1;
          rowspanValues[colIdx] = rawCell;
        }

        effectiveCells.push(rawCell);

        // Handle colspan — fill extra columns
        if (colspan > 1) {
          for (let c = 1; c < colspan; c++) {
            colIdx++;
            effectiveCells.push(rawCell);
            if (rowspan > 1) {
              rowspanRemaining[colIdx] = rowspan - 1;
              rowspanValues[colIdx] = rawCell;
            }
          }
        }
      } else {
        effectiveCells.push("");
      }
    }

    // Now try to parse the episode number from the first cell
    // The first cell should be like "| N" or "| rowspan="N" | M"
    const firstCell = effectiveCells[0] || "";
    const epNumMatch =
      firstCell.match(/\|\s*(?:rowspan\s*=\s*"?\d+"?\s*\|?\s*)(\d+)\s*$/) ||
      firstCell.match(/\|\s*(\d+)\s*$/);

    // Try to get the episode number
    let epNum: number | null = null;
    if (epNumMatch) {
      epNum = parseInt(epNumMatch[1], 10);
    }

    // Check if this is a notes/footnotes row (typically at the end of the table)
    // Only treat as notes if there's no episode number AND the row contains Notes text
    // or a very wide colspan (8+) that blanks out all data columns
    const isNotesRow =
      firstCell.includes("Notes:") ||
      row.some((c) => c.includes("Notes:")) ||
      (!epNumMatch && /colspan\s*=\s*"?(\d+)"?/.test(firstCell) &&
        parseInt(firstCell.match(/colspan\s*=\s*"?(\d+)"?/)?.[1] || "0", 10) >= 8);
    if (isNotesRow) {
      // Notes row — check for combined footnote marker
      if (
        row.some(
          (c) =>
            /[Cc]ombined\s+[Rr]eward\s+and\s+[Ii]mmunity/i.test(c) ||
            c.includes("Notes:"),
        )
      ) {
        doneParsingRows = true;
      }
      continue;
    }

    if (epNum === null) continue;

    // If this is a reunion/recap episode (no challenge data), skip
    const titleCell = effectiveCells[1] || "";
    const airDateCell = effectiveCells[2] || "";

    // Reunion/recap episodes blank out challenge+eliminated columns with a wide colspan.
    // S46 uses colspan=5, S9 uses colspan=4.
    if (effectiveCells[3] && /colspan\s*=\s*"?[4-9]"?/i.test(effectiveCells[3])) {
      // Reunion episode — skip
      continue;
    }

    // Check for "Jury Vote" in the reward/immunity columns (finale rows)
    const rewardCell = effectiveCells[3] || "";
    const immunityCell = effectiveCells[4] || "";
    const isJuryVoteRow =
      rewardCell.includes("Jury Vote") || immunityCell.includes("Jury Vote");

    // Get or create episode entry
    if (!episodeMap.has(epNum)) {
      // Parse title from Ep template
      const title = parseEpTemplate(titleCell);

      // Parse air date
      const airDateMatch = airDateCell.match(
        /(?:align="left"\s*\|?\s*)?([A-Z][a-z]+ \d{1,2},? \d{4})/,
      );
      const airDate = airDateMatch ? airDateMatch[1] : "";

      episodeMap.set(epNum, {
        title,
        airDate,
        finishTexts: [],
        eliminations: [],
        challengeEntries: [],
      });
    }

    const epData = episodeMap.get(epNum)!;

    // Detect gray-background rows (journey/exile formatting, not challenge data)
    const isGrayRow =
      rewardCell.includes("background-color") &&
      /rgb\s*\(\s*166\s*,\s*166\s*,\s*166\s*\)|#a6a6a6|gray/i.test(
        rewardCell,
      );

    // Determine if THIS ROW is a combined challenge (colspan=2) vs separate reward/immunity.
    // Gray rows use colspan=2 for layout, not for combined challenges — skip those.
    const isRowCombined =
      !isGrayRow &&
      globalCombined &&
      (isCombinedCell(rewardCell) || isCombinedCell(immunityCell));

    // Skip cells that are not real challenge data:
    // - "border-top:none" = visual continuation of colspan row above (e.g., S50 Ep4 row 2)
    // - "tribebox2" = non-win marker (e.g., "out" tribe = lost the challenge)
    const isSkippableCell = (cell: string) =>
      /border-top\s*:\s*none/i.test(cell) || /tribebox2/i.test(cell);

    // Helper to add a challenge entry (deduplicates by cell+variant)
    const addChallenge = (
      cell: string,
      variant: "reward" | "immunity" | "combined",
    ) => {
      const winners = parseChallengeWinners(cell);
      if (winners) {
        if (!tribesByEpisode.has(epNum)) {
          tribesByEpisode.set(epNum, new Set());
        }
        tribesByEpisode.get(epNum)!.add(winners.tribe);
        // Deduplicate: same cell text + variant = same challenge (from rowspan)
        const isDup = epData.challengeEntries.some(
          (e) => e.cell === cell && e.variant === variant,
        );
        if (!isDup) {
          epData.challengeEntries.push({ cell, variant });
        }
      }
    };

    // Parse challenge cells (only non-jury-vote rows, skip gray formatting rows)
    if (!isJuryVoteRow && !isGrayRow) {
      if (isRowCombined) {
        // Combined reward+immunity — single challenge
        const cell = rewardCell || immunityCell;
        if (cell && !cell.includes("None") && !isSkippableCell(cell)) {
          addChallenge(cell, "combined");
        }
      } else {
        // Separate reward and immunity columns
        if (
          rewardCell &&
          !rewardCell.includes("None") &&
          !rewardCell.includes("Jury Vote") &&
          !isSkippableCell(rewardCell)
        ) {
          addChallenge(rewardCell, "reward");
        }

        if (
          immunityCell &&
          !immunityCell.includes("None") &&
          !immunityCell.includes("Jury Vote") &&
          !isSkippableCell(immunityCell)
        ) {
          addChallenge(immunityCell, "immunity");
        }
      }
    }

    // Parse elimination cell
    const elimCell = effectiveCells[eliminatedCol] || "";
    const finishCell = effectiveCells[finishCol] || "";

    if (elimCell && !isJuryVoteRow) {
      const elimData = parseEliminatedCell(elimCell);
      if (elimData) {
        const finishText = parseFinishCell(finishCell);
        // Avoid duplicates (rowspan'd cells repeat)
        const isDuplicate = epData.eliminations.some(
          (e) =>
            e.name === elimData.name && e.voteString === elimData.voteString,
        );
        if (!isDuplicate) {
          epData.eliminations.push({
            name: elimData.name,
            voteString: elimData.voteString,
            tribe: elimData.tribe,
            finishText,
          });
          if (!tribesByEpisode.has(epNum)) {
            tribesByEpisode.set(epNum, new Set());
          }
          tribesByEpisode.get(epNum)!.add(elimData.tribe);
        }
      }
    }

    // Parse jury vote / finale eliminations
    if (isJuryVoteRow) {
      const finaleElimCell = effectiveCells[eliminatedCol] || "";
      const finaleFinishCell = effectiveCells[finishCol] || "";
      const elimData = parseEliminatedCell(finaleElimCell);
      if (elimData) {
        const finishText = parseFinishCell(finaleFinishCell);
        const isDuplicate = epData.eliminations.some(
          (e) =>
            e.name === elimData.name &&
            e.finishText === finishText,
        );
        if (!isDuplicate) {
          epData.eliminations.push({
            name: elimData.name,
            voteString: elimData.voteString,
            tribe: elimData.tribe,
            finishText,
          });
        }
      }
    }

    // Also handle the case where elimination is in the finishCell itself
    // (for finale rows with Sole Survivor, Runner-Up etc.)
    if (finishCell) {
      const finishText = parseFinishCell(finishCell);
      if (
        finishText &&
        (finishText.includes("Sole Survivor") ||
          finishText.includes("Runner-Up") ||
          finishText.includes("Second Runner-Up"))
      ) {
        epData.finishTexts.push(finishText);
      }
    }
  }

  // Now detect merge and finale, and build output arrays
  // Collect all pre-merge tribe names (from early episodes)
  const allTribes = new Set<string>();
  const preMergeTribes = new Set<string>();
  let mergeEpisode: number | null = null;

  // Sort episodes by number
  const sortedEpNums = [...episodeMap.keys()].sort((a, b) => a - b);

  // First pass: collect tribes and detect merge
  for (const epNum of sortedEpNums) {
    const tribes = tribesByEpisode.get(epNum);
    if (!tribes) continue;
    for (const t of tribes) {
      if (t === "none" || t === "status" || t === "tie") continue;
      allTribes.add(t);
    }
  }

  // The merge tribe is the one that appears only in later episodes
  // Pre-merge tribes are those in early episodes
  // Heuristic: Find the first episode where a new tribe name appears
  // that wasn't in episode 1
  const firstEpTribes = tribesByEpisode.get(sortedEpNums[0]);
  if (firstEpTribes) {
    for (const t of firstEpTribes) {
      if (t !== "none" && t !== "status" && t !== "tie") {
        preMergeTribes.add(t);
      }
    }
  }
  // Also gather from second episode
  if (sortedEpNums.length > 1) {
    const secondTribes = tribesByEpisode.get(sortedEpNums[1]);
    if (secondTribes) {
      for (const t of secondTribes) {
        if (t !== "none" && t !== "status" && t !== "tie") {
          preMergeTribes.add(t);
        }
      }
    }
  }

  // Find the first episode where a tribe appears that's not in the pre-merge set
  for (const epNum of sortedEpNums) {
    const tribes = tribesByEpisode.get(epNum);
    if (!tribes) continue;
    for (const t of tribes) {
      if (
        t !== "none" &&
        t !== "status" &&
        t !== "tie" &&
        !preMergeTribes.has(t)
      ) {
        if (mergeEpisode === null || epNum < mergeEpisode) {
          mergeEpisode = epNum;
        }
      }
    }
  }

  // Build episodes array
  let eliminationOrder = 1;
  let challengeOrder = 1;

  for (const epNum of sortedEpNums) {
    const epData = episodeMap.get(epNum)!;

    const isFinale =
      epData.eliminations.some(
        (e) =>
          e.finishText.includes("Sole Survivor") ||
          e.finishText.includes("Runner-Up") ||
          e.finishText.includes("Second Runner-Up"),
      ) || epData.finishTexts.some((f) => f.includes("Sole Survivor"));

    const mergeOccurs = mergeEpisode !== null && epNum === mergeEpisode;
    const postMerge = mergeEpisode !== null && epNum > mergeEpisode;

    const hasCombined = epData.challengeEntries.some(
      (e) => e.variant === "combined",
    );

    episodes.push({
      order: epNum,
      title: epData.title,
      airDate: epData.airDate,
      isCombinedChallenge: hasCombined,
      isFinale,
      postMerge,
      mergeOccurs,
    });

    // Build challenges — group by variant: reward → combined → immunity.
    // This matches Survivor episode structure (reward challenge before immunity).
    const variantOrder = { reward: 0, combined: 1, immunity: 2 };
    const sortedEntries = [...epData.challengeEntries].sort(
      (a, b) => variantOrder[a.variant] - variantOrder[b.variant],
    );
    for (const entry of sortedEntries) {
      const winners = parseChallengeWinners(entry.cell);
      if (winners) {
        challenges.push({
          episodeNum: epNum,
          variant: entry.variant,
          winnerNames: winners.names,
          winnerTribe: winners.names.length === 0 ? winners.tribe : null,
          order: challengeOrder++,
        });
      }
    }

    // Build eliminations
    for (const elim of epData.eliminations) {
      const variant = classifyElimination(elim.finishText, elim.voteString);
      eliminations.push({
        episodeNum: epNum,
        playerName: elim.name,
        voteString: elim.voteString || "no vote",
        variant,
        finishText: elim.finishText,
        order: eliminationOrder++,
      });
    }
  }

  return { episodes, challenges, eliminations, warnings };
}

// --- Voting history parser ---

/**
 * Split a wikitext table into sections delimited by |- row separators.
 * Returns an array of sections, each being an array of lines.
 */
function splitTableSections(wikitext: string): string[][] {
  const lines = wikitext.split("\n");
  const sections: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "|-") {
      if (current.length > 0) {
        sections.push(current);
      }
      current = [];
      continue;
    }
    if (trimmed === "{|" || trimmed.startsWith("{|")) {
      continue;
    }
    if (trimmed === "|}") {
      if (current.length > 0) {
        sections.push(current);
      }
      current = [];
      continue;
    }
    current.push(line);
  }
  if (current.length > 0) {
    sections.push(current);
  }
  return sections;
}

/**
 * Extract a player name from a voted-out cell content (tribebox with image and name).
 */
function extractVotedOutName(cellText: string): string {
  const tb = parseTribebox(cellText);
  if (!tb || !tb.content) return "";

  const content = tb.content;
  // Content: [[File:S46 jelinsky t.png|50px|link=David Jelinsky]]<br />Jelinsky
  const brParts = content.split(/<br\s*\/?>/i);
  let name = "";
  if (brParts.length > 1) {
    name = brParts[brParts.length - 1].trim();
  } else {
    name = content;
  }

  // Clean up wiki markup
  name = name
    .replace(/\[\[File:[^\]]*\]\]/gi, "")
    .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1")
    .replace(/'''?/g, "")
    .replace(/''([^']+)''/g, "$1")
    .trim();

  return name;
}

/**
 * Parse the voting history table from a Survivor season wiki page.
 *
 * Extracts game events (idol plays via strikethroughs) and vote tallies
 * per episode from the standard voting history table format.
 */
export function parseVotingHistory(
  wikitext: string,
  _seasonNum: number,
): {
  events: ScrapedGameEvent[];
  votesByEpisode: Record<number, { vote: string; eliminatedPlayer: string }>;
  tribeHistories: Map<string, PlayerTribeHistory>;
  warnings: string[];
} {
  const events: ScrapedGameEvent[] = [];
  const votesByEpisode: Record<
    number,
    { vote: string; eliminatedPlayer: string }
  > = {};
  const tribeHistories = new Map<string, PlayerTribeHistory>();
  const warnings: string[] = [];

  const sections = splitTableSections(wikitext);

  // Step 1: Find the episode header section.
  // It contains lines like: ! colspan="2"| Episode
  // followed by lines like: ! [[Title|N]] or ! colspan="2"| [[Title|N]]
  const episodeColumns: number[] = [];

  for (const section of sections) {
    const hasEpisodeHeader = section.some((line) =>
      /!\s*colspan="2"\|\s*Episode/i.test(line),
    );
    if (!hasEpisodeHeader) continue;

    // Collect all episode number lines from this section
    for (const line of section) {
      const trimmed = line.trim();
      // Skip the "Episode" header cell itself and non-episode cells
      if (/!\s*colspan="2"\|\s*Episode/i.test(trimmed)) continue;
      if (!trimmed.startsWith("!")) continue;
      // Skip tribe group headers like ! colspan="5"| Original Tribes
      if (
        /!\s*colspan="\d+"\|.*Tribe/i.test(trimmed) ||
        /!\s*colspan="\d+"\|.*Merged/i.test(trimmed)
      ) {
        continue;
      }

      // Check for colspan
      const colspanMatch = trimmed.match(/colspan\s*=\s*"?(\d+)"?/i);
      const colspan = colspanMatch ? parseInt(colspanMatch[1], 10) : 1;

      // Extract episode number from [[Title|N]]
      const epMatch =
        trimmed.match(/\[\[[^\]|]+\|(\d+)\]\]/) ||
        trimmed.match(/\[\[(\d+)\]\]/);
      if (epMatch) {
        const epNum = parseInt(epMatch[1], 10);
        for (let i = 0; i < colspan; i++) {
          episodeColumns.push(epNum);
        }
      }
    }
    break; // Only process the first episode header section
  }

  if (episodeColumns.length === 0) {
    warnings.push(
      "Could not parse episode columns from voting history header",
    );
    return { events, votesByEpisode, tribeHistories, warnings };
  }

  // Step 2: Find the "Voted Out" section and parse eliminated player names.
  for (const section of sections) {
    const hasVotedOut = section.some((line) =>
      /!\s*colspan="2"\|\s*Voted\s*Out/i.test(line),
    );
    if (!hasVotedOut) continue;

    // Collect data cell lines (starting with |)
    let colIdx = 0;
    for (const line of section) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("|")) continue;

      const name = extractVotedOutName(trimmed);
      if (!name) continue;

      if (colIdx < episodeColumns.length) {
        const epNum = episodeColumns[colIdx];
        if (!votesByEpisode[epNum]) {
          votesByEpisode[epNum] = { vote: "", eliminatedPlayer: name };
        } else {
          if (!votesByEpisode[epNum].eliminatedPlayer.includes(name)) {
            votesByEpisode[epNum].eliminatedPlayer += `, ${name}`;
          }
        }
      }
      colIdx++;
    }
    break;
  }

  // Step 3: Find the "Vote" section and parse vote tallies.
  for (const section of sections) {
    const hasVoteHeader = section.some((line) =>
      /!\s*colspan="2"\|\s*Vote\s*$/i.test(line.trim()),
    );
    if (!hasVoteHeader) continue;

    let colIdx = 0;
    for (const line of section) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("|")) continue;

      // Check for colspan
      const colspanMatch = trimmed.match(/colspan\s*=\s*"?(\d+)"?/i);
      const colspan = colspanMatch ? parseInt(colspanMatch[1], 10) : 1;

      // Extract vote text: remove colspan prefix, {{sup}} footnotes
      let voteText = trimmed
        .replace(/^\|\s*/, "")
        .replace(/colspan\s*=\s*"?\d+"?\s*\|?\s*/i, "")
        .replace(/\{\{sup\|[^}]*\}\}/gi, "")
        .trim();

      if (!voteText) continue;

      for (let c = 0; c < colspan; c++) {
        if (colIdx + c < episodeColumns.length) {
          const epNum = episodeColumns[colIdx + c];
          if (votesByEpisode[epNum]) {
            votesByEpisode[epNum].vote = voteText;
          } else {
            votesByEpisode[epNum] = {
              vote: voteText,
              eliminatedPlayer: "",
            };
          }
        }
      }
      colIdx += colspan;
    }
    break;
  }

  // Step 4: Parse player vote rows for idol plays (strikethroughs).
  // Player rows are sections that contain "align="left"" and tribebox2.
  // Each cell is on its own line, so we track column index per line.
  for (const section of sections) {
    // Check if this is a player vote row section
    const firstLine = section[0]?.trim() ?? "";
    if (!/align="left"/i.test(firstLine)) continue;
    if (!/tribebox2/i.test(firstLine)) continue;

    // Extract player name from the second line (align="left"| Name)
    let playerName = "";
    for (const line of section) {
      const trimmedLine = line.trim();
      const nameMatch = trimmedLine.match(
        /align="left"\|?\s*\{?\{?nowrap\|?([A-Za-z][A-Za-z .]+)/,
      );
      const simpleMatch = trimmedLine.match(
        /align="left"\|?\s*([A-Z][a-z]+(?:\s+[A-Z]\.?)?)\s*$/,
      );
      // Handle single-character names like "Q"
      const singleCharMatch = trimmedLine.match(
        /align="left"\|?\s*([A-Z])\s*$/,
      );
      if (simpleMatch) {
        playerName = simpleMatch[1].trim();
        break;
      }
      if (singleCharMatch) {
        playerName = singleCharMatch[1].trim();
        break;
      }
      if (nameMatch) {
        playerName = nameMatch[1].trim();
        break;
      }
    }

    if (!playerName) continue;

    // Extract tribe data from the first line (tribebox2 + tribeicon1 patterns)
    const tb2Match = firstLine.match(/\{\{tribebox2\|([^}]+)\}\}/i);
    if (tb2Match) {
      const tb2Value = tb2Match[1].toLowerCase();
      // Skip jury voting rows (tribebox2|out) and bare tribebox2|none
      if (tb2Value !== "out") {
        const iconRegex = /\{\{tribeicon1\|([^}]+)\}\}/gi;
        const tribeicons: string[] = [];
        let iconMatch: RegExpExecArray | null;
        while ((iconMatch = iconRegex.exec(firstLine)) !== null) {
          tribeicons.push(iconMatch[1].toLowerCase());
        }
        // Skip tribebox2|none only when there are no tribeicon entries
        if (tb2Value !== "none" || tribeicons.length > 0) {
          tribeHistories.set(playerName, {
            tribebox2: tb2Value,
            tribeicons,
          });
        }
      }
    }

    // Now scan vote cells for strikethroughs
    let colIdx = 0;
    let skippedNameCells = 0;
    for (const line of section) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("|")) continue;

      // Skip the first two | cells (player identifier cells)
      if (skippedNameCells < 2) {
        if (/align="left"/i.test(trimmed)) {
          skippedNameCells++;
          continue;
        }
      }

      // Check for colspan (skip multiple columns)
      const colspanMatch = trimmed.match(/colspan\s*=\s*"?(\d+)"?/i);
      const colspan = colspanMatch ? parseInt(colspanMatch[1], 10) : 1;

      // Check for strikethrough in this cell
      const strikethroughRegex = /<s>([^<]+)<\/s>/gi;
      let sMatch: RegExpExecArray | null;
      while ((sMatch = strikethroughRegex.exec(trimmed)) !== null) {
        const negatedTarget = sMatch[1].trim();
        if (colIdx < episodeColumns.length) {
          const epNum = episodeColumns[colIdx];
          events.push({
            episodeNum: epNum,
            playerName: negatedTarget,
            action: "votes_negated_by_idol",
            multiplier: null,
          });
        }
      }

      colIdx += colspan;
    }
  }

  return { events, votesByEpisode, tribeHistories, warnings };
}

/**
 * Build per-episode tribe rosters from votetable tribe histories and episode guide data.
 * Returns the same Map<episodeNum, Map<tribeKey, playerNames[]>> shape as the old
 * Firestore-based loadTribeRoster().
 */
export function buildTribeRosters(
  tribeHistories: Map<string, PlayerTribeHistory>,
  episodes: ScrapedEpisode[],
  eliminations: ScrapedElimination[],
  mergeEpisode: number | null,
): Map<number, Map<string, string[]>> {
  // Step 1: Determine original tribe per player
  const originalTribes = new Map<string, string>();
  for (const [name, hist] of tribeHistories) {
    if (hist.tribeicons.length > 0) {
      originalTribes.set(name, hist.tribeicons[0]); // 1st = original
    } else {
      originalTribes.set(name, hist.tribebox2);
    }
  }

  // Step 2: Detect if a swap occurred (any player has 2+ tribeicon1 entries)
  const hasSwap = [...tribeHistories.values()].some(
    (h) => h.tribeicons.length >= 2,
  );

  // Step 3: If swap, determine post-swap tribe per player
  const swapTribes = new Map<string, string>();
  if (hasSwap) {
    for (const [name, hist] of tribeHistories) {
      if (hist.tribeicons.length >= 2) {
        // 2nd tribeicon = post-swap tribe
        swapTribes.set(name, hist.tribeicons[1]);
      } else if (
        hist.tribeicons.length === 1 &&
        hist.tribebox2 !== hist.tribeicons[0]
      ) {
        // Swapped, eliminated pre-merge: tribebox2 is post-swap tribe
        swapTribes.set(name, hist.tribebox2);
      } else {
        // Not swapped or eliminated before swap: use original
        swapTribes.set(name, originalTribes.get(name)!);
      }
    }
  }

  // Step 4: Find swap episode boundary (if swap occurred)
  let swapEpisode: number | null = null;
  if (hasSwap) {
    // Find the earliest elimination of a swapped player
    for (const elim of eliminations) {
      const original = originalTribes.get(elim.playerName);
      const postSwap = swapTribes.get(elim.playerName);
      if (original && postSwap && original !== postSwap) {
        // This player was swapped — their elimination episode is at or after the swap
        if (swapEpisode === null || elim.episodeNum < swapEpisode) {
          swapEpisode = elim.episodeNum;
        }
      }
    }
    if (swapEpisode === null) {
      // No swapped player eliminated pre-merge — shouldn't happen in real seasons
      throw new Error(
        "Swap detected but no swapped player was eliminated before merge. " +
          "Cannot determine swap episode boundary.",
      );
    }
  }

  // Step 5: Build per-episode rosters
  const result = new Map<number, Map<string, string[]>>();

  // Track eliminated players and their elimination episodes
  const eliminatedAt = new Map<string, number>();
  for (const elim of eliminations) {
    if (!eliminatedAt.has(elim.playerName)) {
      eliminatedAt.set(elim.playerName, elim.episodeNum);
    }
  }

  for (const ep of episodes) {
    // Skip post-merge episodes (tribe resolution not needed)
    if (mergeEpisode !== null && ep.order > mergeEpisode) continue;
    // Also skip the merge episode itself (individual challenges begin)
    if (mergeEpisode !== null && ep.order === mergeEpisode) continue;

    const tribeMap = new Map<string, string[]>();
    const useSwapRoster =
      hasSwap && swapEpisode !== null && ep.order >= swapEpisode;

    for (const [name] of tribeHistories) {
      // Skip players eliminated in prior episodes (they still play challenges
      // in their elimination episode since challenges happen before tribal)
      const elimEp = eliminatedAt.get(name);
      if (elimEp !== undefined && ep.order > elimEp) continue;

      const tribe = useSwapRoster
        ? (swapTribes.get(name) ?? originalTribes.get(name)!)
        : originalTribes.get(name)!;

      if (!tribeMap.has(tribe)) tribeMap.set(tribe, []);
      tribeMap.get(tribe)!.push(name);
    }

    result.set(ep.order, tribeMap);
  }

  return result;
}
