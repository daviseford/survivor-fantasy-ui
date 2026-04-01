# Scoring Audit and Proposal

Date: 2026-04-01

## Scope

Reviewed:

- Current base scoring table in `src/data/scoring.ts`
- Scoring engine in `src/utils/scoringUtils.ts`
- Current prop bets in `src/data/propbets.ts`
- Recent season data in `src/data/season_48/index.ts`, `src/data/season_49/index.ts`, and `src/data/season_50/index.ts`

## Executive Summary

The current system is not broken in the exact way the `win_survivor: 20` number suggests. In Seasons 48 and 49, the winner bonus only created an 8 to 9.5 point gap over the second-highest scorer, and both winners ranked 5th by points before the title bonus was added.

The bigger issues are:

1. Team challenge wins are overrepresented and mostly reward tribe strength instead of individual performance.
2. Non-game exits are rewarded. Medical evacuations and quitters currently receive bonus points.
3. Several low-signal lifecycle events create noise more than meaningful differentiation.
4. There are duplicate event records in season data that materially distort results.
5. Prop bets are too top-heavy. Current prop bets can swing standings almost as much as roster play.

My recommendation is:

- Keep the winner meaningful, but reduce the title spike.
- Reduce team-challenge inflation.
- Flatten and simplify low-signal event scoring.
- Treat prop bets as a side game, not a second scoring system.

## What the Current System Is Doing

### Current point values

- `reward`: 1
- `immunity`: 2
- `make_merge`: 2
- `make_final_tribal_council`: 4
- `win_survivor`: 20
- `eliminated`: episode number
- most find events: 1
- most use events: 2
- `go_on_journey`: 0.5
- beware lifecycle steps: 0.5 each
- successful `shot_in_the_dark`: 6
- medical evacuation bonus: 5
- quitter bonus: 3

### Recent season scoring shares

Across Seasons 48 and 49:

- `immunity` was about 27 to 31 percent of the total score pool
- `reward` was about 17 to 18 percent
- `eliminations` were about 29 percent
- `milestones` were only about 12 percent
- `idols and advantages` were about 8 to 10 percent

That means challenge results plus elimination placement are doing most of the work already.

### Winner impact in practice

Recent actual results:

- Season 48: winner scored 54.5, second place scorer scored 46.5, margin 8
- Season 49: winner scored 56, second place scorer scored 46.5, margin 9.5
- In both seasons, the winner ranked 5th without the `win_survivor` bonus

So the title is meaningful, but not completely warping the season by itself.

## Audit Findings

### 1. Medical evacuations and quitters are rewarded

This is the clearest scoring-design problem.

Current logic gives:

- elimination points based on episode number
- plus `medically_evacuated: 5`
- plus `quitter: 3`

Examples:

- Season 49 Jake: medical evacuation in Episode 3, total season score 8.5
- Season 50 Kyle: medical evacuation in Episode 1, total season score 9

A player leaving the game outside normal play should not receive a bonus. At most this should be neutral. I would score both at `0` additional points, or even apply a negative modifier to quitting.

### 2. Duplicate events are inflating scores

Duplicate event signatures exist in recent data:

- Season 48
  - `use_idol` duplicated for Eva in Episode 13
  - `use_extra_vote` duplicated for Kyle in Episode 4
  - `use_shot_in_the_dark_successfully` recorded four times for Mary in Episode 3
- Season 49
  - `use_bank_your_vote` duplicated for Savannah in Episode 10
  - `use_block_a_vote` duplicated for Steven in Episode 12

Material impact:

- Mary drops from 46.5 to 28.5 if duplicate events are deduped
- Eva drops from 46.5 to 44.5
- Kyle drops from 54.5 to 52.5
- Steven drops from 46.5 to 44.5
- Savannah drops from 56 to 54

This needs a data cleanup pass and likely a guardrail in scoring or admin tooling.

### 3. Team challenge wins are too large a share of the pool

Pre-merge tribe challenge wins create a lot of points for many castaways at once. That rewards tribe draw and swap fortune more than player quality.

This is the biggest reason a roster can feel good or bad before the strategic game even starts.

### 4. Some new event types are low-signal bookkeeping

These are fine as flavor, but they should not matter much:

- `go_on_journey`
- `find_beware_advantage`
- `accept_beware_advantage`
- `fulfill_beware_advantage`

They are often production-structure events rather than actual player accomplishment.

### 5. Successful Shot in the Dark is overvalued

Even without the duplicate-data issue, `use_shot_in_the_dark_successfully: 6` is a very large spike for a rare event driven partly by variance.

It should feel exciting, but it should not rival a major endgame milestone.

### 6. Current prop bets are too swingy

Current prop bet maximum is 60 points:

- winner 20
- FTC 13
- first vote 9
- idols 7
- immunities 7
- medevac 4

That is too much for a side game. A player can lose the draft and still stay alive on prop-bet spikes.

## Recommended Scoring Model

## Design goals

1. A strong roster should beat a weak roster with the winner.
2. The winner should still matter and feel special.
3. Team luck should matter less than individual accomplishment.
4. Low-signal production events should not decide matchups.
5. The scoring system should be understandable without a giant cheat sheet.

## Recommended values

### Challenges

- Team reward win: `0.5`
- Individual reward win: `1`
- Team immunity win: `1`
- Individual immunity win: `3`

Implementation note:

- You can infer team vs individual from `winning_castaways.length`
- `1` or `2` winners = individual or paired individual
- larger groups = team challenge

### Idols and advantages

- Find idol or named advantage: `1`
- Win idol or advantage from journey or challenge: `1`
- Use idol or advantage: `2`
- Votes negated by idol: `+1` each, cap at `3`

### Low-signal production events

- Go on journey: `0`
- Find beware advantage: `0`
- Accept beware advantage: `0.5`
- Fulfill beware advantage: `1`
- Complete sweat or savvy: `1`

This keeps the story of the season visible without letting bookkeeping dominate scoring.

### Milestones and placement

- Make merge: `3`
- Make Final Tribal Council: `6`
- Win Survivor: `12`
- Elimination placement: `1` to `6`, capped by phase instead of episode number

Recommended elimination placement scale:

- Episodes 1-2: `1`
- Episodes 3-4: `2`
- Episodes 5-6: `3`
- Episodes 7-8: `4`
- Episodes 9-10: `5`
- Episodes 11+ and finale non-FTC boots: `6`
- Final Tribal losers: `6`

This does two things:

- survival still matters
- late boots stop accumulating huge passive totals just because the season has many episodes

### Special exits

- Medical evacuation: `0` additional points
- Quitter: `-2` additional points, or `0` if you want to avoid negative scoring

### Shot in the Dark

- Unsuccessful: `0`
- Successful: `4`

## Why this works better

Compared with the current system:

- the winner remains powerful through `FTC + winner = 18`
- a losing finalist still scores well, but no longer gets almost the same placement value as the winner
- team challenge inflation drops substantially
- random production twists matter less
- a balanced six-player roster becomes more important than one champion plus dead weight

## If You Want an Even Simpler Version

If you want the smallest possible change set:

- `win_survivor`: change from `20` to `14`
- `medically_evacuated`: change from `5` to `0`
- `quitter`: change from `3` to `0` or `-2`
- `go_on_journey`: change from `0.5` to `0`
- `find_beware_advantage`: change from `0.5` to `0`
- `accept_beware_advantage`: keep at `0.5`
- `fulfill_beware_advantage`: keep at `1`
- `use_shot_in_the_dark_successfully`: change from `6` to `4`
- dedupe existing events

That would already improve the system a lot without rewriting the scoring engine.

## Prop Bet Recommendations

## Principle

Prop bets should be bonus texture, not the main standings engine.

I recommend:

- total prop-bet ceiling around `20` to `28`
- no single prop bet worth more than `8`
- avoid stacking both `winner` and `FTC` at huge values

## Recommended evergreen prop bets

These should work most seasons.

- `Season winner` - `8`
- `One FTC finalist` - `5`
- `First boot` - `4`
- `Most individual immunity wins` - `5`
- `Most idol finds` - `4`
- `Will there be a medical evacuation?` - `2`

Notes:

- `Most immunities` should count post-merge individual immunities, not all immunity wins
- `Most idol finds` should stay as actual idol finds unless you explicitly rename it to `most advantages gained`

## Good new evergreen prop bets

- `First idol found` - `4`
- `First successful idol play` - `4`
- `Will anyone successfully play Shot in the Dark?` - `3`
- `Who will be the last pre-merge boot?` - `4`
- `Who will win the most reward challenges after the merge?` - `3`
- `Will there be a quit?` - `2`

These are better than adding more giant endgame bets because they diversify the season timeline.

## Season-specific prop bets

These should only appear when the season format supports them.

### New-era journey seasons

- `Who will go on the most journeys?` - `3`
- `Who will win the most journey advantages?` - `3`
- `Who will be first to lose their vote?` - `3`

### Beware-advantage seasons

- `Who will find the first beware advantage?` - `3`
- `Who will successfully complete a beware advantage first?` - `3`

### Shot in the Dark seasons

- `Will a Shot in the Dark save someone this season?` - `3`
- `Who will play the first Shot in the Dark?` - `3`

### Seasons with obvious structural twists

- earn-the-merge season:
  - `Who will win Earn the Merge?` - `3`
- split-tribal or double-boot season:
  - `Will there be a double elimination episode?` - `2`
- returnee-heavy or legends season:
  - `Who will be the highest-finishing previous finalist?` - `4`

## Prop bets I would remove or downgrade

- `Winner` at `20` is too high
- `FTC` at `13` is too high
- `Medical evacuation` is fine only as a very low-value yes/no bet
- `Most immunities` is misleading if it counts pre-merge tribe immunities

## Implementation Suggestions

## Near-term

1. Dedupe season event records.
2. Remove bonus scoring for medical evacuations and quitters.
3. Reduce or zero out `journey` and `beware` bookkeeping points.
4. Lower prop bet totals.

## Medium-term

1. Split challenge scoring into team vs individual.
2. Replace elimination-as-episode-number with a capped placement ladder.
3. Update `propbet_immunities` to count only individual immunity wins.

## Nice-to-have

1. Add event-validation in admin tools to detect duplicate event signatures.
2. Add a scoring sandbox page where you can compare standings under different weights before changing production rules.

## Recommendation

If you want one balanced version to move forward with, I would choose:

- team reward `0.5`
- individual reward `1`
- team immunity `1`
- individual immunity `3`
- find or win any advantage `1`
- use any advantage `2`
- journey `0`
- beware accept `0.5`
- beware fulfill `1`
- merge `3`
- FTC `6`
- winner `12`
- elimination placement capped at `6`
- medevac `0`
- quitter `-2` or `0`
- successful SITD `4`

That keeps the winner important, but shifts the season back toward overall roster quality.
