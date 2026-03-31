/**
 * Per-season name overrides: maps scraped wiki names to app player names.
 * Add entries here when automatic matching fails for a player.
 *
 * Format: { [seasonNum]: { "Wiki Name": "App Name" } }
 */
export const overrides: Record<number, Record<string, string>> = {
  9: {
    // Wiki uses "Lea 'Sarge' Masters" or just "Sarge"
    'Lea "Sarge" Masters': "Lea Masters",
    Sarge: "Lea Masters",
    // Wiki may use "Travis 'Bubba' Sampson"
    'Travis "Bubba" Sampson': "Bubba Sampson",
    "Travis Sampson": "Bubba Sampson",
  },
  46: {
    // S46 uses "Tiffany Nicole Ervin" in app but wiki may shorten
    "Tiffany Ervin": "Tiffany Nicole Ervin",
    // S46 uses "Q Burdette" but wiki may use full name
    "Quintavius Burdette": "Q Burdette",
    'Quintavius "Q" Burdette': "Q Burdette",
  },
  50: {
    // S50 uses full nickname format in app
    "Coach Wade": 'Benjamin "Coach" Wade',
    "Benjamin Wade": 'Benjamin "Coach" Wade',
    Coach: 'Benjamin "Coach" Wade',
    "Q Burdette": 'Quintavius "Q" Burdette',
    "Quintavius Burdette": 'Quintavius "Q" Burdette',
    // Wiki may use married/maiden name variants
    "Stephenie LaGrossa": "Stephenie LaGrossa Kendrick",
    "Jenna Lewis": "Jenna Lewis-Dougherty",
  },
};
