# Scoring Proposals: Frequency-Based Tweaks

Date: 2026-04-02

## Context

This document proposes targeted scoring adjustments based on event frequency data from
50 seasons of US Survivor (survivoR dataset, 917 castaway appearances). The goal is not
to overhaul the system but to refine it: reward rarity where it exists, and make rare
advantage plays feel like the meaningful moments they are.

For the full philosophy explanation, see [scoring-philosophy.md](./scoring-philosophy.md).
For the broader structural audit, see [scoring-audit-2026-04-01.md](./scoring-audit-2026-04-01.md).

## The Core Problem: The Flat Advantage Economy

Right now, every advantage in the game scores identically:

- **1 pt to find** (whether it's a Hidden Immunity Idol or a Knowledge is Power)
- **2 pts to play** (whether it's a common Extra Vote or a unicorn Idol Nullifier)

The frequency data tells a very different story about how rare these events actually are:

### Advantage Frequency Table (50 US Seasons)

| Advantage            | Times Found | Seasons Present | Per-Season Rate | Times Played |
| -------------------- | ----------- | --------------- | --------------- | ------------ |
| Hidden Immunity Idol | 195         | 37              | 5.3/season      | 120          |
| Extra Vote           | 16          | 10              | 1.6/season      | 12           |
| Amulet               | 9           | 3               | 3.0/season      | 4            |
| Challenge Advantage  | 8           | 5               | 1.6/season      | 8            |
| Steal a Vote         | 7           | 7               | 1.0/season      | 5            |
| Knowledge is Power   | 5           | 4               | 1.3/season      | 3            |
| Idol Nullifier       | 4           | 4               | 1.0/season      | 2            |
| Block a Vote         | 4           | 4               | 1.0/season      | 3            |
| Bank Your Vote       | 3           | 3               | 1.0/season      | 2            |
| Safety Without Power | 3           | 3               | 1.0/season      | 1            |
| Control the Vote     | 1           | 1               | ultra-rare      | 1            |

Finding a Hidden Immunity Idol (195 times across 37 seasons) currently earns the same
1 point as finding a Steal a Vote (7 times across 7 seasons). That's a **28x frequency
difference** for the same reward.

## Proposal 1: Tiered Advantage Scoring

### Tier 1 — Common (most seasons, multiple per season)

These are the bread and butter. Keep them at current values.

| Action          | Current | Proposed | Rationale                                                                        |
| --------------- | ------- | -------- | -------------------------------------------------------------------------------- |
| find_idol       | 1       | **1**    | 5.3/season — common, plus the votes_negated multiplier already rewards big plays |
| use_idol        | 2       | **2**    |                                                                                  |
| win_idol        | 1       | **1**    |                                                                                  |
| find_extra_vote | 1       | **1**    | 1.6/season across 10 seasons — most common non-idol advantage                    |
| use_extra_vote  | 2       | **2**    |                                                                                  |
| win_extra_vote  | 1       | **1**    |                                                                                  |

### Tier 2 — Uncommon (appeared in <10 seasons, ~1 per season when present)

These are meaningfully rarer than idols and Extra Votes. Finding one should feel more
rewarding. Playing one is a real strategic moment.

| Action                   | Current | Proposed | Rationale                                  |
| ------------------------ | ------- | -------- | ------------------------------------------ |
| find_steal_a_vote        | 1       | **2**    | 7 found in 7 seasons                       |
| use_steal_a_vote         | 2       | **3**    |                                            |
| win_steal_a_vote         | 1       | **2**    |                                            |
| find_block_a_vote        | 1       | **2**    | 4 found in 4 seasons                       |
| use_block_a_vote         | 2       | **3**    |                                            |
| win_block_a_vote         | 1       | **2**    |                                            |
| find_challenge_advantage | 1       | **2**    | 8 found in 5 seasons                       |
| find_amulet              | 1       | **2**    | 9 found in 3 seasons (always in sets of 3) |
| find_other_advantage     | 1       | **2**    | By definition rare/one-off                 |
| win_other_advantage      | 1       | **2**    |                                            |

### Tier 3 — Rare (appeared in <=4 seasons, truly unicorn events)

These are the unicorns. When someone plays one, it should feel like a big moment on
the scorecard. A Knowledge is Power play has happened 3 times in 50 seasons. An
Idol Nullifier has been played twice. These deserve to stand out.

| Action                    | Current | Proposed | Rationale             |
| ------------------------- | ------- | -------- | --------------------- |
| find_knowledge_is_power   | 1       | **2**    | 5 found in 4 seasons  |
| use_knowledge_is_power    | 2       | **4**    | 3 plays in 50 seasons |
| find_idol_nullifier       | 1       | **2**    | 4 found in 4 seasons  |
| use_idol_nullifier        | 2       | **4**    | 2 plays in 50 seasons |
| find_bank_your_vote       | 1       | **2**    | 3 found in 3 seasons  |
| use_bank_your_vote        | 2       | **4**    | 2 plays in 50 seasons |
| find_safety_without_power | 1       | **2**    | 3 found in 3 seasons  |
| use_safety_without_power  | 2       | **4**    | 1 play in 50 seasons  |
| find_control_the_vote     | 1       | **2**    | 1 found in 1 season   |
| use_control_the_vote      | 2       | **4**    | 1 play in 50 seasons  |

### Net Impact of Tiering

Under the current flat system, finding and playing a Knowledge is Power earns 3 pts total
(1 find + 2 use). Under tiered scoring, it earns 6 pts (2 find + 4 use). That's a
meaningful difference that reflects the rarity, but it's not so large that it dominates
a season. For context, winning 2 individual immunities also earns 4 pts (at current 2/win)
or 6 pts (at proposed 3/win).

An idol find + play with 4 negated votes still earns 7 pts (1+2+4) — unchanged, because
the votes_negated multiplier already handles idol impact scaling.

## Proposal 2: Bump Individual Immunity to 3 Points

### Current State

Individual immunity wins happen ~9 times per season, split among 5-8 different winners.
This is the most skill-correlated recurring event in the game.

Recent immunity win distributions:

| Season | Distribution                                            |
| ------ | ------------------------------------------------------- |
| S49    | Savannah (4), Sophie (2), Steven (1), Sophi (1)         |
| S48    | Joe (4), Kyle (2), Kamilla (2), David (1), Eva (1)      |
| S47    | Rachel (4), Kyle (4), Sue (1), Gabe (1), Genevieve (1)  |
| S46    | Maria (3), Kenzie (2), Charlie (2), Hunter (1), Ben (1) |
| S45    | Dee (3), Bruce (2), Austin (2), Kellie (1), Drew (1)    |

### Proposed Change

| Action   | Current | Proposed          |
| -------- | ------- | ----------------- |
| immunity | 2       | **3**             |
| reward   | 1       | **1** (unchanged) |

### Impact

A 4-immunity winner earns 12 pts from immunity alone (vs 8 currently). This makes
challenge beasts a more attractive draft pick and widens the gap between a castaway who
wins challenges and one who doesn't.

The reward/immunity gap grows from 1:2 to 1:3, which better reflects the strategic
weight difference — immunity is life in the game; a reward is a burger.

### Alternative: Immunity Streak Bonus

Instead of a flat bump, introduce a streak bonus: +1 extra point for each consecutive
immunity win beyond the first.

- Win 1: 2 pts (or 3 with the flat bump)
- Win 2 in a row: 2 + 3 = 5
- Win 3 in a row: 2 + 3 + 4 = 9
- Win 2, skip, win 1: 2 + 2 + 2 = 6

This specifically rewards dominant runs (like Rachel LaMont winning 4 straight) without
inflating the score for scattered wins. It's more complex to implement but more targeted.

## Proposal 3: Beware Advantage Rescoring

### Current State

Beware advantages have appeared in 3 seasons (S46, S48, S49). The three-stage lifecycle
scores 0.5 pts each for a 1.5 pt total. Given the risk involved (potentially losing
your vote until conditions are met), this undersells the drama.

### Proposed Change

| Action                   | Current | Proposed | Rationale                                 |
| ------------------------ | ------- | -------- | ----------------------------------------- |
| find_beware_advantage    | 0.5     | **1**    | Finding it is a real event                |
| accept_beware_advantage  | 0.5     | **1**    | Accepting the risk matters                |
| fulfill_beware_advantage | 0.5     | **2**    | Completing the gauntlet deserves the most |

Total lifecycle: 4 pts (up from 1.5 pts). Still modest, but the saga now feels
meaningful on the scorecard.

## Proposal 4: New Scorable Events to Consider

These are brainstorm ideas for future consideration, not hard recommendations. Each
would require data tracking that we may or may not currently support.

### 4a. "Survived Tribal" Bonus

**Concept:** 1 pt each time a castaway receives votes at tribal council but is NOT
eliminated.

**Why it's interesting:** Rewards "target but safe" players — the strategic masterminds
who are always in the crosshairs but keep surviving. This is a common Survivor archetype
that the current system doesn't directly reward.

**Data availability:** survivoR's `vote_history` table tracks every vote cast and whether
it was the final vote. This is computable.

**Concern:** Could create a lot of points in seasons with many split votes or revotes.
May need a cap (e.g., max 1 pt per tribal council per player).

### 4b. Idol Played for Someone Else

**Concept:** 3 pts for playing an idol on another player (vs 2 pts for self-play).

**Why it's interesting:** Playing an idol for someone else is rarer, riskier, and more
dramatic. It shows strategic awareness and social capital. The current system treats
all idol plays identically.

**Data availability:** survivoR tracks who played the idol and who it protected.

### 4c. Advantage Stolen From

**Concept:** -1 pt when your advantage is stolen via Knowledge is Power or similar.

**Why it's interesting:** Makes Knowledge is Power plays feel consequential from both
sides. Creates a risk dimension for advantage-holding that currently doesn't exist in
scoring.

**Concern:** Penalizing something outside the player's control is philosophically
questionable. This might be better as a prop bet ("Will anyone lose an advantage to
KIP?") than a direct scoring event.

### 4d. Jury Member Bonus

**Concept:** 1 pt for making the jury.

**Why it's interesting:** Creates a milestone between merge (2 pts) and FTC (4 pts).
~7-8 players make the jury each season. Currently, surviving past the merge is rewarded
only by the rising elimination episode points — there's no discrete "you made the jury"
bonus.

**Concern:** Minimal. This is simple to implement and easy to explain.

## Proposal 5: Keep These Values As-Is

Some parts of the current system are well-calibrated and should not change:

| Action                              | Value         | Why It Works                                                 |
| ----------------------------------- | ------------- | ------------------------------------------------------------ |
| win_survivor                        | 20            | Team simulations show this is balanced (see philosophy doc)  |
| votes_negated_by_idol               | 1x multiplier | Elegant — naturally rewards high-stakes plays                |
| eliminated                          | ep_num        | The survival floor is the backbone of the system             |
| make_merge                          | 2             | Right-sized for ~50% of cast reaching it                     |
| make_final_tribal_council           | 4             | Appropriate gap above merge                                  |
| go_on_journey                       | 0.5           | Correctly low — it's a boat ride                             |
| use_shot_in_the_dark_successfully   | 6             | Rarest event in the game — lottery-ticket pricing is correct |
| use_shot_in_the_dark_unsuccessfully | 1             | Nice flavor award                                            |
| medically_evacuated                 | 5             | Consolation prize works at this level                        |
| quitter                             | -2            | Mild penalty is appropriate                                  |

## Summary of All Proposed Changes

| Action                           | Current | Proposed      | Change |
| -------------------------------- | ------- | ------------- | ------ |
| **Challenges**                   |         |               |        |
| immunity                         | 2       | **3**         | +1     |
| **Tier 2 Advantages (Uncommon)** |         |               |        |
| find_steal_a_vote                | 1       | **2**         | +1     |
| use_steal_a_vote                 | 2       | **3**         | +1     |
| win_steal_a_vote                 | 1       | **2**         | +1     |
| find_block_a_vote                | 1       | **2**         | +1     |
| use_block_a_vote                 | 2       | **3**         | +1     |
| win_block_a_vote                 | 1       | **2**         | +1     |
| find_challenge_advantage         | 1       | **2**         | +1     |
| find_amulet                      | 1       | **2**         | +1     |
| find_other_advantage             | 1       | **2**         | +1     |
| win_other_advantage              | 1       | **2**         | +1     |
| **Tier 3 Advantages (Rare)**     |         |               |        |
| find_knowledge_is_power          | 1       | **2**         | +1     |
| use_knowledge_is_power           | 2       | **4**         | +2     |
| find_idol_nullifier              | 1       | **2**         | +1     |
| use_idol_nullifier               | 2       | **4**         | +2     |
| find_bank_your_vote              | 1       | **2**         | +1     |
| use_bank_your_vote               | 2       | **4**         | +2     |
| find_safety_without_power        | 1       | **2**         | +1     |
| use_safety_without_power         | 2       | **4**         | +2     |
| find_control_the_vote            | 1       | **2**         | +1     |
| use_control_the_vote             | 2       | **4**         | +2     |
| **Beware Advantage**             |         |               |        |
| find_beware_advantage            | 0.5     | **1**         | +0.5   |
| accept_beware_advantage          | 0.5     | **1**         | +0.5   |
| fulfill_beware_advantage         | 0.5     | **2**         | +1.5   |
| **Everything Else**              |         |               |        |
| (all other actions)              | —       | **unchanged** | —      |

## Data Sources

All frequency analysis computed from the [survivoR R dataset](https://github.com/doehm/survivoR)
covering US Seasons 1-50 (917 castaway appearances, 195 idol finds, 167 advantage plays).
Team simulations used survivoR challenge_results, advantage_movement, and castaways tables
joined on season and castaway_id.
