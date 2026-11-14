# The selling storefront (owner, 13.11.2026)

"Selling, beautiful, inviting, marketing, every sales trick, smart groups." `/shop`:

- **Hook** with three honest promises (original fan art · printed when you order, shipped worldwide · card / Apple Pay / Google Pay). No invented reviews, counts or countdowns: urgency is the true "New" badge (21 days) and a real sale's end date (see shop-sales).
- **Shop by club** chips with counts; then **curated shelves** of four: Just printed, For the wall, Wear it, Matchday gear, Gifts under €25, Home & mugs, Little supporters, Small things (`shelfOf`). One product per design on a shelf; **"Also on N more"** opens the design across every product (cross-sell). A shelf opens to its full grid with sort (newest, price up, price down). Links, not script; the grid wraps (no sideways rail); 2 a row on a phone, 4 on a desk.
- Cards: back mock-up inset, badges (New, Front + back), club, name, product, $ with ≈ €, Buy.
- Search: `ItemList` of `Product` JSON-LD; titles ≤ 60 characters (`fitTitle`, the design name gives way), page description ≤ 160, ≤ 13 tags of ≤ 20 characters (club first).
- **Automatic fitting**: a full-bleed product whose shape differs from the picture's (shape match < 92%) gets the picture extended with its own paper colour (`extendToShape`) — the whole art, never stretched; a cut-out picture or a busy border is left as it is.
- The desk is four tabs: Overview (ready to sell, health, steps), Create, Products, Settings; after Create it jumps to Products.
- Imported from the owner's reference skill set (nexscope eCommerce-Skills, 13.11.2026): only its concrete limits and principles above; its skills are thin wrappers and were not installed.

**Aggressive round (13.11.2026, evening):**
- Club tiles: a roundel in the club's colour with its initials (no crest), name and count; FAN LIFE's own as a star tile.
- **Sale**: the owner runs a store-wide % (and/or shipping) promotion in Printify's Promotions; the desk's *Sale* card mirrors it (%, headline, end date, code). While it runs the shop shows a sale plate with a burst, "was" prices and a −% badge; it ends on its date by itself.
- **Make your own** (`/shop/make`): every design as a tile → the shop filtered to it; the buyer picks product, colour and size at checkout. No product is created per visitor.
- **Quality gate**: a product printing at under 20% of the pixels it needs (`MIN_QUALITY`) is never shown, whatever its switch; the desk marks it.
- The desk's Products tab is **by design**: one card a design (name it once → every product and its Printify listing renamed), show all / hide all / in the shop; products inside with sharpness, price, show switch, More (edit print, view, delete). Ready packs in Create (Starter, Wall, Wear, Gift).
- An edit, a design name, or **Rewrite all listings** sends title, description and tags to Printify and publishes again (`syncListing`).
