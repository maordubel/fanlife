# The research desk — why two months of daily research opened no club, and the line that does (10.11.2026)

Owner: *"We have run daily research for almost two months and it has not brought us one new club. Why? Is it
effective?"* and then: *"keep the decision with me, but give me easy access in the admin — simple, click only."*

## What was measured (before)

- `research-daily` ran every morning and opened one PR. Ten clubs without a pack sat in `research-staging/`.
- Every one of them held **the same 80 UEFA matches since 23.10** — `club:wave` read the newest `--max 80` and
  stopped. Three clubs (Dortmund, Dinamo Zagreb, Leicester) held **zero**: the UEFA name on file never matched and
  the discovered id was never saved, so the failure repeated silently every day.
- The staged league history (`wave-history-2026-10-20.json`, 27–725 results a club) was in `review` and nothing
  asked anyone to review it.
- Nothing turned staged material into a club. Opening a club meant a developer writing a pack, a provider entry and
  a registry line. Raja, Wydad and Al Ahly opened that way (28.10), not through the daily run.

Compiled with every waiting batch approved (`npm run research:desk-preview`), each of the ten could open **6–9 of 13
gates** immediately — timeline, trivia, archive, memory, polls, XI, line-up, derby, and Blind Cow for four of them.
The material was there. The decision was never asked for.

## What changed

| Layer | File | What it does |
|---|---|---|
| Staged line | `lib/research/staged/model.ts` (pure) · `pack.ts` | Staged files → **batches** (a history file; the squad read from UEFA team sheets) and the pack a yes makes. UEFA's own matches need no yes (rule 102). A yes is pinned to the content's hash. |
| Decisions | durable `research-desk/<club>.json` | Written only from the owner's session, CAS, audited with before/after. Never in the repository. |
| Resolver | `lib/clubs/resolver.ts → deskProvider` | A registry club with no repository pack compiles from its staged files + decisions (+ desk-pack players), through the same compiler. |
| Preview | `lib/research/staged/preview.ts` · `research-reports/desk-preview.json` | What each batch, and every yes together, would open — compiled once a day, recompiled only when the material changed. |
| Desk | `lib/research/desk-model.ts` (pure) · `desk.ts` · `components/master/desk/ResearchDesk*.tsx` | Control room → **Research**: one card per club, one question, the button; the line of new clubs as punch cards; open clubs with what would improve them. |
| Collection | `scripts/ingest/club-wave.ts` · `clubs/wave.ts` · `clubs/uefa.ts` | Newest 20 + **backfill 30** ties the wave lacks + **refresh 20** held ties for positions/birth dates (`squad`). Discovery looks eight seasons back, wider exact names, and **saves** the id. |
| Report | `scripts/research/daily-report.ts` · `lib/research/report-model.ts` | "What needs you" first; gates gained this week; `NO_UEFA_TEAM` and stalled-club alarms → `research-reports/health.json`, shown on the desk. |

## The full opening (owner: "miss nothing — fully automatic")

The click opens the games at once. Within the hour **club-open** (Actions, hourly) finishes the club as a repository
club — the same wiring Raja, Wydad and Al Ahly got by hand on 28.10:

| What | Where |
|---|---|
| Pack frozen with the owner's approvals | `club-packs/<id>/core.json` (+ `ingest.json`, `wave-auto.json` moved from staging) |
| Every CORE reader: hub tile, /me, sources, players desk, Royal Rumble, LIFE entry, ALL FOOTBALL, LEGENDS, social plan | `lib/clubs/resolver-ids.ts`, `providers.ts`, `euro-wave.ts` |
| Crest | `public/crests/<id>.png`, `lib/clubs/crest.ts`, `content/manual/club-crests.json` (football-logos catalogue, pinned commit) |
| LIFE: names (proposed), birth year (rule 139), chapter-reel stills | `club-packs/<id>/life/*`, `lib/clubs/life/packs.ts`, `public/life/town/shots/<id>/` |
| Spellings, next match, social tag | `lib/clubs/spellings.ts`, `lib/fixtures/teams.ts`, `lib/marketing/tags.ts` |
| Generated lists | Rumble prices (freeze), English names, launch defaults |
| Checks before merge | types, the full test suite as CI runs it, repo hygiene, asset provenance, the compile |

Measured on PAOK in a dry run: 13 files written, crest found, 9 gates playable, every check green after the three
guards that knew only hand-opened clubs were turned to read promoted packs. Stills for all ten staged clubs are already
in the repository, so the first openings do not wait on a render.

## The owner's path (click only)

1. Control room → **Research** (phone: the bottom bar).
2. A card says what is waiting and which gates a yes opens. **Yes — approve** (or *Not now*).
3. A club with no derby: pick its rival from the clubs it met most.
4. **Open <club> to fans** — the same activation check as Clubs → open playable gates.
5. Any decision can be undone from the line ("Your decisions").

## What stays closed on purpose

- Kits, the goal gate and LIFE need real research or writing; the desk says "needs a new source", not "soon".
- Royal Rumble needs positions; they arrive as the refresh re-reads held ties (`squad[].pos`).
- A record a source marks `conflictFree:false` is never promoted by a batch yes (rule 114 §2).
