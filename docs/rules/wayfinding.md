# Wayfinding: every page says where you are; the front page is short

**Owner, 22.11.2026.** "A serious, thorough treatment of every page for the user's comfort: easier understanding, orientation, instructions, directions. It must always be clear what he is doing and what he can do. Shorten pages, divide them better, split them. A separate design for the phone and for the desktop. Keep the old football magazine, fitted to the digital age."

- **One map of the site** (`lib/wayfinding/map.ts → placeFor`): for an address, the trail back to the front page, the page's name, one line saying what it is, what you can do on it, and where to go on. Words live in `messages/wayfinding.en.json`. A new page is placed by adding it to the map.
- **The folio** (`components/wayfinding/Folio.tsx`) is the magazine's running head, drawn once by the shell and once by a club's layout. Phone: one row — a step back, the page's name, a "?" that opens the line, the instructions and the next steps. Desktop: one band — the whole trail, the line, the next steps.
- **Not on the front page and not on a game in play**: a gate has its own frame, its own way out and its own help.
- **The front page is short** (`app/page.tsx`, `short`): masthead → the three doors → your club → the contents → the back pages. Every other feature is one tap away in the contents, on its own page. Measured 22.11.2026: 8.0 → 3.2 screens on a 390px phone, 5.4 → 2.3 on a 1440px desktop. This replaces "nothing is hidden" of hub-order for the new front page only; the old page is unchanged while the switch is off.
- **Desktop**: the contents is the right-hand column of the spread and stays in view.
- All of it sits behind the switch `frontDoors` ("New front page & wayfinding"): off = owner preview.
- **Next, in this order** (measured the same day): the club home (6.6 screens on a phone, 4.4 on a desktop), the club's Play page (4.0), The clubs (4.4), Our games (3.6).
