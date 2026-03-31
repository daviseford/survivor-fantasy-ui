# Observed Event Types During Scraper Refinement

Event types seen in Firestore and wiki data that are not currently scraped or have gaps:

## Missing from scraper (seen in Firestore but not scraped)

### S46 Events (29 missing)
- `go_on_journey` — Players sent on journeys (Maria ep1, Tevin ep1, Jelinsky ep1, Liz ep3, Ben ep3, Bhanu ep3, Hunter ep5, Tim ep5, Q ep5)
- `find_beware_advantage` — Finding beware advantages (Tiffany ep1, Randen ep2, Jem ep3, Hunter ep5)
- `accept_beware_advantage` — Accepting beware advantages (Tiffany ep1, Randen ep2, Jem ep3, Hunter ep5)
- `fulfill_beware_advantage` — Fulfilling beware conditions (Tiffany ep1, Jem ep5, Hunter ep6)
- `find_idol` — Finding hidden immunity idols (Tiffany ep1, Jem ep5, Hunter ep6, Venus ep11, Q ep12)
- `win_advantage` — Winning advantages at journeys (Maria ep1, Tevin ep1)
- `use_advantage` — Using advantages (Maria ep5)
- `use_shot_in_the_dark_unsuccessfully` — Failed Shot in the Dark (Moriah ep6)

### S50 Events (5 missing from Firestore comparison)
- `find_advantage` — Ozzy ep1 (scraper has `win_advantage` instead)
- `win_advantage` — Coach ep1
- `go_on_journey` — Colby ep2, Mike ep2 (scraper has them as ep1)
- `find_idol` — Genevieve ep2 (scraper has as ep1)

## Notes
- S46 missing events all come from recap articles — need `yarn scrape-recap 46` run
- S50 event episode mismatches (ep1 vs ep2) are from recap scraper LLM attribution
- S9 has no events in Firestore (expected data gap)
