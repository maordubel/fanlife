# Historical archive recovery — 18 October 2026

This is newly recovered evidence, not a claim that the interrupted chat's local
files were recovered. The owner approved direct archive/feature integration on
18 October: “תעלה , תאשר את כל המחקר שלך להיכנס ישירות לארכיונים ולפיצרים.”

- `hpt-*.json`: the museum's 86 public season pages, with the original season
  label, source match IDs, scores, neutral-ground indicator and annotations.
  All 3,031 source rows are accounted for: 3,007 played-result candidates and
  24 contextual archive records. Administrative, abandoned, disputed and
  incomplete numerical rows do not enter match-result generators.
- `rsssf-*.json`: 32 public Bosnia-Hercegovina season documents (1994/95–2025/26).
  Exact-day result rows yield 850 candidates: 777 league and 73 cup matches.
  Early seasons without dated individual results remain incomplete. A published
  table is not expanded into invented matches. The 2025/26 document contains cup
  results and a league table, not an individual league schedule.
- Each document carries its URL and a SHA-256 of the downloaded bytes. Declared
  Windows-1250 encodings are decoded before parsing; no replacement glyph is
  accepted in a match name.
- Museum annotations use the owner's exact spelling ruling for שלום תקוה at
  ingestion. Affected snapshots declare this normalization; their SHA-256 still
  identifies the original downloaded bytes, not the normalized JSON.
- `collection.json`: collection coverage and fetch errors.
- `validation.json`: counts and every withheld numerical claim, including the
  disposition of HPT's 24 approved archive-only records.

Recollect with `python3 scripts/club-research/recover-history-2026-10-18.py`.
Rebuild waves offline with `python3 scripts/club-research/build-history-2026-10-18.py`.
Run independent score/coverage and parser boundary checks with
`npm run research:history:check`. Nineteen complete league seasons are checked
against their published match count and goals-for/against totals.

Only the two explicit `wave-history-2026-10-18.json` files are read by runtime.
The source snapshots and this directory are research evidence, not a parallel
game database. Existing approvals, identifiers, lineups, scorers, prices and
player rosters retain precedence. The resolver reports collisions as
`HISTORY_CONFLICT`; a collision never supplies a new match or timeline card.

No complete-history claim, new player, rating, lineup, scorer, goal animation or
play-by-play is inferred from these score records.
