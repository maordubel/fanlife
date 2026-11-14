## Book & channel banners · the owner's novel and its YouTube channel in the slide-up rotation (14.11.2026)

Owner: *"add ads in Hebrew and English — different ads for our YouTube channel and a different one for reading the book, with graphics by our banner rules, and everything needed to integrate them smartly."*
1. **Six seeds in `lib/promo/seed.ts → SEED_BOOK`**: `book-he`/`book-en` (www.dubelteam.com/broken-collective/{he,en}/), `kypseli-he`/`kypseli-en` (youtube.com/@TheKypseliTapes), and `kypseli-sunday-he`/`-en` (Sundays 08:00–19:00 Athens, weight 40: "new tape tonight" before the weekly premiere). `readPromo` offers them once to a saved doc; one the owner deletes stays gone.
2. **Language by country, never both:** Hebrew twins are `israel`; English twins use the new audience `world` = every visitor outside Israel (validated in `cleanBanner`, filtered in `PromoSlot`, chosen in the Advertising desk).
3. **One product per visit:** `familyOf` maps youtube.com/@TheKypseliTapes → `kypseli` and dubelteam.com/broken-collective → `book`, so a twin or the Sunday variant never repeats the product and "Close" snoozes all of it.
4. **The art is the product's own identity**, not FAN LIFE's magazine: the book's paper/ink/red thread, Karantina and the triptych; the channel's camcorder viewfinder, Special Elite and the REC thread. No owner name on a banner. Regenerate with `node scripts/brand/book-channel-banners.mjs` (sources in `brand/source/book-ads/`; the script refuses a line that overflows the 320×50 strip).
5. Tests: `tests/promo/book-banners.test.ts`.
