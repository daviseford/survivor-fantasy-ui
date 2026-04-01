/**
 * Validates regenerated season data before Firestore push.
 * Catches bad data (regressions, invalid references, duplicates)
 * so the automated sync pipeline does not push corrupt data.
 */

import type { ScrapeResult, ScrapeResultsOutput } from "./types.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate season data against sanity checks:
 * - Episode count monotonicity (cannot decrease)
 * - All castaway_id references exist in the player list
 * - No duplicate IDs for challenges, eliminations, or events
 * - Structural integrity (required fields present)
 */
export function validateSeasonData(
  playerData: ScrapeResult,
  resultsData: ScrapeResultsOutput,
  existingEpisodeCount?: number,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const playerIds = new Set(playerData.players.map((p) => p.castawayId));

  // Episode count monotonicity
  if (
    existingEpisodeCount !== undefined &&
    resultsData.episodes.length < existingEpisodeCount
  ) {
    errors.push(
      `Episode count decreased from ${existingEpisodeCount} to ${resultsData.episodes.length}`,
    );
  }

  // Castaway ID integrity for challenges
  for (const challenge of resultsData.challenges) {
    for (const id of challenge.winnerCastawayIds) {
      if (!playerIds.has(id)) {
        errors.push(
          `Challenge (episode ${challenge.episodeNum}, order ${challenge.order}) references unknown castaway_id "${id}"`,
        );
      }
    }
  }

  // Castaway ID integrity for eliminations
  for (const elim of resultsData.eliminations) {
    if (!elim.castawayId) {
      errors.push(
        `Elimination (episode ${elim.episodeNum}, order ${elim.order}) missing required castaway_id`,
      );
    } else if (!playerIds.has(elim.castawayId)) {
      errors.push(
        `Elimination (episode ${elim.episodeNum}, order ${elim.order}) references unknown castaway_id "${elim.castawayId}"`,
      );
    }
  }

  // Castaway ID integrity for events
  for (const event of resultsData.events) {
    if (!playerIds.has(event.castawayId)) {
      errors.push(
        `Event "${event.action}" (episode ${event.episodeNum}) references unknown castaway_id "${event.castawayId}"`,
      );
    }
  }

  // Duplicate challenge IDs (by episodeNum + order)
  const challengeKeys = new Set<string>();
  for (const c of resultsData.challenges) {
    const key = `challenge_ep${c.episodeNum}_o${c.order}`;
    if (challengeKeys.has(key)) {
      errors.push(
        `Duplicate challenge: episode ${c.episodeNum}, order ${c.order}`,
      );
    }
    challengeKeys.add(key);
  }

  // Duplicate elimination IDs (by episodeNum + order)
  const elimKeys = new Set<string>();
  for (const e of resultsData.eliminations) {
    const key = `elim_ep${e.episodeNum}_o${e.order}`;
    if (elimKeys.has(key)) {
      errors.push(
        `Duplicate elimination: episode ${e.episodeNum}, order ${e.order}`,
      );
    }
    elimKeys.add(key);
  }

  // Duplicate event IDs (by episodeNum + castawayId + action)
  const eventKeys = new Set<string>();
  for (const ev of resultsData.events) {
    const key = `event_ep${ev.episodeNum}_${ev.castawayId}_${ev.action}`;
    if (eventKeys.has(key)) {
      warnings.push(
        `Duplicate event: "${ev.action}" for ${ev.castawayId} in episode ${ev.episodeNum}`,
      );
    }
    eventKeys.add(key);
  }

  return { valid: errors.length === 0, errors, warnings };
}
