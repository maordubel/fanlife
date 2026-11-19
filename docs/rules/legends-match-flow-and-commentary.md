# Legends · the match is told in words, kick-off is two screens, a phone reads matchday in three pages (19.11.2026)

Owner, 19.11.2026: polish, upgrade and harden the whole of Legends Manager — a better division into pages, a better match flow,
more from Football and Championship Manager, a tighter match picture — and whatever fits goes to the Royal Rumble too.

1. **The commentary line lives in the theatre, so both games have it.** `lib/highlights/commentary.ts` turns a moment into one
   line (minute, who, what, the score after a goal); `components/highlights/Theatre.tsx` shows the last three under the caption,
   newest first, the whole match one tap away. It tells only what the picture has played: the scenes before the one on screen,
   and everything before the spell began. A man is named only where the record names him (rule 111.2); a booking never names a
   colour (rule 95). The wording is picked by the reel's seed and the minute — never by a random call.
2. **The picture's constants are exported and tested** (`components/highlights/paint.ts`): `ballRadius`, `BALL_TRAIL_FROM`,
   `NET_SHAKE`, `MOW_CROSS`. The ball has an ink rim and is never smaller than it was; a struck ball leaves a short trail; the
   net shakes the frame for a third of a second and the crowd comes up; the grass is cut both ways. Palette colours only, so a
   page's paint rules still hold.
3. **Kick-off is two screens:** the matchday card (`PreMatch.tsx → VsCard`: the VS, the ground, the eleven to confirm or change)
   → the dressing room → the match. With no talk to give, the card kicks off. The eleven is read by the formation's SLOTS
   (`lineup.slots[i].family`), never by each man's own line.
4. **Matchday is three pages on a phone** (next match · last result · table), all three at once on a desk: every part carries
   `data-in`, the bar sets `data-part`, `diamond.css` hides the rest under 900 px. Nothing is removed from the page.
5. **The desk rail starts on the page's row** (`grid-row: 2 / span 12`). Pinned to row 3 it stood under the page, because the
   page auto-places into row 2 — measured, not eyeballed (`measure-before-you-fix`).
6. **A card that takes a kit colour as its ground deepens it with ink** (player of the match): white type must read on a white
   shirt. The true colour stays as a bar.
7. **`diamond.css` is the last line of `styles.ts`**, after `polish.css` (`tests/legends/polish.test.ts`).
