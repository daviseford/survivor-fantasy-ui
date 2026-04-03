# Scoring System Philosophy

Date: 2026-04-02

## Purpose

This document explains the design philosophy behind the Survivor Fantasy scoring system.
It is intended as source material for an article explaining how and why the scoring works
the way it does.

## Design Goals

1. **A strong roster can win without the Sole Survivor.** A user who drafts five solid
   players should be able to beat a user who has the winner but a weaker supporting cast.
2. **The winner is still a powerful force.** A mediocre roster with the winner should be
   in contention — competitive in most seasons, never out of the running.
3. **Prop bets reward knowledge and prediction.** You can't control when your survivors go
   home, but you can control your prop bets. Prop bets are where player skill matters most.
4. **The system should be understandable.** A new player should be able to read the scoring
   table and immediately grasp why certain events matter more than others.

## The Three Pillars of Scoring

### Pillar 1: Survivor Points

Points earned by the castaways on your roster, summed across the season. This is the core
engine that rewards drafting well.

| Category   | Action                     | Points         | Notes                              |
| ---------- | -------------------------- | -------------- | ---------------------------------- |
| Challenges | Reward win                 | 1              | Individual wins only (post-merge)  |
| Challenges | Immunity win               | 2              | Individual wins only (post-merge)  |
| Milestones | Eliminated                 | episode_num    | 1 pt per episode survived          |
| Milestones | Make merge                 | 2              | ~8-10 players per season           |
| Milestones | Make FTC                   | 4              | 3 players per season               |
| Milestones | Win Survivor               | 20             | 1 player per season                |
| Milestones | Medical evacuation         | 5              | Consolation for losing your player |
| Milestones | Quitter                    | -2             | Penalty for giving up              |
| Idols      | Find idol                  | 1              |                                    |
| Idols      | Play idol                  | 2              |                                    |
| Idols      | Votes negated              | 1 x multiplier | Bonus per vote nullified           |
| Idols      | Find/use idol nullifier    | 1 / 2          |                                    |
| Advantages | Find any advantage         | 1              | Flat across all types              |
| Advantages | Use any advantage          | 2              | Flat across all types              |
| Other      | Journey                    | 0.5            | Participation credit               |
| Other      | Beware find/accept/fulfill | 0.5 each       |                                    |
| Other      | SITD unsuccessful          | 1              | "It was worth a shot"              |
| Other      | SITD successful            | 6              | Lottery-ticket moment              |

### Pillar 2: Prop Bets

Pre-season predictions made during the draft. These are separate from roster scoring and
reward knowledge of the cast, the show's patterns, and gut instinct.

| Prop Bet                   | Points | Difficulty            |
| -------------------------- | ------ | --------------------- |
| Season winner              | 8      | Very hard (1/18 odds) |
| FTC finalist               | 5      | Hard (3/18 odds)      |
| First eliminated           | 4      | Hard (1/18 odds)      |
| Most post-merge immunities | 5      | Medium                |
| Most idol finds            | 4      | Medium-hard           |
| First idol found           | 4      | Hard                  |
| First successful idol play | 4      | Hard                  |
| Medical evacuation Y/N     | 2      | ~50/50 historically   |
| SITD success Y/N           | 3      | ~50/50 historically   |
| Most post-merge rewards    | 3      | Medium                |
| Quit Y/N                   | 2      | ~50/50 historically   |
| **Total possible**         | **44** |                       |

### Pillar 3: The Draft

The draft determines your roster. In a typical season with 18 castaways and 4-6 players
drafting, each user gets 3-5 castaways. The draft order (snake draft) creates natural
tension: do you take the obvious challenge beast first, or gamble on the strategic
under-the-radar player who might go deep?

## How the Pieces Fit Together

### Longevity Is King

The `eliminated = episode_number` rule is the backbone of the system. A castaway eliminated
in Episode 13 earns 13 points just for surviving. An Episode 1 boot earns 1 point. This
creates a natural "survival floor" where even boring, under-the-radar players who last
deep into the game earn solid points without doing anything flashy.

This is intentional. In real Survivor, the most valuable players are often not the flashiest
ones — they're the ones who stick around. The scoring reflects this: a player who makes
the finale without winning a single challenge still contributes meaningfully to your team.

### The Winner Bonus Is a Nuclear Bomb

At 20 points, `win_survivor` is the single largest point event in the game. Combined with
a typical winner's other points (elimination ~13-14, merge 2, FTC 4, plus challenge wins),
a winner typically scores **40-54 points total** — roughly 35-50% of a 5-player team's
final score.

This is massive by design. Drafting the winner should feel like a huge advantage. But it
should not be an automatic win — and the data shows it isn't.

### Balance Proof: Team Simulations

Using survivoR data from the last 5 completed seasons, we simulated 5-player team
matchups:

| Season | Best 5 (no winner) | Mediocre 4 + Winner | Worst 4 + Winner |
| ------ | ------------------ | ------------------- | ---------------- |
| S45    | **110 pts**        | 93 pts              | 57 pts           |
| S46    | **101 pts**        | 92 pts              | 55 pts           |
| S47    | 109 pts            | **116 pts**         | 64 pts           |
| S48    | **111 pts**        | 100 pts             | 61 pts           |
| S49    | **106 pts**        | 105 pts             | 61 pts           |

Key findings:

- **A strong roster without the winner beats a mediocre roster with the winner in 4 out of
  5 recent seasons.** This confirms the system's core design goal.
- **A mediocre roster with the winner is always competitive.** The gap is tight enough
  (5-18 pts) that prop bets could swing the result. This is exactly where the winner
  should land — powerful but not deterministic.
- **A weak roster with the winner always loses badly.** 55-64 pts vs 100-111 pts. The
  winner bonus cannot compensate for a terrible draft.
- **The exception (S47) was Rachel LaMont**, who won 4 individual immunities AND the
  game. Dominant winners who are also challenge beasts create the most lopsided outcomes.

### Challenges Are Steady Income

Immunity at 2 pts and reward at 1 pt are modest but accumulate. The immunity challenge
beast is a real Survivor archetype, and recent seasons show concentrated distributions:

| Season | Immunity Winners                                   |
| ------ | -------------------------------------------------- |
| S47    | Rachel LaMont (4), Kyle Ostwald (4)                |
| S48    | Joe Hunter (4), Kyle Fraser (2), Kamilla (2)       |
| S49    | Savannah Louie (4), Sophie (2)                     |
| S46    | Maria Shrime Gonzalez (3), Kenzie (2), Charlie (2) |
| S45    | Dee Valladares (3), Bruce (2), Austin (2)          |

A 4-immunity winner earns 8 bonus points — meaningful but not game-breaking. Combined
with the elimination floor and merge/FTC milestones, challenge performance creates a
useful point spread that rewards drafting athletic, competitive castaways.

### The Flat Advantage Economy

Currently every advantage — from a Hidden Immunity Idol to a Steal a Vote to a
Knowledge is Power — scores identically: 1 pt to find, 2 pts to play. This is the
simplest possible design and the easiest to explain. It means advantage scoring never
requires looking up a special table.

The one exception is the `votes_negated_by_idol` multiplier: when an idol negates votes,
you earn 1 pt per vote negated on top of the 2-pt play bonus. A big idol play that
negates 5 votes earns 7 total points (1 find + 2 play + 4 negated) — this naturally
rewards high-stakes plays more than throwaway ones.

### Prop Bets Are the Great Equalizer

At 44 total possible points, prop bets represent **30-40% of a typical team's final
score.** This is not an accident. Prop bets are the primary mechanism for rewarding
player knowledge and prediction skill over draft luck.

You can't control when your survivors go home. You can't control whether they win
challenges. But you can study the cast, read pre-season press, and make informed
predictions. A savvy user who correctly predicts first boot (4 pts), most immunities
(5 pts), a med evac (2 pts), and SITD outcome (3 pts) picks up 14 points from
prediction skill alone.

This is why prop bets are often more fun than the draft itself. The draft is a gamble.
Prop bets are where you prove you know the show.

### The Special Cases

**Medical evacuation (5 pts):** A consolation prize. Your player got hurt and left the
game through no fault of their own. 5 sympathy points soften the blow of losing a
roster spot mid-season. Med evacs happen in ~28% of seasons.

**Quitter (-2 pts):** The only negative-value event. If your player quits, you lose 2
points on top of losing the roster spot. Quitters happen in ~28% of seasons. The
penalty is mild because you already lose all future production from that player.

**Successful Shot in the Dark (6 pts):** The rarest scorable event in the game. A
successful SITD has happened approximately 2-3 times in the show's history. The
1-in-6 odds, combined with the courage to give up your vote for the gamble, makes
this a genuine lottery-ticket moment. 6 points reflects the drama and rarity. The
unsuccessful version at 1 pt is a flavor award — "it was worth a shot."

**Journey (0.5 pts):** Participation credit. You went on a boat ride. The real value
of a journey is the advantage you might win, which is scored separately. ~8.6
journeys per season in the new era (S41+).

**Beware advantages (0.5 pts each stage):** A three-part saga: find it, accept it,
fulfill the conditions. At 1.5 pts total for the full lifecycle, this is modest.
Beware advantages have only appeared in 3 seasons so far.

## Data Sources

All frequency analysis in this document was computed from the
[survivoR R dataset](https://github.com/doehm/survivoR) covering US Seasons 1-50
(917 castaway appearances). Winner point estimates include elimination points,
challenge wins, idol activity, and milestone bonuses computed under the current
scoring rules.
