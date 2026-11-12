# The shop runs itself (owner, 12.11.2026)

The owner designs and publishes every product himself in Printify. The sale happens in the Printify Pop-Up store (`fanlife.printify.me`, store 29720491, channel `storefront`). The site makes nothing, prices nothing and asks nothing: `lib/shop/sync` mirrors every published product onto `/shop` and the shop strips, with its mock-ups, its lowest price and a Buy link into the Pop-Up checkout. The mirror refreshes behind the page every ten minutes (rule 105); the desk has one button, "Look now".

- A product is shown only when Printify has published it (it has an `external` id or handle) and it is visible.
- The shelf is read from the product's tags or title: a club id or club name puts it on that club's shelf, otherwise FAN LIFE's.
- The shop is open exactly when there is something to sell. There is no open/close switch.
- Supersedes the drafting and pressing of [shop-library-only](shop-library-only.md); that rule's rights line still holds.
