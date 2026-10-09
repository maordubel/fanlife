# Shirt hub — Wave 1 (9.10.2026)

Market / Wanted / For you at `/market` (`components/fanlife/market/HubScreen.tsx`, `lib/fanlife/hub/*`, strings in `messages/en.hub.json`).

- Search, facets and the keyset cursor (opened_at, id) run in the database: `worker_market_search`. Facet counts apply every filter except their own dimension. Copies in another currency are hidden by a price filter; swap-only copies stay.
- Wanted board: `worker_wanted_list` returns public requests only — never the private budget (`max_price`) or a user id. `worker_wants_mine` is the only place a budget is returned, to its owner.
- Saved searches (max 20) alert on new matching copies through the existing COLLECTOR_WANT_MATCHED kind, one alert per person per copy.
- Reasons are words ("On your wishlist", "Your size"), never a percentage.
- Migration `20261009090000_worker_market_search.sql` runs after `20260928130000`. If the collector market migration is re-run, re-run this one (the collector file revokes grants for worker_ functions it does not know). Verified by `supabase/tests/70-market-search.sql` via `scripts/db/verify.sh`.
- Deferred: native deals/bundles/offer versions, circles, payments, quick publish from the archive, price-sorted keyset, a UI for `itemDeliverySet`.

## Wave 2 — the deal (9.10.2026)

`20261009120000_worker_deal_wave2.sql` (after the search migration; tests `supabase/tests/71-deal-wave2.sql`, 29 assertions).
- Bundle: `worker_bundle_offer` — one price for several of ONE seller's copies; either side may counter, and `worker_offer_respond` now keeps a bundle a bundle when countered. Acceptance reserves every copy; completing marks them all sold.
- Handover: `worker_handover_set` (meet / post + a ≤140-char note) and `worker_handover_sent` (once per side). Records what two people agree — FAN LIFE never handles money or parcels.
- Feedback: `worker_feedback_give` (good / fine / not good, after completion, once each). `worker_feedback_summary` is public and returns counts only; the note is read only by the person it is about.
- UI: `components/fanlife/market/DealPanels.tsx`, rendered under the thread at `/market/c/[id]`.
- Errors: a missing database function now answers a distinct `setup` error ("The market is not switched on for this site yet") and logs the real message to the console, instead of "couldn't reach the server".

## Wave 3 — place, circles, the pipe, identification help (9.10.2026)

- **Migration `20261009150000_worker_circles_wave3.sql`** (after wave 2; tests `supabase/tests/72-circles-wave3.sql`). The wave-1 search migration was also extended in place (place columns, `ship_scope`, reach queries) — re-run both, in order, after any re-run of the collector file.
- **Place is opt-in.** Country/city are shown on a collector's copies only if they switch `show_place` on. A copy's `ship_scope` (country/world) plus the buyer's country answers "ships to me".
- **Circles** are a club, a country or a city seen as a slice of the market (`/circles/<kind>/<key>`, Circles tab). Never a chat room.
- **The pipe** (`worker_pipe`, top of For you): shirts that match your list, public requests your copies would answer, news from followed clubs — each with its reason, no score.
- **"What shirt is this?"** (`/market/help`): photos + note + club hint; others suggest an archive shirt; the asker picks. Notifications reuse COLLECTOR_MESSAGE with `event`.
- Every club page links to `/market?club=<id>`.
