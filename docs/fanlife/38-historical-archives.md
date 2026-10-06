# Free historical archives — eight clubs (6.10.2026)

## In the control room (click only)
1. **Overview → Add a club** creates the research file and an empty research profile, then opens its **Data** tab.
2. **Data → + Add a source**: WordPress site (posts/pages) or web pages from approved index pages. Validated on save.
3. **Collect next batch** (one source) or **Collect from every source** (10 requests). Batches resume where they stopped.
4. Every batch re-exports staging. **Bring into the club file** turns it into unreviewed sources and a backlog.
5. **Club file → Decisions**: you review. **Readiness & publish → Open all playable gates** when compiled data is playable.
6. **Overview → Autopilot** shows what the scheduled task did; **Run the pipeline now** runs it by hand.

## Clubs and sources (research-profiles/)
| Club | Sources |
| --- | --- |
| AEK Athens | AEKpedia (WP posts+pages) · AEK FC history (HTML) |
| Panathinaikos | Paopedia (WP) · PAO history/honours/coaches (HTML) · RSSSF Greece (HTML, cross-check) · match pages (planner) |
| St. Pauli | MillernTon (WP) · FC St. Pauli Museum (WP) |
| Hajduk Split | Hajduk archive/history (HTML) · Torcida (WP, fan culture) |
| Dinamo Zagreb | Dinamo history + timeline (HTML) · Bad Blue Boys (WP) · HNS Semafor (HTML, unverified) |
| Celtic | The Celtic Wiki (WP **pages** only) · Celtic FC history (HTML) |
| Partizan Belgrade | Partizanopedia (HTML) · Crno-bela Nostalgija (WP) · Partizan history (HTML) |
| Union Berlin | Immer Unioner (HTML) · official season archive (HTML) |

## What is NOT done yet (honest)
- **No parsers.** None is written until fixtures of real pages are stored; until then documents are kept and nothing
  is extracted. Next: AEKpedia (season/player), Celtic Wiki (year/match/player), then PAO via Paopedia.
- From this build server every source answered 403 (its network allowlist). Run from the deployed server; whose block it
  is gets recorded as unknown until checked from another network.
- Raw bodies are not stored (`metadata-only`) until each source's reuse policy is reviewed.

CLI: `npm run research:collect -- <club> [--source id] [--max-requests N]` · `research:export -- <club>` · `research:status`.
