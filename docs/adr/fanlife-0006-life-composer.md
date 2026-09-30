# ADR-fanlife-0006: LIFE: generic engine, composed chapters, per-club content

## Status
Proposed

> **עדכון 30.9:** אין פריסה לכל מועדון, ולכן הסינגלטונים (`ERAS/CHAPTERS/DIALOGUE`) חייבים לעבור להזרקה: כל כלי ומנוע מקבל `ContentPack`. זה חלק מ-M9 ומבוצע רק בתוך Fan Life.

## Date
2026-09-30

## Context
LIFE engine (`lib/life`) is pure and reusable; chapters are two hand-written records (`ChapterDef` + `Era`) plus 35 authored files, 190MB of Hapoel art, Israeli assumptions (army, shekel, Toto). Audit tools import singletons.
## Decision
1. Keep the engine, formats (`BeatAction`, `Condition`, `ChapterDef`, `Era`) and history director unchanged for Hapoel.
2. Add a **generic beat library** (`content/generic/*`): first match, radio heard, derby week, title parade, relegation day, cup-final travel, new stadium, moving away, national service (per country), mentor route, kit day.
3. A **composer** builds `ChapterDef`+`Era` from the club pack: real anchors (matches with sources), country layer (currency, service, era colour), rival.
4. Birth year = first anchor year − age at first anchor, clamped ≥ 1975.
5. `LocationId` becomes a string per pack; 6–8 room archetypes with a strict art budget; stand-in cast (`STANDIN_FACES`).
6. Per-club deployment removes the singleton problem: audit tools run with `CLUB_ID`.
7. No invented match facts; `placeholder` marker stays.
## Alternatives
Hand-write LIFE for each club (XL × 14). Rejected; generic + anchors is the only scalable path.
## Consequences
+ A pilot club gets a real LIFE quickly. − Quality below Hapoel's authored LIFE; must be labelled as generated-from-anchors, opt-in per club.
## Dependencies
Depends on 0002. Blocks M9.
## Validation
Pilot club chapter passes `life:worldlines`, `life:deadends`, `life:budget`, `life:orphans`; Hapoel LIFE unchanged.
