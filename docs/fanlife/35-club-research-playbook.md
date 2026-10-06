# Club research playbook — what the Panathinaikos package taught the research app

Package: 105 sources · 917 dated matches · 155 lineups · 295 goal claims · 930 archive players · **0 approved**.
Pipeline (club-agnostic): `xlsx-to-staging.py` → `research-staging/<club>/` → `npm run research:stage` (dry run, writes nothing to production) → `npm run research:pack` (review-only `club-packs/<club>/core.json`) → human review → approval → gates.

## Rules now enforced in code (`lib/club-research/rules.ts`, `tests/club-research.test.ts`)
1. **A count is not coverage.** 917 matches say what was collected; the report states "assertions kept out of matches: 598" and every gate LOCKED.
2. **Season comes from the competition.** A date fits a season between 1 Jun and 31 Aug of the second year (5 Jul 1967 final → 1966/67). Impossible tokens (`1996/96`) are reported, never corrected.
3. **A date on the page is not the match date.** Game 35886 shows 6 Oct 2026 in a 2011/12 season → quarantined, no guessed date.
4. **Assertions are not matches.** Result matrices (439), early tables (56), cup-final seasons (33), RSSSF ties (70) never produce a day or home/away.
5. **Source order is not venue.** Finals are `neutral_unassigned`; no home advantage is displayed.
6. **Result layers stay apart:** displayed score, shootout, lots (1969), two-leg finals (1991), aggregate, administrative.
7. **Lineups:** exactly 11 distinct names = candidate only (needs identity + proof it is the starting XI); 12 malformed are blocked with reasons.
8. **Goals merge only on identical identity** (match, scorer, minute, stoppage, credited side, type). Unresolved side stays unresolved; own goals are never flipped. `90+7` keeps minute 90, stoppage 7.
9. **One institution = one source family.** Greek + English site, pao.gr + pao1908.com count once; approval needs two families (Berg 114/74 vs 115/73 is not a second source).
10. **Identity needs a verified provider id.** Names, transliterations and overlapping years are leads (0/930 matched today).
11. **Conflicts stay open with both claims** (1971 second goal: Kapsis 83' own goal vs Haan 87').
12. **Re-import never overwrites a manual approval** (`mergeStaging`: inserts / updates / unchanged / keptApproved / disputed).
13. **Review facts never reach a game.** The compiler drops non-approved players/entities; `REVIEW_CLUB_IDS` keeps such clubs loadable but out of the playable set.

## Research app
`lib/master/adapters/`: closed registry of adapters (collector → parser → normalizer → review). `wikipedia` (existing) and `package` (staged package). Jobs accept `adapter: 'package'`; every finding is `approved:false`; backlog becomes the club's gaps. Add a provider = add an adapter file, never a direct write to generated JSON.

## Still open (from the package backlog)
P0: 1971 second goal · Berg stats · game 35886 date/status · 12 lineups · identity mapping.
P1: modern match pages (starters, subs, scorer side) · league tables from 1999/00 · 1959–2008 dated games · pre-1959 competitions · European ties to match level · all cup rounds · goal attribution.
P2: kits (rights!) · Leoforos/OAKA hosting periods · fan culture · season records.
Images: `imagesUsableInApp=false` for every source.
