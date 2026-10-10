# Royal Rumble XI — eleven a side, prices, reach

**Where:** gate 9, `?mode=xi` (`lib/clubs/rumble-xi/*`, `lib/clubs/rumble-play.ts`, `components/clubs/rumble/*`). The classic five-a-side game is untouched.

## Rules in one screen
- €35M for eleven; 4-3-3, 4-4-2 or 3-5-2; the rival is a different eleven of your own club, any other club that can field one, or a draw (fixed by the round's seed).
- Three cards per slot where the pool allows (one or two where a club's archive is small: the club is then marked *limited*, never hidden).
- Positions are the archive's four families; where a man stands in the shape is an estimate and the screen says so.

## Prices (`content/generated/rumble-prices.json`)
A man's price is where his rating stands among **all** the men of his family across the eight clubs — not among his own club's. Nine quantile cut points per family give €1M…€5M in half-million steps (about one man in thirty-three at the maximum, one in fourteen at the minimum). Game money, not a transfer value, not an official rating.
`npm run rumble:prices` rebuilds the table; `tests/clubs/rumble-xi.test.ts` fails when the file is not what a fresh build produces.

## Reach — every man is signable
1. **Pool.** `ratedPool` takes a man only if some source names his position: the archive, the owner workbook, or `content/manual/player-positions-extra.json`.
2. **Extra positions.** `scripts/rumble/fill-positions.mjs` reads the football-biography infobox of English / Hebrew / Greek Wikipedia (CC BY-SA) for the men the archive leaves unplaced. Accepted only on an exact title, a footballer page naming *this* club; a disambiguation page is followed only when exactly one candidate qualifies. Everyone else is listed under `unplaced` with the reason — never matched by surname.
3. **Scouting.** Twice a round a player may sign **any** man of the slot's family by name (his price + €1M). The server re-checks family, pool, the rival's eleven and the cap. So even a man who is never dealt is one search away.
4. `tests/clubs/rumble-xi.test.ts` asserts nobody drops silently (pool or listed) and every pooled man is findable.

## Football
`lib/clubs/rumble-play.ts` tells what happens around the decided score: build-ups between named players, tackles, interceptions, corners, offsides, fouls, cards; stats and match ratings. Goals come only from the staged events.
