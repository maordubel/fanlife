# Shop: the first look is live (owner, 15.11.2026)

- A product's first picture is always the product in use when Printify drew one: a model wearing it, a hand holding it, a child, then a scene (wall, room, table, the dog). The plain product comes second; details (collar label, size chart) last. `lib/shop/build.ts → mockups()` decides, by Printify's camera label, and only among the default colour's mock-ups.
- The product page shows one large picture with thumbnails that wrap (never a sideways strip) and a magnifying glass: hover on a mouse, full-screen with a finger-moved lens on a phone (`components/shop/Gallery.tsx`).
- The hourly check-up re-reads every product's mock-ups and saves a new order when it differs, so the rule reaches existing products by itself.
