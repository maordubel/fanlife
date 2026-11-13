# The competition's own league or federation is enough on its own (13.11.2026)

**Owner's decision (13.11.2026):** "every source that is official to the league is an authoritative source and is enough."

- A source published by the body that runs the competition (the league or the federation: LNFP/FRMF, the Egyptian Pro League/EFA, the IFA, UEFA, the Super League Greece…) is marked `"official": "league"` or `"official": "federation"` in the pack's `sources`.
- A record citing such a source is approved automatically **without a second publisher**. Every other condition of automated approval still holds: confidence 3, `parserCertainty: "high"`, `conflictFree: true`, not sensitive. One reader decides it: `lib/clubs/official.ts → enoughPublishers` (compiler, players, sections).
- Only the competition's own body counts. A club's own site, a broadcaster, a data provider or a fan archive is not official in this sense — those still need a second publisher or the owner's named approval.
- If the official source and another publisher disagree, the record is a conflict for the owner (`conflictFree: false`), never resolved by rank.
