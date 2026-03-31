import { describe, expect, it } from "vitest";
import {
  CastTableEntry,
  parseBirthDate,
  parseCastTable,
  parseContestantPage,
  parseInfoboxFields,
  parseSeasonNumber,
} from "../wikitext-parser";

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
