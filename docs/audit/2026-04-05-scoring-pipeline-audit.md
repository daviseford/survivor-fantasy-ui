# Comprehensive Scoring Pipeline Audit Report

**Date:** 2026-04-05
**Auditor:** Claude Code (automated + manual verification)
**Scope:** Full pipeline — survivoR source data → transformer → local files → scoring engine → Firestore
**Seasons audited:** All 50 (S1–S50)

## Executive Summary

**All 50 seasons pass all verification layers.** The scoring pipeline produces correct, consistent data from survivoR source through to Firestore. Zero discrepancies found in regeneration, referential integrity, scoring rule coverage, or Firestore sync.

One pipeline gap was identified: `batch-new-season.ts` does not call `validateSeasonData()` during generation. This is a hardening recommendation, not a data correctness issue.

| Layer                    | Result   | Details                                 |
| ------------------------ | -------- | --------------------------------------- |
| Layer 1: Source Fidelity | **PASS** | Zero diff across all 50 seasons         |
| Layer 2: Scoring Math    | **PASS** | 55/55 actions covered, `?? 0` confirmed |
| Layer 3: Firestore Sync  | **PASS** | Zero mismatches across all 50 seasons   |

## Methodology

### Layer 1: Source Fidelity (R1–R4)

**R1 — Consistency check:**

1. Created git branch `audit/scoring-pipeline-2026-04-05` from `main`
2. Ran `yarn tsx scripts/batch-new-season.ts $(seq 1 50) --force --skip-wiki` to regenerate all 50 seasons from fresh survivoR data
3. Ran `yarn format` to normalize formatting
4. Ran `git diff src/data/` to compare regenerated output against current local files

**R2/R3 — Correctness spot-check (S41–S49):**
Manual code review of `scripts/lib/survivor-transformer.ts` against the six bug categories from PR #160:

1. Advantage dedup (`ADVANTAGE_PLAY_VOTE_EVENTS` exhaustiveness)
2. Idol-for-others (`played_for_id` usage in both code paths)
3. Ignore set exhaustiveness (all three sets + throw-on-unknown guards)
4. Hybrid challenge handling (`outcome_type.includes("/")` splitting)
5. Journey risk inference (S41–S43 inferred vs S44+ explicit)
6. Challenge winner filtering (`won === 1` flag, not string matching)

**R4 — Referential integrity:**
Ran a throwaway verification script against all 50 seasons checking every `castaway_id` in challenges, eliminations, and events against the season's player list.

### Layer 2: Scoring Math (R5–R6)

**R5 — Scoring rule coverage:**
Compared the union of `GameEventActions` (45), `ChallengeWinActions` (5), and `GameProgressActions` (4) against `BASE_PLAYER_SCORING` entries. Verified `addFixedActionPoints` uses `?? 0`.

**R6 — Score deltas:**
Conditional on R1 findings. R1 found zero discrepancies, so R6 is auto-satisfied.

### Layer 3: Firestore Sync (R7–R8)

**R7 — Firestore comparison:**

1. Captured fresh Firestore snapshot via `yarn tsx scripts/snapshot-firestore.ts` → `data/firestore-snapshots/2026-04-05T19-52-21/`
2. Ran `yarn tsx scripts/validate-firestore-sync.ts $(seq 1 50)` for events (all 50 seasons)
3. Ran throwaway count-comparison script comparing local challenges/eliminations/events counts against snapshot JSON for all 50 seasons

**R8 — Remediation:**
No mismatches found. No remediation needed.

---

## Layer 1 Findings: Source Fidelity

### R1: Consistency Check — PASS

**Result:** Zero diff. All 50 seasons regenerated from fresh survivoR data produce byte-identical output to current local files (after formatting).

This proves the transformer is deterministic and the current local files are exactly what the transformer would produce from today's survivoR data.

### R2: Correctness Check (No Phantoms) — PASS

All six checklist items verified:

| Check                      | Result | Key Evidence                                                                                                                         |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Advantage dedup            | PASS   | `ADVANTAGE_PLAY_VOTE_EVENTS` (10 entries, line 562) skips all advantage plays in vote_history. Unknown vote_events throw (line 930). |
| Idol-for-others            | PASS   | `played_for_id ?? castaway_id` used in both structured (line 777) and fallback (line 789) paths.                                     |
| Ignore sets exhaustive     | PASS   | 50-season regeneration completed without throws — proves all survivoR values are covered.                                            |
| Hybrid challenges          | PASS   | `emitHybridChallengeEntries` (line 337) splits by `outcome_type.includes("/")` and individual flags.                                 |
| Journey risk inference     | PASS   | S41–S43: inferred from outcomes. S44+: explicit `chose_to_play`. "Returned to camp" in ignore set (line 578).                        |
| Challenge winner filtering | PASS   | `won === 1` used everywhere (lines 275, 286–297, 316, 351). No string matching.                                                      |

### R3: Correctness Check (No Omissions) — PASS

The successful 50-season regeneration (R1) combined with the throw-on-unknown guards proves no scoreable survivoR records are silently dropped:

- Every `advantage_movement` "Played" record either maps to a `use_*` action or throws
- Every idol play produces a `votes_negated_by_idol` event (when nullified votes exist)
- Every challenge winner with `won === 1` appears in output

### R4: Referential Integrity — PASS

**Result:** Zero errors across all 50 seasons. Every `castaway_id` in challenges (all winner arrays), eliminations, and events resolves to a valid player in the season's player list.

**Finding (pipeline gap):** `batch-new-season.ts` does not call `validateSeasonData()` during generation. Validation is only called by `sync-season.ts` (CI pipeline). This means batch regeneration lacks a validation gate — errors in generated data would not be caught until `yarn tsc` or manual inspection.

**Recommendation:** Add `validateSeasonData()` call to `batch-new-season.ts` after transformation, before file generation. Errors should skip the season or halt the batch.

---

## Layer 2 Findings: Scoring Math

### R5: Scoring Rule Coverage — PASS

| Metric                               | Count  |
| ------------------------------------ | ------ |
| `ChallengeWinActions`                | 5      |
| `GameEventActions`                   | 45     |
| `GameProgressActions`                | 4      |
| **Total `PlayerAction` values**      | **55** |
| `BASE_PLAYER_SCORING` entries        | **55** |
| Orphan actions (no scoring rule)     | **0**  |
| Dead rules (no matching action type) | **0**  |

Every action has a 1:1 scoring rule. TypeScript's `PlayerAction` type constraint on `BASE_PLAYER_SCORING` entries provides compile-time enforcement against dead rules (but not against missing rules — a missing entry silently scores 0 via `?? 0`).

**`addFixedActionPoints` fallback:** Confirmed using `?? 0` (nullish coalescing) at `src/utils/scoringUtils.ts:11`. Fixed from `|| 0` in PR #160.

### R6: Score Deltas — AUTO-SATISFIED

R1 found zero discrepancies, so no local files changed and no score deltas exist.

---

## Layer 3 Findings: Firestore Sync

### R7: Firestore Comparison — PASS

**Events:** `validate-firestore-sync.ts` confirmed all 50 seasons in sync. Zero `localOnly` or `firestoreOnly` events.

**Challenges/Eliminations/Events counts:** All 50 seasons have identical record counts between local TypeScript files and Firestore snapshot. Zero mismatches.

### R8: Remediation — NOT NEEDED

No mismatches found. No push commands to execute.

---

## Findings Summary

### Data Correctness: Clean

No data issues found across any of the three verification layers. The scoring pipeline is producing correct output for all 50 seasons.

### Pipeline Gap: `batch-new-season.ts` Missing Validation

**Severity:** Low (no data corruption observed, but a defense-in-depth gap)
**Location:** `scripts/batch-new-season.ts`
**Issue:** Does not call `validateSeasonData()` from `scripts/lib/validate-season.ts` during batch generation. Only `sync-season.ts` (CI) uses validation.
**Impact:** If the transformer produced data with invalid castaway_id references, the batch script would write it to disk without warning.
**Recommendation:** Add validation call after `transformPlayers`/`transformResults`, before `generateFullSeasonFile`. Errors should cause the season to be skipped with a clear error message.

---

## Confidence Assessment

**Overall confidence: HIGH**

| Factor                   | Assessment                                                                |
| ------------------------ | ------------------------------------------------------------------------- |
| Regeneration determinism | Proven — zero diff across 50 seasons                                      |
| Transformer correctness  | Verified — 8 throw guards, 4 ignore/dedup sets, 6-point spot-check passed |
| Referential integrity    | Verified — zero invalid castaway_id references                            |
| Scoring rule coverage    | Verified — 55/55 actions covered, zero orphans                            |
| Firestore sync           | Verified — zero mismatches in events, challenges, eliminations            |
| Defense-in-depth         | One gap — batch-new-season.ts missing validation call                     |

**Limitations:**

- Episode metadata (title, airDate, postMerge, isFinale flags) was not field-level compared against Firestore — only existence was verified via the seasons collection snapshot
- Scoring _calculation correctness_ was not independently verified (e.g., computing expected points from raw events and comparing against the scoring engine output). The scoring engine code is simple (88 lines) and was verified by code review, not by an independent calculation
- The audit verifies the pipeline produces the same output as the transformer. If the transformer has a systematic logic error that consistently produces wrong events from survivoR data, R1's diff would not catch it. The R2/R3 spot-check mitigates this for S41–S49 but does not cover S1–S40 at the same depth.

---

## References

- **PR #160:** Scoring transformer audit — dedup advantages, fix idol-for-others, harden pipeline
- **PR #136:** Replace silent advantage event fallbacks with explicit mappings
- **Transformer:** `scripts/lib/survivor-transformer.ts` (1001 lines)
- **Scoring engine:** `src/utils/scoringUtils.ts` (88 lines)
- **Scoring rules:** `src/data/scoring.ts` (55 entries)
- **Validation:** `scripts/lib/validate-season.ts` (121 lines)
- **Firestore snapshot:** `data/firestore-snapshots/2026-04-05T19-52-21/`
- **Learnings:** `docs/solutions/logic-errors/scoring-transformer-audit-dedup-advantages-idol-for-others-2026-04-05.md`
- **Requirements:** `docs/brainstorms/2026-04-05-scoring-pipeline-audit-requirements.md`
- **Plan:** `docs/plans/2026-04-05-001-refactor-scoring-pipeline-audit-plan.md`
