# LEGENDS MANAGER — fixes F01–F08 and upgrades U01–U05 (15.10.2026)

Source: `FANLIFE-LEGENDS-MANAGER-FIXES-AND-UPGRADES-2026-10-15`. Branch `claude/legends-board-modern-era`, PR #214 (merge is the owner's decision).

## Save contract (unchanged guarantees)
- A career is one compare-and-swap JSON document; every action carries `rev` + an idempotency key. Nothing here changes a rule, a price or the engine's draws (engine goldens untouched).
- New fields are optional and gated: `Career.modernEra`, draft `modern`, the market snapshot, `Career.pendingArchive`. An older career reads as before.
- **Season archive (F04):** a finished season becomes a signed `SeasonArchive` (fixtures with events and line-ups, final table, leaders, squad) carried as `pendingArchive`, written create-only to `season-history/<career>/<season>.json`, read back and verified, and only then dropped from the career. Deleting a career tombstones its archives. Seasons that pre-date this are *summary-only* and say so.
- **Guest claim (F05):** `claims/<guest>.json` is a journal; both owners are locked in sorted order; surplus active careers are archived, never deleted. Only hashes are stored.

## What each item is
| item | where |
| --- | --- |
| F01–F03, F06 | live board restyle, no-spoiler board, modern men first (`lib/legends/era.ts`) |
| F04 | `lib/legends/history.ts`, `store.ts` (`flushArchives`, `readSeasonArchive`), History panel |
| F05 | `lib/legends/ownership.ts`, `store.ts` (`claimDeviceCareers`), `ClaimBanner` |
| F07/F08 | fixed five-candidate market, contacts, scouting, board forecast |
| U01 assistant | `lib/legends/advice.ts` → `view.advice` → `AssistantNotes` (≤3 plain notes; reads, never edits) |
| U02 match report | `lib/legends/report.ts` → `ResultView.report` → `MatchReportCard` |
| U03 compare | `lib/legends/dealplan.ts` (the server's own arithmetic) → `CompareSheet` |
| U04 hall of fame | `lib/legends/records.ts` → `legendsRecords` → `HallOfFame` (Club tab) |
| U05 magazine cover | `lib/legends/cover.ts` (public projection) · `cover-render.ts` (SVG, 1080×1920 and 1080×1350) → `legendsCovers` → `CoverSheet` (History panel) |

## Decisions worth knowing
- **Records** count every event once under `(season, fixture, event)`; a stored archive and the live season of the same number never both count. A sold man stays on the lists. A season without detail still gives titles and places; the board then prints "Detailed records available from season N". Derbies and captain histories are **not** shown: no approved derby list and no captain-appointment history exist in the data, and neither is invented.
- **Late drama** has one definition: the last goal of the match is ours, from the 80th minute, and it wins by one or levels from one behind; replayed from the log and refused if it does not reproduce the stored score.
- **Cover privacy:** the cover is built from a finished, server-saved season and carries only `COVER_FIELDS`. No account, owner, career id, cash, ledger, squad, token or cookie. The link is the manager's *entry* page (`/all-football/legends?club=`), never the career. The public name is off by default (1–18 characters, the person's choice). The badge is the approved mono artwork, never redrawn. Colours come from the club's share palette with its rival-colour policy.
- **No public results route exists**, so there is no public snapshot link; the picture file is the shareable object.

## Tests (what runs where)
Local: `tests/legends` (ownership, history, advice, report, dealplan, records, cover, plus the existing suites) and `tests/highlights`, `npx tsc --noEmit`.
Routes to open by hand: `/all-football/legends` → a career → Club tab (hall of fame) and Stats → History (Open season, Magazine cover); Market → Compare; a result's report; the Matchday assistant.
