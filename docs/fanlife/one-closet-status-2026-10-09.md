# One closet, two apps (2026-10-09)
- Finding: FAN LIFE and THE WORKER already share the closet and market tables (`worker_collector_*`, `worker_auction_*`) in the shared Supabase — same Google account = same closet and same market. Nothing to copy.
- Added: `origin` on closet items (`owned` | `game`). A shirt assembled in Gate 4 (only kits with an exact archive photo) is carried into the closet by `lib/portal/closet-sync.ts` (`ClosetBridge` in the root layout: on load, on sign-in, after each build) as a "Built in the game" item. The table refuses sale/trade for game items until the owner taps "I really own this shirt" (`worker_collector_confirm_owned`). Public "have" counts ignore game items; `youHave` includes them.
- Reverse direction (FAN LIFE → WORKER): nothing to do — the same rows show in the Worker closet.
- SQL (owner, once): `supabase/migrations/20261009180000_worker_game_origin.sql` in the Supabase SQL Editor. Verified on Postgres twice-run + 12 assertions (`supabase/tests/73-game-origin.sql`) in both repos.
- Open: market UI cross-links between the two sites (separate step).
