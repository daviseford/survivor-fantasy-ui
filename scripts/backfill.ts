const seasonNum = Number(process.argv[2]);

if (!seasonNum || isNaN(seasonNum)) {
  console.error("Usage: yarn backfill <season_number>");
  console.error("Example: yarn backfill 46");
  process.exit(1);
}

console.log(`Backfill stub: would backfill season ${seasonNum}`);
