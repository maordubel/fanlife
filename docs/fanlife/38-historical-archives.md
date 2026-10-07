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

## Where it runs
- **GitHub → Actions → Archive collect → Run workflow** (and automatically every Tuesday). It runs on GitHub's network,
  collects a polite batch per club, and commits only `research-data/`. The admin shows it after the next deploy.
- On a writable server (local evaluation) the Data tab buttons collect directly. A read-only server answers with the
  GitHub instruction instead of failing.

## Parsers
- **AEKpedia — done** (`aekpedia-football-v1`): players, coaches and season reviews by the site's own categories;
  name as written + the span on the opening line, as unresolved candidates.
- Next: Celtic Wiki (year/match/player pages via the page hierarchy), Paopedia, Partizanopedia, Immer Unioner.
  Each needs its structure checked first; nothing is extracted from a source without one.
- Raw bodies are not stored (`metadata-only`) until each source's reuse policy is reviewed.

CLI: `npm run research:collect -- <club> [--source id] [--max-requests N]` · `research:export -- <club>` · `research:status`.
