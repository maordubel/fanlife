# Club app shell — status, 8.10.2026

Owner brief: every club page becomes an app of its own (own bottom bar, own voice); the hub still lists all clubs. Approved in full ("מאשר הכל").

## Built
- `app/clubs/[slug]/layout.tsx`: club masthead, five-door tab bar (Home · Play · LIFE raised · History · Terrace), footer, desktop rail. Market and Me only in the club switcher sheet.
- New pages: `play` (grouped tickets + "today's pick"), `history` (nicknames, ground, founding, emblem, colours, facts, sources credit), `terrace` (loudest end, next match, your season). Home rewritten with five hero layouts (poster, curtain, split, ground, ticket).
- `club-packs/<id>/world.json` for Hapoel Tel Aviv, Hapoel Petah Tikva, Zrinjski Mostar, Olympiacos, Panathinaikos — each line has ≥2 publishers (rule 100). Other 12 clubs get the neutral fallback.
- Per-club PWA manifest + icon; hub "Back to <last club>" chip; nickname on hub tiles.
- Rule 100 added to CLAUDE.md.

## Research corrections
- Zrinjski home shirt is white with a red sash (not red/blue).
- Panathinaikos plays at Leoforos (not OPAP Arena, which is AEK's).
- Left out on purpose: Hapoel TA founding year (sources conflict), Olympiacos founding-meeting date, anything political/violent, mottos with one source.

## Gate
tsc: only pre-existing errors · eslint: only pre-existing error · vitest 6 shards: all green except the pre-existing item · next build OK · screenshots 390 and 1440: no overflow, no console errors.

## Pre-existing (not from this delta)
- `tests/clubs/next-gates.test.ts` Zrinjski blind-cow/playable assertion fails without world.json too.
- `tests/clubs/archive-model.test.ts:124` three TS18048 errors.
- `tests/wiki-corpus.test.ts:440` eslint rule definition not found.

## Open
- Hapoel TA host redirect `/`→`/ground` left untouched.
- 12 clubs still need researched world files.
- Next 14 → newer upgrade still open.
