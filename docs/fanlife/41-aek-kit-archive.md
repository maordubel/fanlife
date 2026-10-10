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

---

# Six-club kit archives: images, SVG, icons, crests (9.10.2026)

## Where the files live
`public/club-kits/`, **not** `public/kits/`: that folder is the yellow-exempt one for the archive photographs, and `tests/kit-assets.test.ts` demands a zero-yellow ledger row for anything else put there. These are drawings of kits (AEK's and Celtic's are mostly yellow or green, and the crests carry their colours), so they sit outside the exempt folder rather than widening the exemption.

## The grant
Owner, 9.10.2026: *"יש לך אישור להשתמש בכל החומרים הגרפים המצורפים, בכל הלוגואים. בכל הסמלים. נא לייצר ארכיון מדים שלם, של SVG ושל תמונות מקור"* — about the five colours-of-football.com catalogues, the three GitHub repositories and their logos. The drawings, logos and symbols are third-party material used under that grant; it is recorded here and on `/credits` (the manifests carry `sources`), and it does not make anyone else's licence ours.

## What was built, per club (AEK Athens, Celtic, Panathinaikos, FC St. Pauli, Zrinjski Mostar, Hapoel Petah Tikva)
| Asset | Where | Made by |
|---|---|---|
| Source images (the catalogue's drawings, unchanged) | `public/club-kits/<club>/cof/` | `scripts/kits/make-club-kits.py` |
| One SVG per kit, crest embedded | `public/club-kits/<club>/svg/<id>.svg` | `scripts/kits/export-kit-svgs.mjs` (renderer: `kit-render.js`) |
| One small icon per kit (CC0 outlines, measured colours) | `public/club-kits/<club>/icons/<id>.svg` | `scripts/kits/export-kit-icons.mjs` |
| Club crest, 256 px and 96 px | `public/club-kits/<club>/crest*.png` | football-logos.cc PNG, resized |
| Measurements and the by-eye transcription | `content/manual/kit-cof-<club>.json`, `kit-reads/<club>.json` | the script above |
| Joined archive (pages, SVGs, the in-app page read this) | `content/manual/kit-archive-<club>.json` (AEK: `kit-aek-athens.json`) | the script above |
| A static page per club and a hub | `/kit-archive`, `/kit-archive/<club>` | `scripts/kits/build-kit-archive-pages.py` |

Counts: St. Pauli 46, Panathinaikos 61, Zrinjski 19, Hapoel Petah Tikva 6, Celtic 75, AEK 99 (57 from the catalogue, 42 shirt-only drawings from Commons).

## How it is read
- **Season and type** are the catalogue's captions. **Colours** are measured from pixels (shirt, shorts and socks in fixed regions). **Design, maker, printed sponsor and trims** are a by-eye transcription of 160×215 px drawings, done by one reader per club from 2× contact sheets; a mark that could not be read stayed `null`, and `readUnsure` marks the doubtful kits (St. Pauli 17, Panathinaikos 19, Zrinjski 8, Hapoel Petah Tikva 6, Celtic 12). Nothing was filled from memory about the club.
- **Cross-check against the packs.** Panathinaikos: 57 of its 61 kits already exist in the pack (from Football Kit Archive) with the same season and type; for all of them the transcribed maker agrees with the pack's (0 conflicts). Zrinjski 13 of 19, Hapoel Petah Tikva 6 of 6, St. Pauli 2 of 46, Celtic none.
- **Waves.** A catalogue kit the pack already holds for that season and type is *not* added again (it is a twin; the archive page shows both). The rest go to `club-packs/<club>/wave-kits-cof-2026-10-09.json` as `review`, confidence 1: St. Pauli 44, Panathinaikos 4, Zrinjski 6, Celtic 75. They are wired into the resolver but reach no gate until the owner approves; `tests/clubs/club-kit-archives.test.ts` approves them in memory and asserts Celtic's and St. Pauli's gates 4 and 5 would then be playable.
- **In-app page** `/clubs/<club>/kit-archive` shows, per approved kit, the pack's own cut-out photograph if there is one, else the catalogue's source image, else the drawn plate, with a link to the SVG.

## What was not used, and why
- **fkapi** is a scraper for footballkitarchive.com; that site answers automated reads with 403 (a bot challenge, not circumvented), and the repository holds code, not data. Nothing was taken from it.
- **football-logos (GitHub)** holds only the 231 country banner collages; the individual club logos come from football-logos.cc (700 px PNG; its SVG download link answered 404 from here, so the crest is a PNG).
- **football-kit-icons** (CC0) supplied the shirt outlines for the icons.

## Colours
`brown` joins the paintable swatch for St. Pauli (same grant and same per-club policy as yellow).

## Still open
- The owner's approval of the new waves (St. Pauli 44, Panathinaikos 4, Zrinjski 6, Celtic 75) and a decision about the transcriptions flagged `readUnsure`.
- SVG logos (football-logos.cc), and printed maker/sponsor logos on the drawings (the grant covers them; none is drawn yet).
- Seasons the catalogues do not cover (the catalogues start around 2001; earlier kits stay with the packs' photographs).

## 10.10.2026 — polish pass

- Second independent reading of all 75 flagged transcriptions; 40 disagreements adjudicated by eye, the reads files corrected and the catalogue waves rebuilt (re-approved with the owner's words where they had been).
- Gate 4 body question: a card that is the correct pair of colours swapped is no longer offered as a distractor (rule 15).
- Sponsor lettering: `content/manual/sponsor-type.json` styles each of the 34 sponsors (family, weight, case, tracking, line breaks; the real lettering colour only on the static archive drawings). `lib/clubs/sponsor-type.ts` reads the same table for gates 4/5 with neutral ink.
- Club Football Shirts: 100 shirt photographs (`kit-cfs-<club>.json`, `public/club-kits/<club>/cfs/`) for seven clubs; matched by season and type onto the archive cards and the gate 5 shelf, the rest in a gallery. Hapoel Petah Tikva has no page on that site.

## 10.10.2026 — logos

- `content/manual/maker-marks.json`: real vector marks for Nike, adidas, Puma, New Balance, Under Armour, Fila, Reebok (simple-icons, CC0 data) and Umbro (the Worker's diamond); sponsors Vodafone (glyph before the lettering), Siemens and LG (the mark replaces the lettering). Printed on the archive drawings (the mark's own colour only where it holds against the shirt) and on the gate 4/5 cloth (`lib/clubs/marks.ts`, contrast ink — rule 95). Any other maker or sponsor stays lettered. Kappa, Lotto, hummel, Macron, Zeus, Capelli, DIIY have no free mark and are lettered.

## 10.10.2026 — Hapoel Tel Aviv, and the Olympiacos crest

- Olympiacos: the owner's crest file (with the four stars) replaces the 100px catalogue logo (`public/club-kits/olympiacos/crest*.png`).
- Hapoel Tel Aviv joins the catalogue pipeline: 33 drawings (`kit-archive-hapoel-tel-aviv.json`, SVGs, icons, static page). Maker and sponsor readings were cross-checked against the Worker's Kit Master — makers agree on every shirt both describe, sponsors on all but 2011/12 (read from the drawing as "בוני התיכון", the Kit Master says "במחיר"; the Kit Master's word is used). The wave is approved with the owner's words of 10.10.2026 and `kitViews` folds each shirt both sources describe into one card.
- Era crests (`scripts/kits/hta-crests.ts` → `kit-crests-hapoel-tel-aviv.json`): each shirt prints the crest of its own era from the club's timeline and the variant that follows the cloth; the 2022/23 centenary year has no artwork and prints none (rule 25).
- The Worker's real sponsor artwork (Subaru, Fujitsu, Arkia) and Macron join the mark library as raster marks; Keter, Umbro, Fujicom, IBI, הכשרה and במחיר have typographic styles.
- The in-app archive shows the Worker's 168-shirt photographed archive (the part no card already uses) with "I have it", and the static page carries the same gallery.

## Retail photographs (10.10.2026)
`scripts/kits/harvest-shops.py` + `make-shop-photos.py` read the public `/products.json` feeds of four shirt retailers (footballshirtcollective, cultkits, shortyfootballshirts, vintagefootballshirts) → `content/manual/kit-shop-<club>.json` (183 photographs, credit per photo with the product page). Season/type/maker are the product title's words. Blocked and not circumvented: Wikimedia (429), footballkitarchive, classicfootballshirts, kitbag, toffs (403).
