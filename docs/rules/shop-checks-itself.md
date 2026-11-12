# The shop checks itself every hour (owner, 12.11.2026)

"Full automation, a healthy, stable, smart system." `lib/shop/checkup` runs hourly from `.github/workflows/shop-checkup.yml` (and from the desk's **Check now**):

- the token still works and the chosen store is still the Pop-Up (`storefront`) store, otherwise the run goes red;
- every product with a Printify id is re-read: the listing address and mock-ups are refreshed (they change when the store is renamed); a product deleted in Printify is hidden at once, so the site never sells a dead link;
- a press stuck in "building" for 15 minutes, or one that failed on a passing error (no answer, 429, 5xx), is pressed again, at most twice per product and two per run.

It never shows a product or opens the shop: showing stays the owner's eye. The result is kept in the shop record (`health`) and shown on the desk.
