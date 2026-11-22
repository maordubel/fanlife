# A player's card carries his archive record and the doors to it

**Owner, 22.11.2026.** "A player's card in Legends Manager should be impressive and include every detail from his archive card, with a link to the archive and to what is relevant. Treat the site as a hub of football fans with an inner hub for each club's fan."

- **The card shows what the archive records about the man at that club**: games and goals as a named source states them, and how many of our clubs he played for (`lib/people/by-record.ts → recordFacts`, `CardView.rec`). An unrecorded count is left out, never shown as zero.
- **Two doors on the full card** (`components/legends/CardLinks.tsx`): "In the archive" (his sheet in that club's archive) and "Full profile" (his one page across clubs).
- **A door is drawn only when its room is open** (rule 128): the archive door where gate 12 is open to the visitor, the profile door behind the "Player profiles" switch. The page says which are open (`LegendDoorsProvider`).
- **One entity, one address, the same facts everywhere.** A player, a match, a kit and a club each have one page; every surface that shows one (a game, the album, the shop, a film) shows the same recorded facts and links to that page. New surfaces follow this; compact cards stay compact.
