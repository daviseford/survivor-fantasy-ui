/**
 * Scrape a recap article and use Claude to extract structured game events.
 *
 * Usage:
 *   yarn scrape-recap <season_number> <url>
 *
 * Requires ANTHROPIC_API_KEY environment variable (or in .env file).
 * Outputs JSON to data/scraped/season_N_recap_events.json.
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import type { ScrapedGameEvent } from "./lib/types.js";

// --- HTML → text extraction ---

/** Strip HTML tags and collapse whitespace to extract readable text. */
function htmlToText(html: string): string {
  let text = html;
  // Remove script/style blocks
  text = text.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
  // Convert <br>, <p>, <div>, <li> to newlines
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/?(p|div|li|h[1-6]|tr|blockquote)[^>]*>/gi, "\n");
  // Remove all remaining tags
  text = text.replace(/<[^>]+>/g, "");
  // Decode common HTML entities
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, " ");
  // Collapse whitespace
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

// --- Anthropic API call ---

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

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>;
}

async function callClaude(
  prompt: string,
  apiKey: string,
): Promise<string> {
  const messages: AnthropicMessage[] = [{ role: "user", content: prompt }];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Anthropic API error ${response.status}: ${body}`,
    );
  }

  const data = (await response.json()) as AnthropicResponse;
  const textBlock = data.content.find((c) => c.type === "text");
  return textBlock?.text ?? "";
}

function buildPrompt(seasonNum: number, recapText: string): string {
  return `You are extracting structured game events from a Survivor Season ${seasonNum} recap article.

Read the following recap text and extract every game event you can identify. Each event must use one of these action values:

${GAME_EVENT_ACTIONS.map((a) => `- "${a}"`).join("\n")}

For each event, output a JSON object with these fields:
- "episodeNum": number (the episode number if mentioned, or your best estimate)
- "playerName": string (the player's first name or commonly used name)
- "action": string (one of the values above)
- "multiplier": number | null (null unless the event has a specific multiplier)

Important rules:
- Only include events you are confident actually happened based on the text
- Use the player's short/common name (e.g., "Ozzy" not "Ozzy Lusth")
- For idol finds, use "find_idol". For idol plays, use "use_idol"
- For advantage finds, use "find_advantage" or "win_advantage" (if won in a challenge/game)
- For advantage uses, use "use_advantage"
- For Shot in the Dark, use "use_shot_in_the_dark_successfully" or "use_shot_in_the_dark_unsuccessfully"
- For journey events, use "go_on_journey"
- If votes were negated by an idol, create a "votes_negated_by_idol" event for each player whose votes were negated
- Do not include challenge wins, eliminations, or vote-outs — those are tracked separately
- Set multiplier to null for all events unless the text explicitly mentions a multiplier

Return ONLY a JSON array, no other text. Example:
[
  { "episodeNum": 1, "playerName": "Ozzy", "action": "find_idol", "multiplier": null },
  { "episodeNum": 2, "playerName": "Coach", "action": "go_on_journey", "multiplier": null }
]

If no game events are found, return an empty array: []

--- RECAP TEXT ---
${recapText}`;
}

// --- Main ---

async function scrapeRecap(
  seasonNum: number,
  url: string,
): Promise<ScrapedGameEvent[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(
      "Error: ANTHROPIC_API_KEY environment variable is required.\n" +
        "Set it in your .env file or export it in your shell.",
    );
    process.exit(1);
  }

  console.log(`\nScraping recap for Season ${seasonNum}...`);
  console.log(`URL: ${url}\n`);

  // Step 1: Fetch the page
  console.log("Fetching page...");
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; SurvivorFantasyScraper/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL (${response.status}): ${url}`);
  }

  const html = await response.text();
  console.log(`  Fetched ${html.length} bytes of HTML`);

  // Step 2: Extract text content
  const recapText = htmlToText(html);
  console.log(`  Extracted ${recapText.length} chars of text`);

  // Truncate if too long (Claude has context limits)
  const maxChars = 80_000;
  const truncatedText =
    recapText.length > maxChars
      ? recapText.slice(0, maxChars) + "\n\n[TRUNCATED]"
      : recapText;

  // Step 3: Call Claude API
  console.log("\nCalling Claude API to extract game events...");
  const prompt = buildPrompt(seasonNum, truncatedText);
  const responseText = await callClaude(prompt, apiKey);

  // Step 4: Parse the JSON response
  let events: ScrapedGameEvent[];
  try {
    // Handle possible markdown code fences in the response
    let jsonStr = responseText.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    events = JSON.parse(jsonStr) as ScrapedGameEvent[];
  } catch (e) {
    console.error("Failed to parse Claude response as JSON:");
    console.error(responseText.slice(0, 500));
    throw new Error(`JSON parse error: ${e}`);
  }

  // Validate events
  const validActions = new Set<string>(GAME_EVENT_ACTIONS);
  const validEvents = events.filter((ev) => {
    if (!validActions.has(ev.action)) {
      console.warn(
        `  Warning: Skipping event with invalid action "${ev.action}" for ${ev.playerName}`,
      );
      return false;
    }
    return true;
  });

  console.log(`\nExtracted ${validEvents.length} game events`);

  // Step 5: Write output
  const outputDir = path.resolve(import.meta.dirname, "..", "data", "scraped");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(
    outputDir,
    `season_${seasonNum}_recap_events.json`,
  );

  const output = {
    seasonNum,
    scrapedAt: new Date().toISOString(),
    sourceUrl: url,
    events: validEvents,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Recap scrape complete for Season ${seasonNum}`);
  console.log(`  Events: ${validEvents.length}`);
  console.log(`\nOutput: ${outputPath}`);

  return validEvents;
}

// --- CLI entry point ---
const isDirectRun =
  process.argv[1] &&
  fileURLToPath(import.meta.url).replace(/\\/g, "/") ===
    process.argv[1].replace(/\\/g, "/");

if (isDirectRun) {
  const seasonNum = Number(process.argv[2]);
  const url = process.argv[3];

  if (!seasonNum || isNaN(seasonNum) || !url) {
    console.error("Usage: yarn scrape-recap <season_number> <url>");
    console.error(
      'Example: yarn scrape-recap 50 "https://example.com/survivor-s50-recap"',
    );
    process.exit(1);
  }

  scrapeRecap(seasonNum, url).catch((err) => {
    console.error("Recap scrape failed:", err);
    process.exit(1);
  });
}
