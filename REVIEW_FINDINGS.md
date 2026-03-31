# Internal Consistency Review: Results Scraper, Season Bootstrap CLI, Watch-Along Mode Plan

**Document:** `docs/plans/2026-03-31-001-feat-results-scraper-season-bootstrap-watch-along-plan.md`

**Review Date:** 2026-03-31

**Reviewer Role:** Technical Editor (Internal Consistency)

## Summary

One high-confidence structural issue found, zero to one moderate-confidence inconsistency.

---

## Issues Found

### 1. STRUCTURAL: Ungrouped Requirements Across Multiple Concerns

**Confidence:** HIGH (0.82)

**Location:** Lines 23–40 (Requirements Trace section)

**Issue:**

The "Requirements Trace" section lists 15 items (R1–R15) in a flat list that actually spans three distinct feature areas with incompatible dependencies:

1. **Results Scraper (R1–R4):** Research-dependent wiki scraping features
2. **Season Bootstrap CLI (R5–R9):** Orchestration and Firestore upload
3. **Watch-Along Mode (R10–R15):** Episode gating and creator controls

While the **Phased Delivery** section (lines 209–215) correctly separates these into Phase A, B, and C, the Requirements Trace reads as a monolithic list with no visual grouping, making it unclear which requirements belong to which feature without cross-reference. For human readability and agent implementation routing, this should be grouped with subheadings.

**Example of the problem:**
- R8 states "Without `--push`, local files only" (Bootstrap feature)
- R14 states "Episode filtering centralized in hooks" (Watch-Along feature)
- Reading sequentially, no visual signal that these belong to separate feature areas with separate delivery timelines

**Recommendation:**

Restructure "Requirements Trace" to group by feature:

```markdown
## Requirements Trace

### Results Scraper (Phase B)
- R1. Results scraper extracts...
- R2. Wiki-first approach...
- R3. Completed seasons only
- R4. Scraped results output...

### Season Bootstrap CLI (Phase C)
- R5. `yarn new-season <N>` orchestrates...
- R6. Generated season files are...
- R7. `--push` flag uploads...
- R8. Without `--push`, local files only
- R9. Idempotent scraping...

### Watch-Along Mode (Phase A)
- R10. Creator chooses "live" or "watch-along"...
- R11. Existing competitions unaffected...
- R12. Watch-along filters all views...
- R13. Creator advances episodes...
- R14. Episode filtering centralized...
- R15. Watch-along initializes...
```

**autofix_class:** auto

---

### 2. TERMINOLOGY DRIFT: "Register Season" vs. "Register in seasons.ts"

**Confidence:** MODERATE (0.68)

**Location:** Multiple sections (lines 161, 575, 597–613)

**Issue:**

The term "register" is used in different contexts without consistent precision:

- **Line 161 (Data Flow diagram):** "4. registerSeason(N)" — suggests a function call
- **Line 575 (Unit 10 approach):** "Register season in `src/data/seasons.ts` (add import + SEASONS entry" — describes the *side effect* (modifying the file)
- **Line 597 (Unit 11 goal):** "Automatically add the import and SEASONS entry for a new season in `src/data/seasons.ts`" — names the feature but is separate from the "registerSeason" call

**Contradiction:**

The plan treats "register season" as a discrete step executed by Unit 10 (new-season.ts orchestrator, line 575):
> "5. Register season in `src/data/seasons.ts` (add import + SEASONS entry...)"

But Unit 11 is a separate implementation unit (lines 597–629) whose role is:
> "Automatically add the import and SEASONS entry for a new season in `src/data/seasons.ts`"

This creates ambiguity:
- Is registration *part of* Unit 10's orchestration (as line 575 suggests)?
- Or is it a *separate capability* developed in Unit 11 and *called by* Unit 10?

**Evidence:**

The Unit 10 section (lines 568–579) lists Unit 11 as a dependency ("Depends on Phase B. Orchestration + codegen + Firestore push") but Unit 11's description (line 602) lists it as depending on Unit 9 (code generation), not the other way around. In fact, line 576 of Unit 10 says "If `--push`, run Firestore upload (Unit 11)" — but that's Unit 12, not Unit 11.

**Expected flow from text:**
```
Unit 10 orchestrator
  ├─ calls registerSeason() from Unit 11
  └─ calls pushSeasonToFirestore() from Unit 12
```

But the dependency declaration on line 562 lists only "Unit 7, Unit 9" — no mention of Unit 11.

**Implication for implementation:**

An implementer following Unit 10's approach (line 575) would write the registration logic inline or import a function. They'd then discover Unit 11 exists as a separate "auto-registration" feature and either:
- Duplicate work, or
- Realize Unit 11 should have been listed as a dependency of Unit 10

**Recommendation:**

Clarify one of two paths:

**Option A (Preferred — Cleaner Separation):**
- Unit 10 calls a function from Unit 11: "Call `registerSeason()` from Unit 11 to add the SEASONS entry"
- Update Unit 10 dependencies: `Unit 7, Unit 9, Unit 11`
- Reword Unit 10's pipeline step 5: "Register season in `src/data/seasons.ts` via Unit 11's `registerSeason()` helper"

**Option B (Simpler But Less Modular):**
- Merge Unit 11 into Unit 10: fold the auto-registration logic into `new-season.ts` directly
- Remove Unit 11 as a separate section
- Accept inline regex-based file manipulation in the orchestrator script

**Current state is:** Neither option — unit separation exists, but dependency flow is unclear.

---

### 3. CONTRADICTION: Firestore Push Responsibility

**Confidence:** MODERATE (0.65)

**Location:** Lines 575–576 vs. 662

**Issue:**

Unit 10 (new-season orchestrator) lists its pipeline step 6:
> "If `--push`, run Firestore upload (Unit 11)" (line 576)

But Unit 11 is described as "Seasons.ts auto-registration" (line 597–629), and Unit 12 is "Firestore push via Firebase Admin SDK" (line 630–667).

This is a straight reference error: the code comment should reference Unit 12, not Unit 11:
- Line 576 should read: "If `--push`, run Firestore upload (Unit 12)"

**Impact:**

Low — the implementation units are in the correct sequence and the description of Unit 12 is accurate. This is a labeling error, not a design contradiction. An implementer would see Unit 11 doesn't match the description and quickly find Unit 12.

**Recommendation:**

Change line 576 from:
```
6. If `--push`, run Firestore upload (Unit 11)
```

to:
```
6. If `--push`, run Firestore upload (Unit 12)
```

---

### 4. FORWARD REFERENCE AMBIGUITY: "Unit 7" vs. "Phase B Result"

**Confidence:** MODERATE (0.62)

**Location:** Lines 451–490 (Unit 7 description) and lines 520–538 (Unit 9 description)

**Issue:**

Unit 9 (codegen) states its dependency (line 526):
> "**Dependencies:** Unit 7 (needs scraped results JSON format finalized)"

But Unit 7's description (lines 451–490) does not explicitly commit to a specific JSON output format. It says:
> "Output to `data/scraped/season_N_results.json` with a `warnings` array for any data that couldn't be cleanly parsed." (line 473)

And the test scenario says:
> "Output JSON structure matches the types needed for codegen" (line 490)

However, Unit 9's approach (lines 532–537) assumes the following structure:
```typescript
generateEpisodeSection(episodes: ScrapedEpisode[], seasonNum: number): string
generateChallengeSection(challenges: ScrapedChallenge[], seasonNum: number): string
generateEliminationSection(eliminations: ScrapedElimination[], seasonNum: number): string
generateEventSection(events: ScrapedGameEvent[], seasonNum: number): string
```

The types `ScrapedEpisode`, `ScrapedChallenge`, `ScrapedElimination`, `ScrapedGameEvent` are mentioned as needing to be added to `scripts/lib/types.ts` (Unit 7, line 392), but:

1. The exact structure of these types is never defined in the plan
2. Unit 9 assumes they exist and are structured as arrays or records by episode
3. No specification of what fields each type contains

This creates a **silent contract**: Unit 7 must produce JSON that conforms to the structure Unit 9 expects, but Unit 9 does not specify what that structure is.

**Evidence:**

- Unit 7 verification (line 489): "Output JSON structure matches the types needed for codegen" ✓ (vague)
- Unit 9 test (line 545): "produces valid TypeScript matching the season_46 episode format" ✓ (assumes format exists)
- No specification of `ScrapedEpisode.field` or `ScrapedChallenge.field` anywhere

**Implication:**

Two developers, one on Unit 7 and one on Unit 9, could design incompatible JSON structures and not discover the mismatch until both units are implemented.

**Recommendation:**

Before Unit 7 and Unit 9 are implemented in parallel (which the plan allows), add a section to the plan defining the JSON schema. Place it in **Context & Research** or as a new **Data Format Specification** section:

```markdown
### Scraped Results JSON Format (Unit 7 Output)

Unit 7's `season_N_results.json` must conform to this structure:

\`\`\`typescript
interface ScrapeResultsOutput {
  warnings: string[];
  episodes: ScrapedEpisode[];
  challenges: ScrapedChallenge[];
  eliminations: ScrapedElimination[];
  events: ScrapedGameEvent[];
}

interface ScrapedEpisode {
  order: number;
  name: string;
  finale: boolean;
  post_merge: boolean;
  merge_occurs: boolean;
}

interface ScrapedChallenge {
  episode_num: number;
  winners: string[]; // player names
  variant: "reward" | "immunity" | "combined";
  winning_team_id: string | null;
}

// ... etc for eliminations and events
\`\`\`

Unit 9 codegen consumes this format directly.
```

---

## Non-Issues (Explicitly Out of Scope)

The following are **not** findings:

- **Missing content:** The plan defers service account key file location to implementation ("TBD") — this is appropriate for a plan.
- **Vague terms:** "Scraper failure," "partial scrape" — these are sufficiently clear in context.
- **Format style:** Header levels, bullet styles, markdown consistency — not in scope.
- **Feasibility concerns:** Whether the wiki templates are actually parseable, whether 3-season testing is enough — that's for a separate reviewer (technical feasibility).

---

## Summary of Findings

| # | Type | Severity | Confidence | Recommendation |
|---|------|----------|------------|-----------------|
| 1 | Structural (ungrouped requirements) | Medium | HIGH (0.82) | Regroup requirements by feature area; autofix class: auto |
| 2 | Terminology drift (register) | Low–Medium | MODERATE (0.68) | Clarify dependency flow between Unit 10 and Unit 11 |
| 3 | Forward reference error | Low | MODERATE (0.65) | Fix line 576: change "Unit 11" to "Unit 12" |
| 4 | Silent contract (JSON format) | Medium | MODERATE (0.62) | Define scraped JSON schema before Units 7 & 9 implementation |

---

## Files Involved

- `D:\Projects\survivor-fantasy-ui\docs\plans\2026-03-31-001-feat-results-scraper-season-bootstrap-watch-along-plan.md` (primary document)
- `D:\Projects\survivor-fantasy-ui\docs\brainstorms\2026-03-31-results-scraper-season-bootstrap-watch-along-requirements.md` (origin; consistent with plan)
- `D:\Projects\survivor-fantasy-ui\src\types\index.ts` (confirms `current_episode: number | null` exists)
- `D:\Projects\survivor-fantasy-ui\src\data\seasons.ts` (confirms registration format)
- `D:\Projects\survivor-fantasy-ui\src\pages\Draft.tsx` (confirms `current_episode: null` default)
