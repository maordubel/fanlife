# Royal Rumble — what is built (rumble-economy-v1)

The rulebook is `48-rumble-rulebook-v1.md`; this is how the code keeps it. Gate 9: five a side (€15M) and eleven a side (`?mode=xi`, €35M). Both budgets are HARD — no code raises one; a club that cannot field a legal board is *not ready*, with the reason on screen.

## Prices — `content/generated/rumble-prices-v3.json`
Per club, frozen, read never computed: 10 men at €5M, 20 at €4M, 40 at €3M, 60 at €2M, everyone else €1M; an archive under 130 men gets the same ladder in proportion once (largest remainder, at least one €5M, `lib/clubs/rumble-xi/quota.ts`). Whole millions only. The same price in five a side and in the eleven (`ratedPool` and `xiPool` both read `priceFor(club, id)`).
Ordering at freeze (one time): pinned men first (`content/manual/rumble-pins.json` — Hapoel Tel Aviv's ten are THE WORKER's canonical ten), then one score: 55% playing strength · 20% years at the club · 15% goals · 10% terrace standing (Hapoel: THE WORKER's own price). A part nobody wrote down is left out of the score and the rest renormalised. Weights are the rulebook's proposal; **the top ten of every other club is automatic until the owner pins it** — add lines to `rumble-pins.json`, delete that club from the price file, `npm run rumble:prices -- freeze`.
Commands: `npm run rumble:prices -- freeze | migrate | validate`. A man who joins later is added at €1M by `migrate`; no price ever moves.

## One man, one card
`content/manual/rumble-merges.json` (found by `scripts/rumble/find-merges.ts`, editable) folds records of one club that are the same man (same last word, same or nickname first name, years not contradicting, exactly one counterpart each). Surname-only and nickname-ambiguous records are left alone.

## Every man is dealt
- Positions come from the archive, the owner workbook, then `content/manual/player-positions-extra.json` (Wikipedia infoboxes read by `scripts/rumble/fill-positions.mjs`: exact title, a footballer page naming *this* club).
- A man with no recorded position anywhere is `free`: he is dealt into any **outfield** slot (never in goal), rated by the workbook or the club's ordinary midfielder, and is a regular member of the deck.
- **Decks** (`rumble-xi/deal.ts`): per family a fixed order of the whole archive; a board reads the deck at the round's place, so consecutive rounds walk through everyone before any man repeats. The same round is the same board (seed + club + opponent + shape).

## The €5M guarantee
`lib/clubs/rumble-economy.ts`: every board holds at least one €5M man in a legal slot who can be bought with a complete squad still possible inside the budget around him (`withFeatured`; five a side and eleven). If no such board can be dealt in 40 tries the club is NOT READY — prices, budget and roles are never touched.

## The rival
Committed first, from his own club's list and his own €35M, independent of the player. Own club: a different eleven (the board excludes his men).

## The match and the screens
`lib/clubs/rumble-play.ts` tells the football around the decided score; `components/clubs/rumble/*` is the match centre (commentary, stats, teams, half time, speed). The rival is chosen in a drop-down of club cards (`RivalPicker`), the shape on three little pitches.

## 10.10.2026 — owner pricing review, English names, shirts of the period
- **Prices.** The owner's consolidated CSV (`FANLIFE_EIGHT_CLUBS_CONSOLIDATED_AUDITED_2026-10-10`, 1,255 rows) is stored as `content/manual/rumble-review-2026-10-10.json`. Each man in it is matched to the archive by his exact original name (rule 7, never the CSV's row) and pinned at the owner's price in `rumble-pins.json`. THE WORKER's own ten €5M men for Hapoel Tel Aviv keep their pins. Where the owner's price would overfill a rung of the ladder the archive can hold, the man takes the next rung down (the run printed each one). Then the club lists were frozen again: `npm run rumble:prices -- freeze`, `-- validate` (10/20/40/60 exactly for full clubs; proportional once for small ones). CSV rows with no archive record (Hapoel Petah Tikva 28, St. Pauli 51, Celtic 20, AEK 23, Olympiacos 8, HTA 10) are not added: no man is invented.
- **Names.** `content/generated/player-names-en.json` (`npm run rumble:names`) gives every man one English name and how it was found: owner-curated (CSV/workbook) · editor-override (`content/manual/player-names-en-overrides.json`, flagged for native review) · archive-latin · alias-latin (exact alias) · transliterated (Greek by convention, flagged). Display only; ids never change. Scrape junk ("Image: …", brackets) is cleaned; two men with one name are told apart by years; a record with no letter in its name is not a man.
- **One man, one card.** Ten AEK men written twice (Greek + Latin) were merged.
- **Shirts.** Every card wears the kit nearest his years (unknown years: the club's latest). Hapoel Tel Aviv's men wear a photograph of the original shirt of their period from the kit archive when there is one (`lib/clubs/rumble-xi/photos.ts`).
