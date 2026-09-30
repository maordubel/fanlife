# ADR-fanlife-0002: Club pack format and compiler

## Status
Proposed

> **עדכון 30.9 (בעלים):** אין שינוי בכתובת `content/manual` של The Worker — לא נוגעים בו. Hapoel נכנסת ל-Fan Life ב**ייבוא** (סקריפט שקורא את תוכן The Worker ומתרגם לחבילה), לא ב-adapter חי. הקומפיילר והפורמט נשארים.

## Date
2026-09-30

## Context
Zrinjski pack (control-plane shape: English strings, letter confidence A–D, score strings, names instead of ids, 13 prebuilt gate payloads) differs from engine shape (`{note, confidence, source, records[]}`, numeric scores, slugs referencing clubs/competitions/venues, stable `p_<hash>` ids, Hebrew `*He` fields).
## Decision
1. A **club pack** = `content/clubs/<id>/`: `manifest.json`, `identity.json`, `layer1-data/`, `layer2-culture/`, `layer3-life/`, `gaps.json`, generated `readiness.json`. Every record: `value/sourceIds/confidence 0–3/status/researchedAt/approvedBy`.
2. A **pack compiler** converts pack → engine `content/manual`-shaped files for that club (names→ids+aliases, scores→numbers, names→slugs, letter grade→0–3, gaps stay null). Prebuilt gate payloads are dropped: gates are computed from layer 1.
3. **Hapoel is not migrated**: `dataRoot` keeps `content/manual`; a `ClubSourceAdapter` exposes it through the same interface.
4. `club:build <id>` runs the 8-step generated chain per club into `content/generated/<id>/`.
5. Match-level cross-check: a real match present in two packs (e.g. Hapoel–Olympiacos) is a free independent source.
## Alternatives
Rewrite Hapoel into packs (risk, no gain); make engine read pack shape natively (touches ~100 readers). Rejected.
## Consequences
+ New club = data. − Compiler must be exact and tested with fixtures. 
## Dependencies
Depends on 0001. Blocks M3, M8.
## Validation
Zrinjski compiles to a full chain with no manual step; staleness tests pass per club.
