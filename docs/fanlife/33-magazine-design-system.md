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
