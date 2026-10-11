# Admin UX audit and first repair (11.10.2026)

Before: `docs/fanlife/admin-shots/before/*`. After: `docs/fanlife/admin-shots/after/*` (desktop 1440, mobile 390; no horizontal scroll on any).

## Findings
| # | Sev | Finding | Fix in this PR |
|---|---|---|---|
| 1 | P0 | Publish was hard to find and its disabled state unexplained (needs reason ≥3 chars) | Hint line states exactly why; Publish button in a sticky action bar; club workspace gets a primary "Publish gates →" |
| 2 | P0 | No way to merge duplicate players | Merge duplicates: suggestions with reasons, keeper chosen, preview, price choice, undo |
| 3 | P1 | Overview was one long undifferentiated list | Five quick-action cards; top 5 tasks, rest folded |
| 4 | P1 | Clubs page: ~80 equal cards, 7,148px | Searchable list, compiled-pack clubs first, registered-only folded, gaps table folded (12,330px → see after shots) |
| 5 | P1 | Players tools reachable only via banner | Data sub-nav: Sources · Players · Reports · Merge · Bulk · Contributions |
| 6 | P2 | ELEVEN.budget 33 vs XI_BUDGET 35 | Open — owner to confirm which is intended |

## REUSE / EXTEND / NEW / DEFER
Reuse: AdminShell, deskHref, PlayersDesk, audit log, `?tab=` legacy mapping. Extend: Overview, Clubs, Data, Players drawer. New: `lib/players/{match,merge}.ts`, merge API actions, MergePanel. Defer: Game Control, Archive Quality, Publish Center, Analytics (separate PRs).

## Click paths (before → after)
Edit a player: 4+ → 2 (Overview card → Players). Merge duplicates: impossible → 3. Publish gates for a club: ~5 → 2.
