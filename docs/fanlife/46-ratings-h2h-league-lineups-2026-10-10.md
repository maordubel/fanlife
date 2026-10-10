# Player ratings, head-to-head Rumble and league line-ups (10.10.2026)

## Ratings (owner workbook)
`content/raw/ratings/fanlife-eight-clubs-estimated-scores-2026-10-10.xlsx` → `scripts/rumble/import-ratings.py` → `content/manual/player-ratings.json` → `lib/clubs/ratings.ts`.
The workbook is **FAN LIFE's own estimate (1–99), not Football Manager and not FIFA/EA FC** — it says so itself, and so does the code (`basis`: `individual` ±9, `club-baseline` ±14, `derived`).
433 listed players, 8 clubs. A man the workbook does not list gets a **derived** rating: his club's baseline at his position moved ±6 by what the club's own archive records of him (career span, goals), capped at 84 so no estimate outranks an anchored star. Names are matched exactly (rule 7); a duplicate name in the workbook is not used. A rating never leaves the server.
**Price** (the draft economy) follows a man's standing inside his own club and position, so every club's draft is balanced; **power** (the match) is the absolute rating, so Hapoel Tel Aviv v AEK is a fair comparison.

Listed in the workbook but **without a documented position anywhere**, so they cannot be dealt (a position is never guessed — give a position and they join the pool):
- **hapoel-tel-aviv** (1 of 23): אלי גוטמן
- **hapoel-petah-tikva** (20 of 57): איתי אהוד, אדמונד אסנטה, דייגו ארויו, גיא בדש, אריק בילה, אור ישראלוב, סתיו ישראלי, נעם כהן, אבישי כהן, רועי לוי, אלכס מוסונדה, יזן נסאר, חמידו קייטה, קארים קימבידי, הראל שלום, נחום סטלמך, אלי אברבנל, מנור חסן, יניב לוזון, נועם קייסי
- **olympiacos** (0 of 33): 
- **panathinaikos** (0 of 52): 
- **st-pauli** (19 of 25): Sören Ahlers, Sami Allagui, Etienne Amenyido, Afeez Aremu, Christopher Avevor, Scott Banks, Fin Bartels, Finn Ole Becker, Fabian Boll, Daniel Buballa, Christopher Buchtmann, Sascha Burchert, Guido Burgstaller, Jackson Irvine, Daniel-Kofi Kyereh, Karol Mets, Leart Paqarada, Eric Smith, Ben Voll
- **celtic** (26 of 43): James Kelly, Daniel Doyle, Sandy McMahon, Willie Orr, James Hay, Sunny Jim Young, Alec McNair, William Cringan, Charlie Shaw, Willie McStay, Jimmy McStay, Bobby Hogg, Willie Lyon, John McPhail, Sean Fallon, Jock Stein, Bobby Evans, Bertie Peacock, Duncan MacKay, Kenny Dalglish, Roy Aitken, Tom Boyd, Paul Lambert, Jackie McNamara (Jnr), Neil Lennon, Stephen McManus
- **zrinjski-mostar** (14 of 52): Dario Čanađija, Andrija Balić, Stipe Radić, Antonio Ivančić, Kerim Memija, Luka Marin, Damir Zlomislić, Aldin Hrvanović, Petar Mišić, Filip Bradarić, Matej Senić, Tarik Ramić, Toni Šunjić, Besart Abdurahimi
- **aek-athens** (1 of 148): Μίμης Παπαϊωάννου

## Head to head (gate 9)
- `?vs=<club>` — an AI rival drawn from any club that can field a five (your own included); the rival's side wears **his** club's shirts.
- `?duel=<token>` — a friend's locked five in a link (club + board seed + five opaque ids; no rating, no name). The server re-deals his board and refuses a five it did not offer. Whoever opens it picks **any** club (the sender's too: AEK v AEK) and plays his own draft against those five men; no man is shared.
- After the whistle: **Challenge a friend with this five** (share sheet / copy). Code: `lib/clubs/rumble.ts` (`Opponent`, `settle`, `checkFive`), `rumble-duel.ts`, `rumble-opponent.ts` (server-only), `RumbleOpponentBar`, `RumbleChallenge`.
- **11 v 11 is ready in the engine**: `Format` (`FIVE`, `ELEVEN` = 4-3-3, budget 33 at the same average price). Deal, rival, readiness and match take a format; only the stage (pitch, entrance, reels) is five-a-side. `tests/clubs/rumble-h2h.test.ts`.

## League line-ups from two public score sites
`scripts/ingest/clubs/league-lineups.ts` reads a club's latest finished matches from **365Scores** and finds the same match on **LiveScore** (our club by exact name, the same score, an opponent sharing a word, the day ±1). The two elevens must agree on ≥10 of 11 surnames → two publishers → `approved`, confidence 3. Anything else stays `review` and reaches no gate. UEFA ties are not read here (UEFA is its own authority, rule 102). Ids: `scores365Id` in each `ingest.json`. Merged by `lib/clubs/euro-wave.ts`.
Zrinjski: 365Scores lists no line-ups for the Bosnian league, so none.
