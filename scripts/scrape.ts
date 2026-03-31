const seasonNum = Number(process.argv[2]);

if (!seasonNum || isNaN(seasonNum)) {
  console.error("Usage: yarn scrape <season_number>");
  console.error("Example: yarn scrape 46");
  process.exit(1);
}

console.log(`Scraper stub: would scrape season ${seasonNum}`);
