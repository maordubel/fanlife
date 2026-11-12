# The shop prints only from the library, and sells only what is ours to sell

**Owner, 12.11.2026.** "I don't like that you invent new graphics instead of using the library we already have through the studio. Keep one brand and design line."

- The shop (`/shop`, `lib/shop`, control room → Shop) draws nothing of its own. A product's picture is a file from the owner's Drive library (`docs/fanlife/drive-library/inventory.json`, the same inventory the Football Stories studio uses) or a picture the owner uploads in the desk. No generated artwork, no new illustration style.
- Fan art only: no official club crest, no registered club name, no player's face, no photograph we did not take. Folders drawn over photographs or archive material are marked "check rights" in the picker and are never put into launch drafts.
- The checkout is Printify's Pop-Up store (owner's choice). The token is kept server-side (`PRINTIFY_API_TOKEN` or the `shop-secret` file area) and never reaches a browser.
- A product is public only when it is `live`, has a link, and the owner switched it on; `/shop`, the menu link and every shelf render nothing while the shop is closed (a door never leads to an empty room).
- The shop and the supporters' shirt market are one counter: `/shop` carries the door to `/market`, `/market` and a club's home carry the shop's shelf (`components/shop/ShopStrip`).
