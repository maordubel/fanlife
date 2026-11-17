# Legends Manager — "our own Football Manager" research (17.11.2026)

Owner's brief: research the manager genre from Championship Manager (CM 01/02 and before) to the latest Football Manager, and
make Legends Manager fun, addictive and football-logical: an exact position for every man, a match rating that moves with how
he plays, a player of the match every game, better sound and graphics. Plus: study `Dany0421/fm-with-c` (a vanilla-JS FM clone
the owner sent) and take what fits.

## What made the genre addictive

| Era | What it got right | What we take |
|---|---|---|
| CM 93 → CM 01/02 | Speed: a whole season in an afternoon. A text match where you *read* the moments and *feel* the score. Names that become your legends (the Tsigalko effect). Simple screens, deep consequences. | Short loop: one tap from team sheet to kick-off; every match ends on a reason to play the next one (ratings, POTM, table move). |
| FM 05–FM 12 | Match ratings and Player of the Match on every result screen; form (last 5) on the squad screen; awards (player of the month/season, team of the season). | Ratings on the live board, POTM spotlight at full time, average + last-five bars on the team sheet, best averages / POTM count / team of the season in the league centre, player of the season at season end. |
| FM 13–FM 24 | Position familiarity (natural → accomplished → competent → unconvincing), roles per position, the 1–20 positional scale. Data cards in the match. | Exact positions (GK, CB, FB, DM, CM, AM, W, ST) under the four families the engine plays; out-of-line men already play below themselves. |
| FM 26 (Unity, Nov 2025) | Matchday as storytelling: richer animation, data cards in the match, in/out-of-possession roles. Reviews: brilliant on matchday, slow everywhere else. | Keep everything around the match fast; make the match itself richer: xG, big chances, a momentum strip, a living crowd. |

FM's own guidance on ratings: compressed scale, ~6.8 is the league average, a point is the difference between being hooked and
winning Player of the Match; average ratings are criticised when a 5-minute cameo weighs like a full match. Our model: 6.3 base,
measured mean 6.76; cameos under 10 minutes don't count towards form; POTM needs 20 minutes and leans to the winning side.

## Reference repo — `Dany0421/fm-with-c` (ideas only; the repo has no licence, so no code was copied)

Taken: detailed positions with position-weighted contributions; xG, big chances and momentum on the match screen; player of the
month/season and team of the season; momentum after a goal. Not taken (yet): staff, facilities, sponsorship, training programmes,
traits, news feed — candidates for later rounds (below).

## Shipped in this round

1. **Window freeze fixed** — bids that the squad minimum would refuse are marked with the reason before they're pressed; every
   error shows above the sheets; the screen never waits more than 30 s; every store call gives up after 15 s, so one hung call
   can no longer block a career's queue.
2. **Match ratings** (`lib/legends/match-ratings.ts`) — from what the viewer sees: goals, assists, shots, saves (credited to the
   keeper on the pitch), blocks, the post, cards, goals conceded while on, clean sheets, the result, a small seeded "day".
   Live on the board, final at full time.
3. **Player of the Match** spotlight card at full time; best three of your side under it.
4. **Form** (`lib/legends/form.ts`) — average, last five, POTM count per man; on the pitch, the reserves list and the man's card.
5. **League ratings** — best averages, POTM leaders, team of the season (4-3-3 on a pitch), player of the season.
6. **Match board** — xG, big chances, momentum strip.
7. **Sound** — crowd bed through the whole match, build-up swells, "ooh" on saves, roar + chant on your goals, groan/hush on
   theirs, final whistle and applause after a win; ducks under a goal; respects the sound toggle.
8. **Exact positions** — Wikidata (P54 club + P413 position) sharpened by the English Wikipedia infobox, matched by full name
   inside the club. 410 of the 583 men who had no position now have one (`content/manual/player-positions-extra.json`, marked
   `src`); 2,290 men carry an exact role — GK, CB, FB, DM, CM, AM, W, ST — kept only where it agrees with the archive's family
   (47 disagreements dropped) in `content/manual/player-roles.json`. The team sheet shows each man's role on his slot with FM's
   familiarity colour (natural / accomplished / competent), and "best fit" now puts full-backs at full-back and wingers wide.
   173 men are still without a position (no Wikidata match) — next research wave.

## Next rounds (proposed)

- Engine 5 (new matches only, goldens untouched): exact positions in the fit factor (a CB at FB = accomplished, not natural).
- Player traits from the archive (penalty taker, captain material, big-game player) — only where sourced.
- A news feed with pundit lines and rival-club drama, written from the career's own events.
- Player of the month every four rounds; awards night at season end.
- Staff with one decision each (assistant: auto team-talk; physio: injury rounds −1).
