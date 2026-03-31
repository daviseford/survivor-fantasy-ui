/**
 * Scrape recap articles and use Claude CLI to extract structured game events.
 *
 * Usage:
 *   yarn scrape-recap <season_number>              # auto-discover all recaps via WordPress API
 *   yarn scrape-recap <season_number> <url>         # scrape a single recap URL
 *
 * Requires `claude` CLI to be installed and authenticated.
 * Outputs JSON to data/scraped/season_N_recap_events.json.
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import type { ScrapedGameEvent } from "./lib/types.js";
import { delay } from "./lib/wiki-api.js";

// --- HTML → text extraction ---

function htmlToText(html: string): string {
  // Try to extract just the article body content (strip sidebar, nav, footer)
  let content = html;
  const entryMatch = html.match(
    /<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<div|<footer|<aside|<section|<\/article)/i,
  );
  if (entryMatch) {
    content = entryMatch[1];
  }

  let text = content;
  text = text.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/?(p|div|li|h[1-6]|tr|blockquote)[^>]*>/gi, "\n");
  text = text.replace(/<[^>]+>/g, "");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

const GAME_EVENT_ACTIONS = [
  "accept_beware_advantage",
  "complete_sweat_or_savvy_task",
  "find_advantage",
  "find_beware_advantage",
  "find_idol",
  "fulfill_beware_advantage",
  "go_on_journey",
  "make_final_tribal_council",
  "make_merge",
  "use_advantage",
  "use_idol",
  "use_shot_in_the_dark_successfully",
  "use_shot_in_the_dark_unsuccessfully",
  "votes_negated_by_idol",
  "win_advantage",
  "win_survivor",
] as const;

// --- Inside Survivor WordPress API ---

interface WPTag {
  id: number;
  slug: string;
  count: number;
}

interface WPPost {
  id: number;
  link: string;
  title: { rendered: string };
  date: string;
}

async function discoverRecapUrls(
  seasonNum: number,
): Promise<{ url: string; title: string }[]> {
  const tagSlug = `survivor-${seasonNum}-recaps`;
  console.log(`Looking up tag: ${tagSlug}`);

  const tagRes = await fetch(
    `https://insidesurvivor.com/wp-json/wp/v2/tags?slug=${tagSlug}&_fields=id,slug,count`,
  );
  if (!tagRes.ok) {
    throw new Error(`WordPress API error (${tagRes.status}) fetching tag`);
  }

  const tags = (await tagRes.json()) as WPTag[];
  if (tags.length === 0) {
    throw new Error(
      `No recap tag found for "${tagSlug}". ` +
        `Inside Survivor may not have recaps for Season ${seasonNum}, ` +
        `or the tag format may differ. Try passing a URL directly.`,
    );
  }

  const tagId = tags[0].id;
  console.log(
    `Found tag "${tags[0].slug}" (id: ${tagId}, ${tags[0].count} posts)`,
  );

  // Fetch all posts with this tag
  const postsRes = await fetch(
    `https://insidesurvivor.com/wp-json/wp/v2/posts?tags=${tagId}&per_page=100&_fields=id,link,title,date&orderby=date&order=asc`,
  );
  if (!postsRes.ok) {
    throw new Error(`WordPress API error (${postsRes.status}) fetching posts`);
  }

  const posts = (await postsRes.json()) as WPPost[];

  // Filter to only recap articles (exclude power rankings, analysis, etc.)
  const recaps = posts.filter(
    (p) =>
      p.link.includes("recap") ||
      p.title.rendered.toLowerCase().includes("recap"),
  );

  return recaps.map((p) => ({
    url: p.link,
    title: p.title.rendered.replace(/&#8217;/g, "'").replace(/&#8211;/g, "–"),
  }));
}

// --- Player list loader ---

async function getLocalPlayers(seasonNum: number): Promise<string[]> {
  const seasonKey = `season_${seasonNum}`;
  try {
    const mod = await import(`../src/data/${seasonKey}/index.ts`);
    const playersKey = `SEASON_${seasonNum}_PLAYERS`;
    const players = mod[playersKey] as Array<{ name: string }>;
    if (!players) return [];
    return players.map((p) => p.name);
  } catch {
    return [];
  }
}

// --- Claude CLI ---

function buildPrompt(
  seasonNum: number,
  recapText: string,
  playerNames: string[],
  articleTitle?: string,
): string {
  const playerSection =
    playerNames.length > 0
      ? `\nThe players this season are (use these EXACT names in your output):\n${playerNames.map((n) => `- "${n}"`).join("\n")}\n\nWhen the article refers to a player by first name, nickname, or last name, match them to the correct full name from this list. For example, if the article says "Coach" and the list has "Benjamin \\"Coach\\" Wade", use "Benjamin \\"Coach\\" Wade". If the article says "Ozzy", use "Ozzy Lusth". Always use the exact name from the list above.\n`
      : "";

  // Extract episode number from article title (e.g., "Episode 1 Recap — ...")
  let episodeHint = "";
  if (articleTitle) {
    const epMatch = articleTitle.match(/Episode\s+(\d+)/i);
    if (epMatch) {
      const epNum = parseInt(epMatch[1], 10);
      episodeHint = `\nThis article is a recap of Episode ${epNum}. Use episode number ${epNum} for events that happen in this episode.`;
      // For premiere episodes (ep 1), note that 2-hour premieres span 2 episodes
      if (epNum === 1) {
        episodeHint += `\nIMPORTANT: Season premieres are often 2-hour episodes covering Episodes 1 AND 2. If the article describes events happening after the first tribal council/elimination (e.g., "Day 4" or later, or a second camp scene after someone was voted out), those events belong to Episode 2, not Episode 1. Pay careful attention to day numbers and tribal council boundaries to assign the correct episode.`;
      }
      // For finale episodes, note they may span multiple episodes
      if (articleTitle.toLowerCase().includes("finale")) {
        episodeHint += `\nNote: Finale episodes may cover multiple episodes. Assign events to the specific episode number where they occur if the article provides that detail.`;
      }
    }
  }

  return `You are extracting structured game events from a Survivor Season ${seasonNum} recap article.
${playerSection}${episodeHint}

Read the following recap text and extract every game event you can identify. Each event must use one of these action values:

${GAME_EVENT_ACTIONS.map((a) => `- "${a}"`).join("\n")}

For each event, output a JSON object with these fields:
- "episodeNum": number (the episode number — pay attention to day numbers and tribal council boundaries)
- "playerName": string (the player's full name from the player list above, or their commonly used name if no player list is available)
- "action": string (one of the values above)
- "multiplier": number | null (null unless the event has a specific multiplier, e.g. votes_negated_by_idol where multiplier = number of votes negated)

Important rules:
- Only include events where the article EXPLICITLY states who performed the action. Do not infer or guess.
- "find_idol" = a player discovers a hidden immunity idol at camp or on an island
- "find_advantage" = a player discovers an advantage (NOT an idol) — e.g., found on the ground, in a tree, at camp
- "win_advantage" = a player WINS an advantage through a game or competition (e.g., journey game, auction, challenge reward)
- "find_beware_advantage" = a player finds a Beware Advantage specifically
- "accept_beware_advantage" = a player accepts/opens a Beware Advantage after finding it
- "fulfill_beware_advantage" = a player completes the Beware Advantage conditions (e.g., says the secret phrase)
- "use_idol" = a player plays a hidden immunity idol at tribal council
- "use_advantage" = a player uses an advantage (steal-a-vote, extra vote, etc.)
- "go_on_journey" = a player is selected/sent on a journey or trek away from camp
- "use_shot_in_the_dark_successfully" or "use_shot_in_the_dark_unsuccessfully" = Shot in the Dark
- "votes_negated_by_idol" = votes were cancelled by an idol play. Set multiplier = number of votes negated
- Do not include challenge wins, eliminations, or vote-outs — those are tracked separately
- Set multiplier to null for all events unless explicitly applicable
- Pay close attention to WHO actually won/found/used something. Articles often mention multiple players in the same paragraph — only attribute the action to the player who actually did it.

Return ONLY a JSON array, no other text. Example:
[
  { "episodeNum": 1, "playerName": "Ozzy Lusth", "action": "find_idol", "multiplier": null },
  { "episodeNum": 2, "playerName": "Benjamin \\"Coach\\" Wade", "action": "go_on_journey", "multiplier": null }
]

If no game events are found, return an empty array: []

--- RECAP TEXT ---
${recapText}`;
}

function callClaude(prompt: string, tmpDir: string, label: string): string {
  const promptPath = path.join(tmpDir, `.recap-prompt-${label}.txt`);
  fs.writeFileSync(promptPath, prompt);

  try {
    return execSync(`claude --print < "${promptPath}"`, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 900_000,
    }).trim();
  } finally {
    // On Windows, the child process may still hold the file — retry with delay
    try {
      if (fs.existsSync(promptPath)) fs.unlinkSync(promptPath);
    } catch {
      setTimeout(() => {
        try {
          if (fs.existsSync(promptPath)) fs.unlinkSync(promptPath);
        } catch { /* ignore */ }
      }, 1000);
    }
  }
}

function parseClaudeResponse(responseText: string): ScrapedGameEvent[] {
  let jsonStr = responseText;
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    jsonStr = arrayMatch[0];
  }
  return JSON.parse(jsonStr) as ScrapedGameEvent[];
}

// --- Single URL scrape ---

async function scrapeOneRecap(
  seasonNum: number,
  url: string,
  tmpDir: string,
  label: string,
  playerNames: string[],
  articleTitle?: string,
): Promise<ScrapedGameEvent[]> {
  // Fetch the page
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; SurvivorFantasyScraper/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL (${response.status}): ${url}`);
  }

  const html = await response.text();
  const recapText = htmlToText(html);

  const maxChars = 80_000;
  const truncatedText =
    recapText.length > maxChars
      ? recapText.slice(0, maxChars) + "\n\n[TRUNCATED]"
      : recapText;

  // Call Claude (with one retry on failure)
  const prompt = buildPrompt(seasonNum, truncatedText, playerNames, articleTitle);
  let responseText: string;
  try {
    responseText = callClaude(prompt, tmpDir, label);
  } catch (err) {
    console.error(`  Claude call failed: ${err instanceof Error ? err.message : err}`);
    console.log("  Retrying in 5 seconds...");
    await delay(5000);
    responseText = callClaude(prompt, tmpDir, `${label}-retry`);
  }

  // Parse response
  let events: ScrapedGameEvent[];
  try {
    events = parseClaudeResponse(responseText);
  } catch (e) {
    console.error("  Failed to parse Claude response:");
    console.error("  " + responseText.slice(0, 200));
    return [];
  }

  // Validate
  const validActions = new Set<string>(GAME_EVENT_ACTIONS);
  return events.filter((ev) => {
    if (!validActions.has(ev.action)) {
      console.warn(`  Warning: Skipping invalid action "${ev.action}"`);
      return false;
    }
    return true;
  });
}

// --- Main ---

async function scrapeRecap(
  seasonNum: number,
  singleUrl?: string,
): Promise<ScrapedGameEvent[]> {
  const tmpDir = path.resolve(import.meta.dirname, "..", "data", "scraped");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  // Load player names for accurate attribution
  const playerNames = await getLocalPlayers(seasonNum);
  if (playerNames.length > 0) {
    console.log(`Loaded ${playerNames.length} player names for Season ${seasonNum}`);
  } else {
    console.log(
      `No local player data found for Season ${seasonNum} — Claude will use names from the article`,
    );
  }

  let urls: { url: string; title: string }[];

  if (singleUrl) {
    urls = [{ url: singleUrl, title: singleUrl }];
  } else {
    // Auto-discover recaps from Inside Survivor
    console.log(`\nDiscovering recaps for Season ${seasonNum}...\n`);
    urls = await discoverRecapUrls(seasonNum);
    console.log(`Found ${urls.length} recap articles:\n`);
    for (const { title, url } of urls) {
      console.log(`  ${title}`);
      console.log(`  ${url}\n`);
    }
  }

  const allEvents: ScrapedGameEvent[] = [];
  const results: { url: string; title: string; status: "success" | "failed"; eventCount: number; error?: string }[] = [];

  for (let i = 0; i < urls.length; i++) {
    const { url, title } = urls[i];
    console.log(
      `\n[${i + 1}/${urls.length}] Scraping: ${singleUrl ? url : title}`,
    );
    console.log("  Fetching page...");

    try {
      const events = await scrapeOneRecap(
        seasonNum,
        url,
        tmpDir,
        `${seasonNum}-${i}`,
        playerNames,
        title,
      );

      console.log(`  Extracted ${events.length} events`);
      for (const ev of events) {
        console.log(
          `    Ep ${ev.episodeNum}: ${ev.playerName} — ${ev.action}${ev.multiplier ? ` x${ev.multiplier}` : ""}`,
        );
      }

      allEvents.push(...events);
      results.push({ url, title, status: "success", eventCount: events.length });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`  FAILED: ${errorMsg}`);
      results.push({ url, title, status: "failed", eventCount: 0, error: errorMsg });
    }

    // Rate limit between requests
    if (i < urls.length - 1) {
      await delay(1000);
    }
  }

  // Deduplicate events (same episode + player + action)
  const seen = new Set<string>();
  const deduped = allEvents.filter((ev) => {
    const key = `${ev.episodeNum}-${ev.playerName}-${ev.action}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Write output
  const outputPath = path.join(
    tmpDir,
    `season_${seasonNum}_recap_events.json`,
  );

  const output = {
    seasonNum,
    scrapedAt: new Date().toISOString(),
    sourceUrls: urls.map((u) => u.url),
    events: deduped,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");

  // Print summary table
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Recap scrape complete for Season ${seasonNum}`);
  console.log(`${"=".repeat(60)}`);
  console.log("");
  const successCount = results.filter((r) => r.status === "success").length;
  const failedCount = results.filter((r) => r.status === "failed").length;
  for (const r of results) {
    const icon = r.status === "success" ? "[OK]" : "[FAIL]";
    const events = r.status === "success" ? `${r.eventCount} events` : r.error ?? "unknown error";
    console.log(`  ${icon} ${r.title}`);
    console.log(`       ${events}`);
  }
  console.log("");
  console.log(`  Articles: ${successCount} succeeded, ${failedCount} failed, ${urls.length} total`);
  console.log(`  Total events: ${deduped.length}`);
  console.log(`\nOutput: ${outputPath}`);

  if (failedCount > 0) {
    console.log(`\nSome articles failed. To retry them individually, run:`);
    for (const r of results.filter((r) => r.status === "failed")) {
      console.log(`  yarn scrape-recap ${seasonNum} "${r.url}"`);
    }
  }

  return deduped;
}

// --- CLI entry point ---
const isDirectRun =
  process.argv[1] &&
  fileURLToPath(import.meta.url).replace(/\\/g, "/") ===
    process.argv[1].replace(/\\/g, "/");

if (isDirectRun) {
  const seasonNum = Number(process.argv[2]);
  const url = process.argv[3]; // optional

  if (!seasonNum || isNaN(seasonNum)) {
    console.error("Usage:");
    console.error(
      "  yarn scrape-recap <season_number>              # auto-discover all recaps",
    );
    console.error(
      "  yarn scrape-recap <season_number> <url>         # scrape a single recap",
    );
    process.exit(1);
  }

  scrapeRecap(seasonNum, url).catch((err) => {
    console.error("Recap scrape failed:", err);
    process.exit(1);
  });
}
