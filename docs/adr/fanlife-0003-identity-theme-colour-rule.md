# ADR-fanlife-0003: Club identity, theme and derived colour rule

## Status
Proposed

## Date
2026-09-30

## Context
Rule 8 bans yellow (Maccabi TA's colour) with owner-approved path exemptions. Owner decision 30.9: the ban is per club, derived from the main rival; historical items are exempt.
## Decision
1. `identity.json`: core colours (evidence from historical kits — colours-of-football, footballkitarchive, oldfootballshirts), rival ref, crest policy (monogram until approved), typographic flavour.
2. `bannedHues = hues(rival) − hues(self)`; empty ⇒ no ban. Stored in identity, computed by the compiler; a club cannot get its final theme before its rival is approved.
3. `isYellow` generalises to `isInBand(rgb, band)`; Hapoel's band is today's yellow. Scanner and unit test read the same function.
4. **Historical exemption:** any asset with a ledger row of kind kit-photo / crest / sponsor-mark / document-scan / press-photo, marked `[data-historical]`. UI and decoration never.
5. Theme tokens generated per club into CSS variables; `BRAND` becomes `brandFor(club)`; share cards use it.
## Alternatives
Hand-set per club (drift); one global ban (breaks Dortmund/AEK). Rejected.
## Consequences
+ Rule stays mechanical. − Rivals with shared colours (e.g. blue vs blue) resolve to no ban; edge cases go to the approval queue.
## Dependencies
Depends on 0002. Blocks M2.
## Validation
Scanner fails a banned hue in three test clubs; exemption count asserted by name per club.
