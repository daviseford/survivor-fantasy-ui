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

/** Small delay to avoid rate limiting */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
