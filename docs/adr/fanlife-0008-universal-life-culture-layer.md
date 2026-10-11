# ADR-fanlife-0008: Universal LIFE — three-layer chapters, Culture DNA, club dressing

## Status
Accepted (owner approved the plan in conversation, 11.10.2026: "מאשר וסומך עלייך")

## Date
2026-10-11

## Context
The universal engine (`lib/life/universal/`) plays nine chapters for every club. They read the same everywhere; a club differs only by skin and anchors. The Worker's original screenplay is the model: a life told through ordinary nights, with the club arriving as weather. Plan and research: Docs artifact "LIFE אוניברסלי — מחקר ותוכנית שדרוג".

## Decision
1. **Three layers per chapter.** (a) Universal human beat — same for all clubs. (b) Culture Variant — six slots: food, song/chant, route to the ground, ticket/entry, media of the decade, family figure. (c) Archive-anchored night — before / night (three age versions) / after / "where you stood", built only from sourced anchors.
2. **Culture DNA** lives in `club-packs/<id>/life/culture.json`. An empty slot renders neutral text and blocks readiness READY. No slot is filled from memory: each carries a source or a `needsReview` flag. Real people never speak; roles do.
3. **Chapters grow 9 → ~16** (radio, missed bus, away final with friend and debt, loss/relegation FACT/CLAIM/UNKNOWN board, new stadium, Europe trip, home week and promise, career path). Choices are flags with callbacks.
4. **Feed LIFE from gate data** (kit specs, line-ups, Match Master, goal replays); no LIFE-only dataset.
5. **Club dressing layers** (stadium module, night lighting, colour) on the existing skin; rival colour bans per rule 95.
6. **Per-club save key**; hub/middleware wiring; share card; telemetry.
7. Hapoel Tel Aviv keeps its hand-authored LIFE as the **flagship version** inside the engine (decision recommended in the plan; owner has not objected).
8. Rollout order: engine + Culture DNA schema → pilot clubs (Zrinjski, Olympiacos) → HPT, Panathinaikos, AEK → rest.

## Alternatives
Hand-write per club (rejected, XL × 14). Keep nine generic chapters (rejected: clubs feel identical).

## Consequences
+ Each club gets its own story with light adaptation. − Content effort per club is real; readiness gating keeps half-filled clubs hidden.

## Dependencies
ADR 0006 (composer). Rules 11, 8/95, 59, 75, 84.

## Validation
`life:worldlines`, `life:deadends`, `life:budget`, `life:orphans`, `life:sync`, universal-play-probe for each pilot club; Hapoel LIFE unchanged.
