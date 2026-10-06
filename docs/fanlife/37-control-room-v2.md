# Control room v2 — admin, research engine, LIFE display (6.10.2026)

## What changed for the owner
- `/master/admin` has six tabs, and the tab and club live in the URL (a link opens the same screen):
  **Overview · Club file · Data · LIFE display · Updates · Activity**.
- A context bar always shows the three layers of the selected club: **Research** (sources reviewed, findings to decide),
  **Data** (playable gates in the compiled pack), **Published** (status and gates open now).
- **Club file** → Summary · Research (choose the adapter, retry) · Decisions (approve / defer / reject, with a reason,
  25 per page) · Readiness & publish (gate switches with their data state; activation explains every blocker).
- **Data** → research profiles, job states, "Build the plan (offline)" and "Fetch a small batch now (3 pages)".
- **LIFE display** → the real engine in a preview frame with device presets, club/room/time/mood pickers and the
  dials; Save draft → Publish → Revert / Reset; Download display.json. Players get the live version within a minute.
- Phones get cards instead of the gap matrix; every control is at least 44px.

## Audit findings addressed
A02 activation by summary, not by club id · A03 one summary read model · A04 line-ups/scorers held as primary-only ·
A06 package statistics are reports, not findings · A07/A08 data vs open-now kept apart · A10 one access policy ·
A13 changed sources parked, decisions kept · A14 stale gate text removed · A15 sensitive sections by default ·
A16 ingest workflow fails loudly per club · A17 evidence and audit paged.

## Research engine (no AI)
`npm run research:plan -- <club>` · `research:run -- <club>` · `research:status`. Plan for Panathinaikos reproduces the
toolkit: 917 matches, 803 jobs, 112 issues for review. Parsers are added only with a saved fixture; until then a fetched
page is kept as a snapshot marked "needs a parser". Nothing in the engine approves a fact.
