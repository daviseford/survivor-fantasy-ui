/**
 * Thin wrapper around the MediaWiki API at survivor.fandom.com.
 * Fetches wikitext content by page name.
 */

const BASE_URL = "https://survivor.fandom.com/api.php";

/** Known season page names for seasons that don't use the Survivor_N format */
const SEASON_PAGE_NAMES: Record<number, string> = {
  1: "Survivor:_Borneo",
  2: "Survivor:_The_Australian_Outback",
  3: "Survivor:_Africa",
  4: "Survivor:_Marquesas",
  5: "Survivor:_Thailand",
  6: "Survivor:_The_Amazon",
  7: "Survivor:_Pearl_Islands",
  8: "Survivor:_All-Stars",
  9: "Survivor:_Vanuatu",
  10: "Survivor:_Palau",
  11: "Survivor:_Guatemala",
  12: "Survivor:_Panama",
  13: "Survivor:_Cook_Islands",
  14: "Survivor:_Fiji",
  15: "Survivor:_China",
  16: "Survivor:_Micronesia",
  17: "Survivor:_Gabon",
  18: "Survivor:_Tocantins",
  19: "Survivor:_Samoa",
  20: "Survivor:_Heroes_vs._Villains",
  21: "Survivor:_Nicaragua",
  22: "Survivor:_Redemption_Island",
  23: "Survivor:_South_Pacific",
  24: "Survivor:_One_World",
  25: "Survivor:_Philippines",
  26: "Survivor:_Caramoan",
  27: "Survivor:_Blood_vs._Water",
  28: "Survivor:_Cagayan",
  29: "Survivor:_San_Juan_del_Sur",
  30: "Survivor:_Worlds_Apart",
  31: "Survivor:_Cambodia",
  32: "Survivor:_Kaôh_Rōng",
  33: "Survivor:_Millennials_vs._Gen_X",
};

export function getSeasonPageName(seasonNum: number): string {
  return SEASON_PAGE_NAMES[seasonNum] || `Survivor_${seasonNum}`;
}

export async function fetchWikitext(pageName: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "parse",
    page: pageName,
    prop: "wikitext",
    format: "json",
    redirects: "true",
  });

  const url = `${BASE_URL}?${params}`;

  const response = await fetch(url);
  if (!response.ok) {
    console.error(`HTTP ${response.status} fetching ${pageName}`);
    return null;
  }

  const data = (await response.json()) as {
    parse?: { wikitext?: { "*"?: string } };
    error?: { code?: string; info?: string };
  };

  if (data.error) {
    console.error(`Wiki API error for ${pageName}: ${data.error.info}`);
    return null;
  }

  return data.parse?.wikitext?.["*"] ?? null;
}

/**
 * Resolve a wiki image filename to its full CDN URL via the imageinfo API.
 * E.g., "S46 Ben Katzman.jpg" → "https://static.wikia.nocookie.net/survivor/images/..."
 */
export async function fetchImageUrl(fileName: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    titles: `File:${fileName}`,
    prop: "imageinfo",
    iiprop: "url",
    format: "json",
  });

  const url = `${BASE_URL}?${params}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = (await response.json()) as {
      query?: { pages?: Record<string, { imageinfo?: { url: string }[] }> };
    };

    const pages = data.query?.pages;
    if (!pages) return null;

    for (const page of Object.values(pages)) {
      const imgUrl = page.imageinfo?.[0]?.url;
      if (imgUrl) return imgUrl;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Batch-resolve multiple wiki image filenames to CDN URLs.
 * Uses the API's multi-title support for efficiency (up to 50 at a time).
 */
export async function fetchImageUrls(
  fileNames: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  // API supports up to 50 titles per request
  for (let i = 0; i < fileNames.length; i += 50) {
    const batch = fileNames.slice(i, i + 50);
    const titles = batch.map((f) => `File:${f}`).join("|");
    const params = new URLSearchParams({
      action: "query",
      titles,
      prop: "imageinfo",
      iiprop: "url",
      format: "json",
    });

    const url = `${BASE_URL}?${params}`;
    try {
      const response = await fetch(url);
      if (!response.ok) continue;

      const data = (await response.json()) as {
        query?: {
          pages?: Record<
            string,
            { title?: string; imageinfo?: { url: string }[] }
          >;
        };
      };

      const pages = data.query?.pages;
      if (!pages) continue;

      for (const page of Object.values(pages)) {
        const imgUrl = page.imageinfo?.[0]?.url;
        if (imgUrl && page.title) {
          // Remove "File:" prefix to map back to the original filename
          const fileName = page.title.replace(/^File:/, "");
          result.set(fileName, imgUrl);
        }
      }
    } catch {
      // Skip failed batches
    }
    if (i + 50 < fileNames.length) await delay(200);
  }
  return result;
}

/**
 * Expand a MediaWiki template and return the rendered wikitext.
 * E.g., expandTemplate("{{Ep|5001}}") → "[[Epic Party|1]]"
 */
export async function expandTemplate(
  templateText: string,
): Promise<string | null> {
  const params = new URLSearchParams({
    action: "expandtemplates",
    text: templateText,
    prop: "wikitext",
    format: "json",
  });

  const url = `${BASE_URL}?${params}`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const data = (await response.json()) as {
    expandtemplates?: { wikitext?: string };
  };

  return data.expandtemplates?.wikitext ?? null;
}

/**
 * Resolve episode titles for a season by expanding {{Ep|SSEE}} templates.
 * Returns a map of episode number → title.
 */
export async function fetchEpisodeTitles(
  seasonNum: number,
  episodeCount: number,
): Promise<Map<number, string>> {
  const titles = new Map<number, string>();

  // Build a batch template expansion text: all Ep templates separated by newlines
  // Format: {{Ep|SSEE}} where SS is season (2-3 digits) and EE is episode (2 digits)
  const templateParts: string[] = [];
  for (let ep = 1; ep <= episodeCount; ep++) {
    const code = `${seasonNum}${ep.toString().padStart(2, "0")}`;
    templateParts.push(`{{Ep|${code}}}`);
  }

  const batchText = templateParts.join("\n---EPSEP---\n");
  const expanded = await expandTemplate(batchText);
  if (!expanded) return titles;

  // Parse expanded text — each template becomes a wikilink like [[Episode Title|N]]
  const parts = expanded.split("---EPSEP---");
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    // Extract title from [[Title|display]] or [[Title]]
    const linkMatch = part.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/);
    if (linkMatch) {
      titles.set(i + 1, linkMatch[1].trim());
    }
  }

  return titles;
}

/**
 * Fetch the season logo URL from the wiki.
 * Checks the season page infobox (image/logo field), then falls back to common filenames.
 */
export async function fetchSeasonLogoUrl(
  seasonNum: number,
): Promise<string | null> {
  // Try infobox image/logo field — may contain [[File:...]] or tabber markup
  const pageName = getSeasonPageName(seasonNum);
  const wikitext = await fetchWikitext(pageName);
  if (wikitext) {
    // Match `| image = ...` or `| logo = ...` — value may span to next `|` field
    const fieldMatch = wikitext.match(
      /\|\s*(?:image|logo)\s*=\s*([\s\S]*?)(?=\n\s*\||\n\}\})/i,
    );
    if (fieldMatch) {
      const fieldValue = fieldMatch[1];
      // Extract first [[File:...]] reference
      const fileMatch = fieldValue.match(/\[\[File:([^\]|]+)/i);
      if (fileMatch) {
        const url = await fetchImageUrl(fileMatch[1].trim());
        if (url) return url;
      }
    }
  }

  // Fallback: try common filename patterns
  const candidates = [
    `US S${seasonNum} logo.png`,
    `Survivor ${seasonNum} Logo.png`,
  ];
  for (const candidate of candidates) {
    const url = await fetchImageUrl(candidate);
    if (url) return url;
  }

  return null;
}

/** Small delay to avoid rate limiting */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
