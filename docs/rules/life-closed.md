# LIFE is closed to the public

Owner, 24.11.2026: close LIFE to the public, Coming soon everywhere, nobody enters but the admin through a dedicated link. Same in THE WORKER.

- Every LIFE address (`/life`, `/life/**` pages and HTML players, `/clubs/<id>/life`, `/telegram/<id>/life`, `/qa/life-*`) is rewritten by the middleware to `/coming-soon/life` unless the request carries the control room's verified cookie. The list lives in `lib/life/lock/paths.ts`; shared assets (`/life/sfx`, `/life/art`, …) stay open because other games use them.
- The server locks it again behind the middleware (`app/life/layout.tsx`, the club LIFE page) and `door('life')` ignores the saved switch: LIFE is owner-only in code. Opening LIFE to fans is a code change on the owner's word, not a toggle.
- The owner's door is `/master/life` (control room → More / side foot): every club's LIFE, published or not, the original Worker LIFE and the labs.
- Every surface that offered LIFE says Coming soon (`lifeEntry` → `soon`); a link that still points at a LIFE address lands on the Coming soon screen, never on a 404.
