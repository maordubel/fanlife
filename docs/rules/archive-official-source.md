# An official source is enough on its own: the league, the federation, the competition, the club (13.11.2026, widened 14.11.2026)

**Owner's decision (13.11.2026):** "every source that is official to the league is an authoritative source and is enough."

- A source published by the body that runs the competition (the league or the federation: LNFP/FRMF, the Egyptian Pro League/EFA, the IFA, UEFA, the Super League Greece…) is marked `"official": "league"` or `"official": "federation"` in the pack's `sources`.
- A record citing such a source is approved automatically **without a second publisher**. Every other condition of automated approval still holds: confidence 3, `parserCertainty: "high"`, `conflictFree: true`, not sensitive. One reader decides it: `lib/clubs/official.ts → enoughPublishers` (compiler, players, sections).
- **Widened 14.11.2026:** "a club's official site is an authoritative source and approved as a single source; so is a league's federation site, or the competition's own." Marks: `"official": "competition"` (the tournament's own site), `"official": "club"` (the club's own official site — for the club's own facts: its line-ups, its scorers, its kits, its history).
- A broadcaster, a data provider, an encyclopedia or a fan archive is not official in this sense — those still need a second publisher or the owner's named approval.
- If the official source and another publisher disagree, the record is a conflict for the owner (`conflictFree: false`), never resolved by rank.
