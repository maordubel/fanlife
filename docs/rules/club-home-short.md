# A club's home is short: five things, the rest one tap away

**Owner, 22.11.2026.** "Shorten pages, divide them better, split them. A separate design for the phone and for the desktop."

- With the switch `frontDoors` on, a club's home (`app/clubs/[slug]/page.tsx`, `short`) is: the masthead → today's game → pick a gate (three, and "see all") → the next match → one "did you know" → the contents.
- Nothing is deleted, each thing has one home: Legends Manager and LIFE are on **Play**, the supporter card is on **the terrace**, the films and the club's stories are on **History** and in the contents row "Films". The contents rows name every one of them.
- No door is said twice on one screen: the "All the club games" bar and the "Build the kit" button give way to the contents row "Play" and "See all N gates".
- **Phone**: the terrace's game is not repeated (it opens Play); the cover is 330px. **Desktop**: it stays in the side column, and the page closes with one row of three — next match, did you know, contents.
- Measured 22.11.2026 (Olympiacos, as owner): 6.6 → 3.7 screens on a 390px phone, 4.4 → 2.5 on a 1440px desktop; no sideways scroll, no page errors.
- With the switch off the page is exactly the old one.
- **The contents are pictures in one ink** (23.11.2026): on the short club home "Inside this issue" is `ContentsTiles mono` — the owner's pictures printed grey with the club's colour over them (rule 95: no picture brings a rival's colours into a club's ground). Measured as owner: Olympiacos 3.9 screens on a 390px phone, 2.8 on a 1440px desktop.
- **Second pass, 24.11.2026** (owner: "each club's home is still not at the level asked"): under the masthead the club says what a supporter can do — **three ways in** (`components/clubs/ClubDoors.tsx`, `.wkcd`): play solo (today's game), challenge friends (the club's Blind Cow, or Our games filtered to friends), open the archive (History), the owner's door pictures in the club's one ink. The gates fill their row (three across on a desktop, the odd one across on a phone). Next match beside "did you know"; then **the club's own shop window** (`ShopWindow subject mono`: only that club's products, the club's ink, the way in opens the shop on that club; nothing while the club has none); then the contents as pictures three to a row. Measured as owner: 5.5 screens on a 390 phone, 4.3 on a 1440 desktop.
