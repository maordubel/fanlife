# The builder's design controls (owner, 13.11.2026)

"More editing: print on the back, background removal, and what helps sell." Every product (new, or re-pressed from its card) can carry a `design`:

- **Print on** front, back, or both. A product without a back print area (a mug, a poster) simply prints its front. Front and back of one variant go into one Printify print area; a back print starts below the collar.
- **Size** for garments and bags: automatic (the kind's rule), small badge, medium, large, full width.
- **Garment colours**: light (default), dark, or every colour. Dark colours need a picture without a paper ground; the desk says so.
- **Remove background** (`lib/shop/cutout`): the border's paper colour is flooded out from the edges, soft edge kept, paper inside the art kept. An upload is cleaned in the browser with a preview and a strength slider; a library picture is cleaned on the server with sharp when pressed.
- **Margin** per product (10–300%), otherwise the shop's.
- The listing text and tags are written for the buyer and for search (`listingOf`): club, city, what it is, fan-art notice, gift words.

**Exact stock (13.11.2026, later):** "Choose exact colours and sizes from the printer's stock" loads every colour (with a swatch from `lib/shop/colours`; an unknown name gets a neutral swatch, never a guessed colour) and size the chosen printer has now. A chosen list overrides light/dark; Printify's 100-variant cap is warned about. The desk's **Ready to sell?** card lists what is done and what is missing (connection, Pop-Up, check-up, products made, waiting, soft prints, open), with links to the one-time Printify steps.
