# AEK Athens kit archive (9.10.2026)

## Sources
Two independent publishers, joined by `scripts/kits/make-aek-wave.py`:

1. **colours-of-football.com**, the AEK catalogue (4 pages, © Mikhail Sipovich, updated 13.04.2026): 57 complete kits (shirt, shorts, socks), 2002/03 to 2025/26. Its captions give season and type ("home kit 2002-2003"). Its drawings show the maker mark and the printed sponsor; `make-aek-cof.py` records them (read by eye) and measures shirt, shorts and sock colours from the pixels. Plain GET requests, one per second; the pages answered 200, nothing was circumvented.
2. **Wikimedia Commons**, `Category:Football kit body/AEK Athens`: 133 shirt drawings (38×59 px), exported by the owner as a PDF because the build container gets HTTP 429 from the Commons API. `make-aek-commons.py` measures each: exact dominant colour per colour family, stripe and hoop counts.

Neither publisher's drawings are committed (the catalogue is copyrighted; the licence of each Commons file is unchecked, rule 5). Only measurements are, in `content/manual/kit-cof-aek-athens.json` and `kit-commons-aek-athens.json`. Every garment on the page is our own drawing from those numbers.

## What the join says
`content/manual/kit-aek-athens.json`: **99 kits**, 57 from the catalogue (complete) and 42 shirt-only drawings the catalogue does not cover (1924, 1931, 1979–81, 1988–96, 1999–2002, 2012–2016, 2026/27 and a few extras); 38 kits are corroborated by both. A Commons drawing is folded into a catalogue kit only when body colour and design match a kit of that season (range and single-year files match the seasons they could mean).

**Ten disagreements are recorded, not hidden.** Commons' h/a/t file-name suffix is a convention, not a statement, and it disagrees with the catalogue's captions for: 2002/03 and 2003/04 (stripes filed as "away"), 2004/05, 2006/07, 2008/09 (Commons "home" is the catalogue's *away*, and the reverse), 2024/25 third and **2025/26 away/third (swapped)**. The caption wins; the card shows the difference. A Commons drawing whose suffix clashes with a *different* shirt in the catalogue for the same season is kept as an unconfirmed "other" kit.

Maker and sponsor are filled **only** where a catalogue drawing shows them (Nike 2002–05 and 2016–18 and 2021 onward, adidas 2005–07, Puma 2007–12, Capelli 2018–21; sponsors Alpha Digital, Piraeus Bank, TIM, LG, Kino, Pame Stoixima). They are reading of a drawing, so status stays `review`. Commons-only kits name neither. The two kits the club pack already approved from aekfc.gr (2016/17 and 2023/24 home, Nike) agree with the catalogue.

## Wave and approval
`club-packs/aek-athens/wave-kits-aek-2026-10-09.json`: 99 kits, status `approved`, confidence 2, approver "Maor Harel (owner, chat)", 9.10.2026 ("מאשר"). `mergeWave` takes it in; `compileEntities` drops anything not approved, so nothing reaches a gate yet. `scripts/club-research/approve-aek-kits.py --day 2026-10-09 --quote "<owner's words>"` approves them when the owner says so (it skips twins of the two already approved).

## How it is wired to the features (all read one list)
Every FAN LIFE kit feature reads `kitViews(pack.data)`, the club's approved kits. AEK now feeds that list with the 99 kits, so nothing is wired separately:
- **Gate 4 (kit-builder)**: a kit is a puzzle when it names maker and design and can be drawn: 57 name both, **46 are drawable** (plain, stripes, pinstripes, hoops, half-and-half, sash, chest band, diagonal). `contrasting sleeves`, `graphic` and `gradient` are not drawable (as for every club) and sit on the shelf as documented, undrawn kits. Target 5, so the gate is READY.
- **Gate 5 (kits, the shelf and studio)** and the club's kit archive area: all 99 on the shelf, the studio palette now includes AEK yellow, makers and sponsors come from the data.
- **Market, closet, auction, shirts**: `lib/fanlife/catalog.ts` lists the same kits for every core club; AEK shirts appear with slug `aekathens--<kit id>`.
- **Royal Rumble**: wardrobe by season from the same list (`rumbleWardrobe`), now able to dress AEK players in yellow.
- **Whole kit**: the catalogue's shorts and socks travel as `value.shorts` / `value.socks` (`{colour, trim}`), through `kitViews` into `KitPlate`, which draws the complete kit (taller frame) only when they exist. Other clubs are untouched.
- `tests/clubs/aek-kits.test.ts` applies the approval **in memory** and asserts all of this (99 kits, gate 4 and 5 READY, yellow stripes drawable, full-kit drawing); with the wave in review nothing reaches a gate.
- The two kits already in `core.json` (2016/17 and 2023/24 home, Nike) cite aekfc.gr, whose access is recorded as `unknown`, so the compiler holds them back today. Re-checking that source is the cheapest way to make the two maker claims count.

## Decision: yellow is allowed for kits (owner, 9.10.2026: "מותר צהוב")
AEK's own colour is yellow and the shared shirt painter refused it by test. The swatch now includes yellow, maroon, skyblue, pink and orange (`lib/clubs/rumble-kit.ts`, `lib/clubs/kit-model.ts`, `components/clubs/games/KitPlate.tsx`). Scope:
- Whether a club may *show* a colour is still decided per club by `forbiddenColor`: Hapoel Tel Aviv's legacy yellow rule keeps dropping it (asserted in `tests/clubs/rumble-show.test.ts`).
- Rule 8 and the brand scan of `app/` and `components/` are untouched: no yellow hex is written in either; it lives in `lib/`.
- The test that said the magazine "never paints yellow" now says what is true, with this date.

## The page
`public/aek-kit-archive/index.html`, built by `scripts/kits/build-aek-archive-page.py` from the joined archive, so nothing is typed by hand. One row per season, one complete kit per slot (home / away / third / other), the catalogue's own caption under each ("home kit 2002/03"). Filters: type, design, maker, source, season. A card opens the kit with every measured colour, maker and sponsor as drawn, both sources with links, and every disagreement. Sponsors are lettered on the fabric (rule 25), never drawn as logos; the crest slot is empty.

## Open
- (Done 9.10.2026: the owner approved all 99 with "מאשר"; the gates and the market read them.)
- Makers for 1924–2002 and 2012–2016: nothing shown; needs a source per season.
- Shorts/socks for the drawing-only kits.
- A licensed crest file for the empty slot; printed logos where a rights grant exists.
- Drawings with a graphic print (1988–96, 2017/18 eagle, 2022/23 tiger, 2025/26 away and third) show the base colour with the print flagged as not drawn.
