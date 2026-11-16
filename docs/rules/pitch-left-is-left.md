# Left is left on every pitch

Every formation table (`lib/game/formations`, `lib/clubs/rumble-xi/formations`) measures `x` from the physical left edge, with the attacking goal at the top. A surface draws it with physical `left: x%` (or SVG `x`), never `inset-inline-start` and never `100 - x`: the app is read in English (LTR) and may be read in Hebrew again, and a pitch does not turn round with the language.

Why: on 16.11.2026 the owner picked a left-back and saw him on the right. The personal XI print (`app/api/shop/personal`) and the scout drawer's mini formation (`RosterSheet`) still mirrored `x` from the Hebrew-RTL days. `tests/pitch-sides.test.ts` guards it.

The only legitimate mirror is the opponent's half: a 180° turn flips both `x` and `y`.
