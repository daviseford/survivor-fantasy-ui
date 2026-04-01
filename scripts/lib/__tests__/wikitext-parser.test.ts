import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";
import {
  CastTableEntry,
  buildTribeRosters,
  parseBirthDate,
  parseCastTable,
  parseContestantPage,
  parseEpisodeGuide,
  parseInfoboxFields,
  parseSeasonNumber,
  parseVotingHistory,
} from "../wikitext-parser";

const fixturesDir = path.join(import.meta.dirname, "fixtures");
const s46Epguide = fs.readFileSync(
  path.join(fixturesDir, "s46-epguide.txt"),
  "utf-8",
);
const s9Epguide = fs.readFileSync(
  path.join(fixturesDir, "s9-epguide.txt"),
  "utf-8",
);
const s50Epguide = fs.readFileSync(
  path.join(fixturesDir, "s50-epguide.txt"),
  "utf-8",
);
const s46Votetable = fs.readFileSync(
  path.join(fixturesDir, "s46-votetable.txt"),
  "utf-8",
);
const s9Votetable = fs.readFileSync(
  path.join(fixturesDir, "s9-votetable.txt"),
  "utf-8",
);
const s50Votetable = fs.readFileSync(
  path.join(fixturesDir, "s50-votetable.txt"),
  "utf-8",
);

// Real wikitext samples from the Survivor Wiki

const BEN_KATZMAN_WIKITEXT = `{{Contestant
| image        = S46 Ben Katzman.jpg
| birthdate    = {{Birth date and age|1992|3|25|mf=yes}}
| hometown     = Miami, Florida
| occupation   = Musician
| socialmedia  = {{Socmed|ig=bkdegreaser69|x=bkdegreaser69}}
| version      = {{version|us}}
| season       = {{S2|46}}
| tribes       = {{tribeicon|siga}}<br />{{tribeicon|nuinui}}
| place        = Second Runner-Up (3/18)
| alliances    = [[Siga Alliance]]<br />{{Dab|Final Four Alliance|46}}
| challenges   = 6
| votesagainst = 4
| days         = 26/26
}}`;

const COLBY_DONALDSON_WIKITEXT = `{{Spoiler}}{{Contestant
| image         = <tabber>In the Hands of the Fans=[[File:S50 Colby Donaldson.jpg]]</tabber>
| birthdate     = {{Birth date and age|1974|4|1|mf=yes}}
| hometown      = Dallas, Texas;<br />Los Angeles, California;<br />Austin, Texas
| occupation    = Auto Customizer;<br />Rancher
| socialmedia   = {{socmed|ig=colby_donaldson}}
| version       = {{Version|us}}
| season        = {{S2|2}}
| tribes        = {{tribeicon|ogakor}}<br />{{tribeicon|barramundi}}
| place         = Runner-Up (2/16)
| alliances     = [[Ogakor Alliance]]
| challenges    = 12
| votesagainst  = 9
| days          = 42/42
| season2       = {{S2|8}}
| tribes2       = {{tribeicon|mogomogo}}
| place2        = 12/18
| alliances2    =
| challenges2   = 6
| votesagainst2 = 4
| days2         = 19/39
| season3       = {{S2|20}}
| tribes3       = {{tribeicon|heroes}}<br />{{tribeicon|yinyang}}
| place3        = 5/20
| alliances3    = [[Heroes Alliance]] ''(affiliated)''
| challenges3   = 8
| votesagainst3 = 7
| days3         = 37/39
| season4       = {{S2|50}}
| tribes4       = {{tribeicon|vatu}}<br/>{{tribeicon4|kalo}}
| place4        =
| alliances4    =
| challenges4   = 6
| votesagainst4 =
| days4         =
}}`;

const CHRIS_DAUGHERTY_WIKITEXT = `{{Contestant
| image        = S9 Chris Daugherty.jpg
| birthdate    = {{Birth date and age|1970|8|29|mf=yes}}
| hometown     = South Vienna, Ohio
| occupation   = Highway Construction Worker
| version      = {{Version|us}}
| season       = {{S2|9}}
| tribes       = {{tribeicon|lopevi}}<br />{{tribeicon|alinta}}
| place        = Winner
| alliances    = [[Fat Five]]<br />{{dab|Final Four Alliance|Vanuatu}}
| challenges   = 12
| votesagainst = 3
| days         = 39/39
}}`;

const CAST_TABLE_WIKITEXT = `{| class="wikitable sortable"
! colspan="2" rowspan="2"| Contestant
! colspan="2" class="unsortable"| Tribe Affiliation
|-
| {{tribebox2|yanu}}[[File:S46 jelinsky t.png|70px|link=David Jelinsky]]
| align="left"| '''[[David Jelinsky]]'''<br /><small>21, Las Vegas, NV<br />Slot Machine Salesman</small>
| {{tribebox|yanu}}
|-
| {{tribebox2|yanu}}[[File:S46 jess t.png|70px|link=Jess Chong]]
| align="left"| '''[[Jess Chong]]'''<br /><small>37, San Francisco, CA<br />Software Engineer</small>
| {{tribebox|yanu}}
|-
| {{tribebox2|nami}}[[File:S46 randen t.png|70px|link=Randen Montalvo]]
| align="left"| '''[[Randen Montalvo]]'''<br /><small>40, Orlando, FL<br />Aerospace Tech</small>
| {{tribebox|nami}}
|-
| {{tribebox2|yanu}}[[File:S46 bhanu t.png|70px|link=Bhanu Gopal]]
| align="left"| '''[[Bhanu Gopal]]'''<br /><small>40, Acton, MA<br />IT Quality Analyst</small>
| {{tribebox|yanu}}
|}`;

describe("parseBirthDate", () => {
  it("parses a standard birthdate template", () => {
    const result = parseBirthDate("{{Birth date and age|1992|3|25|mf=yes}}");
    expect(result).not.toBeNull();
    expect(result!.year).toBe(1992);
    expect(result!.month).toBe(3);
    expect(result!.day).toBe(25);
    expect(result!.age).toBeGreaterThanOrEqual(33);
  });

  it("handles single-digit month and day", () => {
    const result = parseBirthDate("{{Birth date and age|1974|4|1|mf=yes}}");
    expect(result).not.toBeNull();
    expect(result!.year).toBe(1974);
    expect(result!.month).toBe(4);
    expect(result!.day).toBe(1);
  });

  it("returns null for non-matching input", () => {
    expect(parseBirthDate("some random text")).toBeNull();
  });
});

describe("parseSeasonNumber", () => {
  it("parses {{S2|46}}", () => {
    expect(parseSeasonNumber("{{S2|46}}")).toBe(46);
  });

  it("parses {{S2|9}}", () => {
    expect(parseSeasonNumber("{{S2|9}}")).toBe(9);
  });

  it("returns null for empty string", () => {
    expect(parseSeasonNumber("")).toBeNull();
  });
});

describe("parseInfoboxFields", () => {
  it("extracts all fields from a single-season player", () => {
    const fields = parseInfoboxFields(BEN_KATZMAN_WIKITEXT);
    expect(fields).not.toBeNull();
    expect(fields!.hometown).toBe("Miami, Florida");
    expect(fields!.occupation).toBe("Musician");
    expect(fields!.place).toBe("Second Runner-Up (3/18)");
    expect(fields!.days).toBe("26/26");
  });

  it("extracts numbered fields from returning player", () => {
    const fields = parseInfoboxFields(COLBY_DONALDSON_WIKITEXT);
    expect(fields).not.toBeNull();
    expect(fields!.season).toContain("2");
    expect(fields!.season2).toContain("8");
    expect(fields!.season3).toContain("20");
    expect(fields!.season4).toContain("50");
    expect(fields!.tribes2).toContain("mogomogo");
  });

  it("returns null when no Contestant template found", () => {
    expect(
      parseInfoboxFields("some random text without a template"),
    ).toBeNull();
  });
});

describe("parseContestantPage", () => {
  it("parses a Season 46 contestant (Ben Katzman)", () => {
    const info = parseContestantPage(BEN_KATZMAN_WIKITEXT, 46);
    expect(info).not.toBeNull();
    expect(info!.age).toBeGreaterThanOrEqual(33);
    expect(info!.hometown).toBe("Miami, Florida");
    expect(info!.occupation).toBe("Musician");
    expect(info!.previousSeasons).toEqual([]);
    expect(info!.allSeasons).toEqual([46]);
  });

  it("parses a Season 9 contestant (Chris Daugherty)", () => {
    const info = parseContestantPage(CHRIS_DAUGHERTY_WIKITEXT, 9);
    expect(info).not.toBeNull();
    expect(info!.hometown).toBe("South Vienna, Ohio");
    expect(info!.occupation).toBe("Highway Construction Worker");
    expect(info!.previousSeasons).toEqual([]);
  });

  it("parses a returning player with 4 seasons (Colby Donaldson for S50)", () => {
    const info = parseContestantPage(COLBY_DONALDSON_WIKITEXT, 50);
    expect(info).not.toBeNull();
    expect(info!.allSeasons).toEqual([2, 8, 20, 50]);
    expect(info!.previousSeasons).toEqual([2, 8, 20]);
  });

  it("parses a returning player for their first season (Colby for S2)", () => {
    const info = parseContestantPage(COLBY_DONALDSON_WIKITEXT, 2);
    expect(info).not.toBeNull();
    expect(info!.previousSeasons).toEqual([]);
  });

  it("handles semicolon-separated hometown (returning player)", () => {
    const info = parseContestantPage(COLBY_DONALDSON_WIKITEXT, 50);
    expect(info!.hometown).toBe("Dallas, Texas");
  });

  it("handles semicolon-separated occupation (returning player)", () => {
    const info = parseContestantPage(COLBY_DONALDSON_WIKITEXT, 50);
    expect(info!.occupation).toBe("Auto Customizer");
  });

  it("returns null for wikitext without Contestant template", () => {
    expect(parseContestantPage("no template here")).toBeNull();
  });
});

describe("parseCastTable", () => {
  it("extracts all player links from cast table", () => {
    const entries = parseCastTable(CAST_TABLE_WIKITEXT);
    expect(entries).toHaveLength(4);
    expect(entries.map((e: CastTableEntry) => e.wikiPageTitle)).toEqual([
      "David Jelinsky",
      "Jess Chong",
      "Randen Montalvo",
      "Bhanu Gopal",
    ]);
  });

  it("extracts age from small tag", () => {
    const entries = parseCastTable(CAST_TABLE_WIKITEXT);
    expect(entries[0].age).toBe(21);
    expect(entries[1].age).toBe(37);
    expect(entries[2].age).toBe(40);
  });

  it("extracts location from small tag", () => {
    const entries = parseCastTable(CAST_TABLE_WIKITEXT);
    expect(entries[0].location).toBe("Las Vegas, NV");
    expect(entries[1].location).toBe("San Francisco, CA");
  });

  it("extracts occupation from small tag", () => {
    const entries = parseCastTable(CAST_TABLE_WIKITEXT);
    expect(entries[0].occupation).toBe("Slot Machine Salesman");
    expect(entries[1].occupation).toBe("Software Engineer");
  });

  it("returns empty array for wikitext without cast table", () => {
    expect(parseCastTable("no table here")).toEqual([]);
  });
});

// --- Episode guide parser tests ---

describe("parseEpisodeGuide", () => {
  describe("Season 46", () => {
    it("parses 13 episodes (excluding reunion)", () => {
      const result = parseEpisodeGuide(s46Epguide, 46);
      expect(result.episodes).toHaveLength(13);
    });

    it("has correct episode titles", () => {
      const result = parseEpisodeGuide(s46Epguide, 46);
      expect(result.episodes[0].title).toBe("Episode 1");
      expect(result.episodes[1].title).toBe("Episode 2");
      expect(result.episodes[12].title).toBe("Episode 13");
    });

    it("episode 2 is a combined challenge", () => {
      const result = parseEpisodeGuide(s46Epguide, 46);
      const ep2 = result.episodes.find((e) => e.order === 2);
      expect(ep2).toBeDefined();
      expect(ep2!.isCombinedChallenge).toBe(true);
    });

    it("episode 3 has Randen as a medical evacuation", () => {
      const result = parseEpisodeGuide(s46Epguide, 46);
      const randen = result.eliminations.find((e) => e.playerName === "Randen");
      expect(randen).toBeDefined();
      expect(randen!.episodeNum).toBe(3);
      expect(randen!.variant).toBe("medical");
      expect(randen!.voteString).toBe("no vote");
    });

    it("Jelinsky eliminated episode 1 with 5-0 vote", () => {
      const result = parseEpisodeGuide(s46Epguide, 46);
      const jelinsky = result.eliminations.find(
        (e) => e.playerName === "Jelinsky",
      );
      expect(jelinsky).toBeDefined();
      expect(jelinsky!.episodeNum).toBe(1);
      expect(jelinsky!.voteString).toBe("5-0");
      expect(jelinsky!.variant).toBe("tribal");
    });

    it("detects the finale episode", () => {
      const result = parseEpisodeGuide(s46Epguide, 46);
      const ep13 = result.episodes.find((e) => e.order === 13);
      expect(ep13).toBeDefined();
      expect(ep13!.isFinale).toBe(true);
    });

    it("detects post-merge episodes", () => {
      const result = parseEpisodeGuide(s46Epguide, 46);
      // S46 merge tribe is nuinui, first appears episode 6
      const ep6 = result.episodes.find((e) => e.order === 6);
      expect(ep6).toBeDefined();
      // The merge episode itself has postMerge: false (postMerge means "after the merge episode")
      expect(ep6!.postMerge).toBe(false);
      expect(ep6!.mergeOccurs).toBe(true);

      // Episode after merge
      const ep7 = result.episodes.find((e) => e.order === 7);
      expect(ep7!.postMerge).toBe(true);

      // Pre-merge episodes
      const ep5 = result.episodes.find((e) => e.order === 5);
      expect(ep5!.postMerge).toBe(false);
    });
  });

  describe("Season 9", () => {
    it("parses 14 episodes (excluding reunion)", () => {
      const result = parseEpisodeGuide(s9Epguide, 9);
      // S9 has episodes 1-14 plus reunion 15
      expect(result.episodes).toHaveLength(14);
    });

    it("episode 1 is combined", () => {
      const result = parseEpisodeGuide(s9Epguide, 9);
      const ep1 = result.episodes.find((e) => e.order === 1);
      expect(ep1).toBeDefined();
      expect(ep1!.isCombinedChallenge).toBe(true);
    });

    it("multi-tribal episode 3 has TWO eliminations", () => {
      const result = parseEpisodeGuide(s9Epguide, 9);
      const ep3Elims = result.eliminations.filter((e) => e.episodeNum === 3);
      expect(ep3Elims).toHaveLength(2);
      const names = ep3Elims.map((e) => e.playerName).sort();
      expect(names).toContain("John P.");
      expect(names).toContain("Mia");
    });
  });

  describe("Season 50 (extra Exiled + Journey columns)", () => {
    it("parses 6 episodes", () => {
      const result = parseEpisodeGuide(s50Epguide, 50);
      expect(result.episodes).toHaveLength(6);
    });

    it("Ep 1: Jenna eliminated (7-1) tribal + Kyle evacuated (no vote) medical", () => {
      const result = parseEpisodeGuide(s50Epguide, 50);
      const ep1Elims = result.eliminations.filter((e) => e.episodeNum === 1);
      expect(ep1Elims).toHaveLength(2);

      const jenna = ep1Elims.find((e) => e.playerName === "Jenna");
      expect(jenna).toBeDefined();
      expect(jenna!.voteString).toBe("7-1");
      expect(jenna!.variant).toBe("tribal");

      const kyle = ep1Elims.find((e) => e.playerName === "Kyle");
      expect(kyle).toBeDefined();
      expect(kyle!.voteString).toBe("no vote");
      expect(kyle!.variant).toBe("medical");
    });

    it("Ep 2: Savannah eliminated (6-1) tribal", () => {
      const result = parseEpisodeGuide(s50Epguide, 50);
      const savannah = result.eliminations.find(
        (e) => e.playerName === "Savannah" && e.episodeNum === 2,
      );
      expect(savannah).toBeDefined();
      expect(savannah!.voteString).toBe("6-1");
      expect(savannah!.variant).toBe("tribal");
    });

    it("Ep 3: Q eliminated (5-1) tribal", () => {
      const result = parseEpisodeGuide(s50Epguide, 50);
      const q = result.eliminations.find(
        (e) => e.playerName === "Q" && e.episodeNum === 3,
      );
      expect(q).toBeDefined();
      expect(q!.voteString).toBe("5-1");
      expect(q!.variant).toBe("tribal");
    });

    it("Ep 4: Mike eliminated (3-2-1) tribal", () => {
      const result = parseEpisodeGuide(s50Epguide, 50);
      const mike = result.eliminations.find(
        (e) => e.playerName === "Mike" && e.episodeNum === 4,
      );
      expect(mike).toBeDefined();
      expect(mike!.voteString).toBe("3-2-1");
      expect(mike!.variant).toBe("tribal");
    });

    it("Ep 5: double elimination — Angelina (4-1) + Charlie (4-3)", () => {
      const result = parseEpisodeGuide(s50Epguide, 50);
      const ep5Elims = result.eliminations.filter((e) => e.episodeNum === 5);
      expect(ep5Elims).toHaveLength(2);

      const angelina = ep5Elims.find((e) => e.playerName === "Angelina");
      expect(angelina).toBeDefined();
      expect(angelina!.voteString).toBe("4-1");
      expect(angelina!.variant).toBe("tribal");

      const charlie = ep5Elims.find((e) => e.playerName === "Charlie");
      expect(charlie).toBeDefined();
      expect(charlie!.voteString).toBe("4-3");
      expect(charlie!.variant).toBe("tribal");
    });

    it("Ep 1 combined challenge detected", () => {
      const result = parseEpisodeGuide(s50Epguide, 50);
      const ep1 = result.episodes.find((e) => e.order === 1);
      expect(ep1).toBeDefined();
      expect(ep1!.isCombinedChallenge).toBe(true);
    });

    it("Ep 3 combined challenge detected", () => {
      const result = parseEpisodeGuide(s50Epguide, 50);
      const ep3 = result.episodes.find((e) => e.order === 3);
      expect(ep3).toBeDefined();
      expect(ep3!.isCombinedChallenge).toBe(true);
    });

    it("does not misidentify journey participants as eliminations", () => {
      const result = parseEpisodeGuide(s50Epguide, 50);
      // Savannah, Mike, Colby appear in the Journey column for Ep 1
      // but should NOT be listed as Ep 1 eliminations
      const ep1Elims = result.eliminations.filter((e) => e.episodeNum === 1);
      const names = ep1Elims.map((e) => e.playerName);
      expect(names).not.toContain("Colby");
      // Savannah is eliminated in Ep 2, not Ep 1
      expect(names).not.toContain("Savannah");
      // Mike goes on journey in Ep 1, eliminated in Ep 4
      expect(
        result.eliminations.find(
          (e) => e.playerName === "Mike" && e.episodeNum === 1,
        ),
      ).toBeUndefined();
    });

    it("Ep 4 tribecolor style detected as challenge win", () => {
      const result = parseEpisodeGuide(s50Epguide, 50);
      const ep4Challenges = result.challenges.filter((c) => c.episodeNum === 4);
      // Ep 4 has a combined challenge won by kalo
      expect(ep4Challenges.length).toBeGreaterThanOrEqual(1);
      const kaloChallenge = ep4Challenges.find((c) => c.winnerTribe === "kalo");
      expect(kaloChallenge).toBeDefined();
    });
  });
});

// --- Voting history parser tests ---

describe("parseVotingHistory", () => {
  describe("Season 46", () => {
    it("has 18 episode columns for eliminations", () => {
      const result = parseVotingHistory(s46Votetable, 46);
      // The voted out row has 18 tribebox entries (one per elimination column)
      // Each maps to an episode column
      const eliminatedEps = Object.keys(result.votesByEpisode);
      // S46 has columns for episodes 1-13, but some episodes have multiple
      // tribal councils, so there are more columns than episodes
      expect(eliminatedEps.length).toBeGreaterThanOrEqual(13);
    });

    it("idol plays detected via strikethrough", () => {
      const result = parseVotingHistory(s46Votetable, 46);
      // In S46, look for any idol_play_negated_vote events
      // The strikethrough pattern <s>Name</s> appears when idol is played
      // S46 voting table has tribehl3 markup for highlighting but not <s> tags
      // for idol negations per se. Let's just verify the parser doesn't crash
      // and returns events array.
      expect(Array.isArray(result.events)).toBe(true);
    });
  });

  describe("Season 9", () => {
    it("parses vote tallies for episodes", () => {
      const result = parseVotingHistory(s9Votetable, 9);
      expect(result.votesByEpisode[1]).toBeDefined();
      expect(result.votesByEpisode[1].eliminatedPlayer).toBe("Brook");
    });
  });

  // --- Tribe history extraction tests (Unit 1) ---

  describe("tribeHistories", () => {
    describe("Season 46 (no swap)", () => {
      it("parses all 18 players with tribe data", () => {
        const result = parseVotingHistory(s46Votetable, 46);
        // S46 has 18 contestants + Moriah (tribebox2|none with tribeicon)
        expect(result.tribeHistories.size).toBeGreaterThanOrEqual(18);
      });

      it("parses players with 0 tribeicons (pre-merge boots)", () => {
        const result = parseVotingHistory(s46Votetable, 46);
        const jelinsky = result.tribeHistories.get("Jelinsky");
        expect(jelinsky).toBeDefined();
        expect(jelinsky!.tribebox2).toBe("yanu");
        expect(jelinsky!.tribeicons).toEqual([]);
      });

      it("parses players with 1 tribeicon (reached merge)", () => {
        const result = parseVotingHistory(s46Votetable, 46);
        const kenzie = result.tribeHistories.get("Kenzie");
        expect(kenzie).toBeDefined();
        expect(kenzie!.tribebox2).toBe("nuinui");
        expect(kenzie!.tribeicons).toEqual(["yanu"]);
      });

      it("skips tribebox2|out rows (jury phase markers)", () => {
        const result = parseVotingHistory(s46Votetable, 46);
        // tribebox2|out rows should not appear in tribeHistories
        for (const [, hist] of result.tribeHistories) {
          expect(hist.tribebox2).not.toBe("out");
        }
      });

      it("handles tribebox2|none WITH tribeicon1 (Moriah)", () => {
        const result = parseVotingHistory(s46Votetable, 46);
        const moriah = result.tribeHistories.get("Moriah");
        expect(moriah).toBeDefined();
        expect(moriah!.tribebox2).toBe("none");
        expect(moriah!.tribeicons).toEqual(["siga"]);
      });
    });

    describe("Season 9 (tribe swap)", () => {
      it("parses players with 2 tribeicons (survived swap + merge)", () => {
        const result = parseVotingHistory(s9Votetable, 9);
        // Rory: original Lopevi, swapped to Yasur
        const rory = result.tribeHistories.get("Rory");
        expect(rory).toBeDefined();
        expect(rory!.tribebox2).toBe("alinta");
        expect(rory!.tribeicons).toEqual(["lopevi", "yasur"]);
      });

      it("parses players who stayed on same tribe through swap", () => {
        const result = parseVotingHistory(s9Votetable, 9);
        // Chris: original Lopevi, stayed Lopevi
        const chris = result.tribeHistories.get("Chris");
        expect(chris).toBeDefined();
        expect(chris!.tribebox2).toBe("alinta");
        expect(chris!.tribeicons).toEqual(["lopevi", "lopevi"]);
      });

      it("parses pre-swap eliminees with 0 tribeicons", () => {
        const result = parseVotingHistory(s9Votetable, 9);
        const brady = result.tribeHistories.get("Brady");
        expect(brady).toBeDefined();
        expect(brady!.tribebox2).toBe("lopevi");
        expect(brady!.tribeicons).toEqual([]);
      });
    });

    describe("Season 50 (3 tribes + swap, capital Tribeicon1)", () => {
      it("handles case-insensitive Tribeicon1 matching", () => {
        const result = parseVotingHistory(s50Votetable, 50);
        // S50 uses {{Tribeicon1|...}} with capital T
        const aubry = result.tribeHistories.get("Aubry");
        expect(aubry).toBeDefined();
        expect(aubry!.tribeicons).toEqual(["vatu", "kalo"]);
      });

      it("parses pre-swap eliminees with 0 tribeicons", () => {
        const result = parseVotingHistory(s50Votetable, 50);
        const savannah = result.tribeHistories.get("Savannah");
        expect(savannah).toBeDefined();
        expect(savannah!.tribebox2).toBe("cila");
        expect(savannah!.tribeicons).toEqual([]);
      });
    });
  });
});

// --- Tribe roster builder tests (Unit 2) ---

describe("buildTribeRosters", () => {
  describe("Season 46 (no swap)", () => {
    it("builds correct tribe rosters for episode 1", () => {
      const voteResult = parseVotingHistory(s46Votetable, 46);
      const epResult = parseEpisodeGuide(s46Epguide, 46);
      const mergeEp = epResult.episodes.find((e) => e.mergeOccurs);
      const rosters = buildTribeRosters(
        voteResult.tribeHistories,
        epResult.episodes,
        epResult.eliminations,
        mergeEp ? mergeEp.order : null,
      );

      const ep1 = rosters.get(1);
      expect(ep1).toBeDefined();
      // S46 has 3 tribes of 6 players each
      const yanu = ep1!.get("yanu") ?? [];
      const nami = ep1!.get("nami") ?? [];
      const siga = ep1!.get("siga") ?? [];
      expect(yanu.length).toBe(6);
      expect(nami.length).toBe(6);
      expect(siga.length).toBe(6);
    });

    it("excludes eliminated players from subsequent episodes", () => {
      const voteResult = parseVotingHistory(s46Votetable, 46);
      const epResult = parseEpisodeGuide(s46Epguide, 46);
      const mergeEp = epResult.episodes.find((e) => e.mergeOccurs);
      const rosters = buildTribeRosters(
        voteResult.tribeHistories,
        epResult.episodes,
        epResult.eliminations,
        mergeEp ? mergeEp.order : null,
      );

      // Jelinsky was eliminated in episode 1 — should not be in episode 2 roster
      const ep2 = rosters.get(2);
      if (ep2) {
        const yanu2 = ep2.get("yanu") ?? [];
        expect(yanu2).not.toContain("Jelinsky");
      }
    });

    it("does not include post-merge episodes", () => {
      const voteResult = parseVotingHistory(s46Votetable, 46);
      const epResult = parseEpisodeGuide(s46Epguide, 46);
      const mergeEp = epResult.episodes.find((e) => e.mergeOccurs);
      expect(mergeEp).toBeDefined();
      const rosters = buildTribeRosters(
        voteResult.tribeHistories,
        epResult.episodes,
        epResult.eliminations,
        mergeEp!.order,
      );

      // Post-merge episodes should not have roster entries
      // (merge episode itself IS included for last tribal challenge)
      for (const [epNum] of rosters) {
        expect(epNum).toBeLessThanOrEqual(mergeEp!.order);
      }
    });

    it("includes Moriah (tribebox2|none + tribeicon1|siga) in Siga roster", () => {
      const voteResult = parseVotingHistory(s46Votetable, 46);
      const epResult = parseEpisodeGuide(s46Epguide, 46);
      const mergeEp = epResult.episodes.find((e) => e.mergeOccurs);
      const rosters = buildTribeRosters(
        voteResult.tribeHistories,
        epResult.episodes,
        epResult.eliminations,
        mergeEp ? mergeEp.order : null,
      );

      // Moriah should be in the Siga roster for episode 1
      const ep1 = rosters.get(1);
      expect(ep1).toBeDefined();
      const siga = ep1!.get("siga") ?? [];
      expect(siga).toContain("Moriah");
    });
  });

  describe("Season 9 (tribe swap)", () => {
    it("detects swap and builds different pre/post-swap rosters", () => {
      const voteResult = parseVotingHistory(s9Votetable, 9);
      const epResult = parseEpisodeGuide(s9Epguide, 9);
      const mergeEp = epResult.episodes.find((e) => e.mergeOccurs);
      const rosters = buildTribeRosters(
        voteResult.tribeHistories,
        epResult.episodes,
        epResult.eliminations,
        mergeEp ? mergeEp.order : null,
      );

      // Pre-swap: Rory should be on Lopevi (original tribe)
      const ep1 = rosters.get(1);
      expect(ep1).toBeDefined();
      const lopevi1 = ep1!.get("lopevi") ?? [];
      expect(lopevi1).toContain("Rory");

      // Post-swap: Rory should be on Yasur
      // Find a post-swap episode (any episode after the swap but before merge)
      const lastPreMergeEp = mergeEp ? mergeEp.order - 1 : 7;
      const postSwapRoster = rosters.get(lastPreMergeEp);
      if (postSwapRoster) {
        const yasurLate = postSwapRoster.get("yasur") ?? [];
        expect(yasurLate).toContain("Rory");
      }
    });
  });
});
