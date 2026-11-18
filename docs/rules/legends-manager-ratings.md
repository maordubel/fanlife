# Legends · manager ratings: real shape, shared level, seen only in your own squad (18.11.2026)

Owner, 18.11.2026: every man gets Football Manager–style ratings (technical, mental, physical, goalkeeping), built from the owner's
research pack, fair between the clubs so the contest depends on the squad the manager builds, and visible only on men in his squad.

1. **Shape from the data, level from the stars.** `content/manual/legends-fm-ratings.json` (built by
   `scripts/legends/fm-ratings/build.mjs` from the pack's `manager-ratings.json`) keeps one raw 1–20 profile per man. `lib/legends/fm.ts`
   scales it to his stars (1★ ≈ 8, 3★ ≈ 12, 5★ ≈ 16.5 on his key attributes; character attributes move half as far). Stars stay the
   club-percentile rating of `ratings.ts`, so a bigger club's database never hands it a stronger league.
2. **One man, one profile.** A name-only match counts only inside his years at the club; a date-of-birth match takes the edition
   nearest those years (his best inside them). Gaps: his own editions, then his estimate, then the role median — recorded. A man
   without game data is a *scout's estimate* and the sheet says so.
3. **Hidden.** The view sends `attrs` and `fm` only for the manager's own squad and draft picks; draft offers, the market, the window
   and rivals carry `attrs: {}` and no sheet. Never hide it in the client alone.
4. **The engine** reads the four game attributes per position, now shaped by the profile and centred on the stars (`fmGameAttrs`),
   for catalogs built from this date. A career keeps the catalog it began with.
