# Hub, compact (8.10.2026)

Owner: the phone hub had become a long scroll; two squares to a row, no separate vote area, shorter overall.

## What changed
- One club grid: open clubs first (an odd single open club spans the row on a phone), then a label row "In the workshop · 33 fans voted", then the greyed workshop tiles — two to a row on a phone.
- The vote is inside each workshop tile (`components/home/WorkshopGrid.tsx`): a 44px bar with the tile's count; the leader is flagged "Leading"; one vote per device (`fanlife.vote.v1`); order is fixed by the early count so tiles never jump.
- Phone shows the first 6 workshop tiles and a "Show all 16 clubs" button; desktop shows all.
- Removed: the separate `#vote` section, the Vote nav link, `NextClubVote` (now an inert tombstone, rule 26). The dock's Vote chip points at `#clubs`.
- Phone only: editor's letter and the "been" artwork hidden; LIFE band photo shorter. Mobile page height measured at 390px: 3086px (was a section of its own taller).
- Dead copy keys removed (en/he parity kept); new keys `tileLeading`, `tileMore`, `tileLess`.

## Open flag
The vote numbers are DEMO seed data (33 votes, Maccabi Haifa first, `lib/home/vote.ts`) and are labelled "Early count" on screen. Replace with a real store before launch.

## Gate
tsc clean (only the known pre-existing errors), eslint on touched files clean, 6 vitest shards green, `next build` green.
