# Fan Life — the magazine design system (option E, approved 6.10.2026)

A 1970s–80s football weekly. Cover, contents page, stop-press strip, editor's letter, stickers, staples, halftone and grain.

## Tokens (`app/magazine.css`)
ink `--mag-ink` · paper `--mag-paper` · card `--mag-card` · vermilion `--mag-vermilion` · salmon · navy · purple · lilac · green.
No yellow, gold, amber or orange. Display face Bowlby One (self-hosted), mono Courier Prime, body Archivo.

## Furniture
`Shell` = sticky masthead bar + STOP PRESS strip + children + credit footer + phone tab bar. `.mag-cover`, `.mag-section` (+ `.mag-rule`, `.mag-head`, `.mag-kicker`, `.mag-h2`), `.mag-tile`, `.mag-contents/.mag-row`, `.mag-fixture`, `.mag-card`, `.mag-letter`, `.mag-sticker`, `.mag-stamp`, `.mag-tape`.

## Clubs
Fixed liveries from the registry (`lib/club-livery.ts`): solid, stripes or sash, worn only by `.mag-badge` / `.mag-band` through `--club-primary`.

## Live fixtures
`lib/fixtures/*` (TheSportsDB, free key). Adapter in `provider.ts`; cache 6h; `/api/fixtures` shows per-club diagnostics. Home rotation: live → today → soon → later. A card opens `/clubs/<id>/meetings?vs=<opponent>` — the archive of recorded meetings, or an honest "none yet".

## Adding a feature
Wrap the page in `Shell`/`ClubSurface`, use only `mag-*` classes and tokens, design mobile first and desktop separately, keep the credit footer. `tests/magazine.test.ts` enforces it.

## 6.10.2026 — Cover v2 (poster cover)
- Cover: `.mag-cover-poster` — dateline, FAN/LIFE (Bowlby, LTR-isolated), `public/brand/magazine/football-cover-collage.png` (1254², palette PNG, `unoptimized`, `alt=""`), 13-gates stamp (from `SHARED_GATES.length`), two teaser rails (XI, Big Quiz) that open the club chooser, EVERY CLUB. A WORLD., PLUS! card. Mobile 530px/510px at 320; desktop 850×600. Constant rotations only.
- `--mag-condensed` (Karantina 700) only inside `.mag-editorial`, teasers, tiles, chooser, TOC.
- Hub: `.mag-hubnav` (CLUBS/PLAY/ARCHIVE), TOC "Inside this issue", club tiles carry `data-club`, games special is one `GateChooser` per shared gate (`components/home/MagazineHubControls.tsx`), data from `lib/home/hub-model.ts` (one `loadClub` per club; href only when `gateAvailability().playable`, else "not open yet"). Archive and "On this day" (`?today=1`) and LIFE use the same chooser; LIFE hrefs come from `lifeEntries()`.
- Tabbar: Home / Clubs / Archive / Games.
- Browser smoke: home tiles are `.mag-tile[data-club]` (livery on the badge); theme assertions stay on `.club-surface`.
