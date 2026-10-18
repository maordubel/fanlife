# Hapoel Petah Tikva and Zrinjski archive recovery

The interrupted research chat reported local results without a persisted branch
or PR. This change recollects the public sources, records approval from the
owner's 18 October instruction, and connects the validated results to the
existing club resolver.

## Measured compiled output

| Club | Matches before | Matches after | Documented elevens before/after | Trivia before | Trivia after |
| --- | ---: | ---: | ---: | ---: | ---: |
| Hapoel Petah Tikva | 71 | 3,014 | 54 / 54 | 449 | 5,499 |
| Zrinjski Mostar | 146 | 993 | 106 / 106 | 947 | 3,586 |

Counts are from `loadClubBase`, with the precompiled reader disabled, rather than
the size of a downloaded file. Existing match identifiers win when records agree;
incoming checked sources and the documented season label are attached without
replacing a lineup or scorer. The published archive, chronology, memory and
English Question Forge all consume the same merged `ClubData`. ALL FOOTBALL
continues to use its existing stratified per-club question cap.

HPT's museum supplies 3,031 records across all 86 listed seasons: 3,007 played
results plus 24 explicitly labelled archive-only fixtures (administrative,
abandoned, disputed or incomplete). The latter supply fixture context, never a
final played score. Original labels such as `1955` and `1966/68` are preserved;
the forge uses the explicit source season before its legacy July fallback.
Neutral-ground results do not invent a home side; shootouts stay separate.

RSSSF supplies 850 exact-day candidates across 26 season documents. Six earlier
documents do not yield dated individual results. League-table aggregates,
two-leg summary rows, ambiguous date ranges, undated claims and administrative
results are excluded. Declared legacy encodings are decoded explicitly.

## What is connected

- Living Archive, search, Today, chronology and memory receive approved dated
  match projections with source links.
- Match score/opponent/season trivia receives the approved match facts in English.
- Existing lineup, scorer, mystery, Rumble and Legends pools retain their data.
  This import supplies no newly invented player or play-by-play information.
- A changed result, unresolved short name or multiple existing records on a day
  produces `HISTORY_CONFLICT`, retaining existing facts and withholding the new
  candidate. It cannot silently enter chronology by a separate path.
- Gate publication switches and existing readiness rules retain authority.

Evidence, hashes, held claims and reproducible scripts are documented in
`research-data/history-recovery-2026-10-18/README.md`. Source-boundary and exhaustive
coverage checks run in CI through `research:history:check`; feature integration,
collision quarantine and preservation are covered by `tests/clubs/history-wave.test.ts`.

This is an archive expansion, not a declaration of complete club history. In
particular, RSSSF's older seasons and individual 2025/26 league results need
additional dated sources. No number reported by the interrupted chat is used as
a target or fabricated to make the new totals match it.
