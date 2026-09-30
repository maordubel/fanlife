# Ingestion layer

The historical data engine's front door. One pipeline, two sources, one report.

```
 source ──► raw store ──► parse ──► merge/dedupe ──► alias ──► ref check ──► load
   │           │            │            │             │           │          │
 wiki       data/raw     staged      natural keys   explicit    nothing    idempotent
 manual     (pinned to   records     + confidence    table      invented    upsert
            revision)    + source     policy                               (Supabase)
                                            │
                                            └──► data/reports/latest.md
```

## Commands

```bash
npm run ingest -- --source manual --dry-run   # curated JSON only, stage to disk
npm run ingest -- --source wiki --fetch       # hit the wiki, fill data/raw, parse
npm run ingest -- --source all                # both sources, load into Supabase
npm run ingest:dry                            # both sources, no database
```

`--dry-run` writes `data/staging/bundle.json` and the report, and never touches the
database. Without it the loader needs `NEXT_PUBLIC_SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`.

## Layout

| File | Responsibility |
|---|---|
| `scripts/ingest/adapters/mediawiki.ts` | **The only file that knows MediaWiki.** API calls, wikitext syntax. Nothing else may name a provider field. |
| `scripts/ingest/sources/wiki.ts` | Discovery scope, the raw store, page→parser routing |
| `scripts/ingest/sources/manual.ts` | `content/manual/*.json` → staged records |
| `scripts/ingest/parse/index.ts` | Page → staged records. No network, no database — directly testable |
| `scripts/ingest/pipeline.ts` | Merge, aliases, referential checks, coverage, confidence gate |
| `scripts/ingest/load/supabase.ts` | Idempotent upserts |
| `lib/ingest/normalize.ts` | Hebrew and football normalisation |
| `lib/ingest/guards.ts` | Football-only gate |
| `lib/ingest/dedupe.ts` | Natural keys, merge policy, alias table |
| `lib/ingest/report.ts` | The report |

## The rules this layer enforces

**Nothing is invented.** A field that cannot be read stays null. A row that cannot be
used is reported as skipped or rejected with a reason — never dropped silently, never
filled with a plausible value. A date that is partial stays absent. A kickoff time is
never confirmed by the importer.

**Football only.** `classifySport` requires a positive football marker. Basketball is
rejected; a page carrying *both* markers is rejected as ambiguous rather than assumed.
The rejection and its reason appear in the report.

**Every fact carries its source and confidence.** `source_id` + `confidence` 0–3 on
every row. Wiki-sourced facts enter at 1 (single source). Only `confidence >= 2` may
feed question generation, and the report lists everything below the floor.

**Names are matched through an explicit alias table.** `normalizeName` strips
gershayim, diacritics, bracketed qualifiers and punctuation for matching, and the raw
name is always stored for display. Fuzzy matching is deliberately absent. An alias
claimed by two entities is dropped and reported, never resolved by similarity.

*(The one place bracket-stripping is wrong is the sport guard — `(כדורגל)` is the
marker itself — so the guard uses `normalizeLoose`, which keeps brackets. A test
covers it; it was a real bug caught by that test.)*

**Idempotent.** Every entity has a natural key: `slug` for club/venue/competition/
person/era, `label` for season, `(person, season, club)` for squad membership,
`season|competition|home|away|stage` for match, `(match, seq)` for event, and
`natural_key` for source. Re-running produces the same rows. Raw pages are stored per
revision and never re-written. `match_event` is inserted with
`ON CONFLICT DO NOTHING` so the append-only trigger is never provoked.

**Merge policy.** Records sharing a key are merged: the higher-confidence value wins,
a gap is filled from the lower-confidence record (absence is not a fact), and equal
confidence keeps the first value and files a conflict for review. Nothing is averaged
and nothing is last-write-wins.

## The report

`data/reports/latest.md` (and a timestamped copy) contains: totals, discovered,
imported by entity, **coverage** (present/total per field — "0 errors" hides a
half-empty table), skipped, rejected, unresolved entities, conflicts, low-confidence
facts, and every source URL with its revision id.

An `ingest_run` row with the same stats and the full report is written to the database
on a real load.

## Current wiki status — blocked, documented, not worked around

`wiki.red-fans.com` is behind Cloudflare bot protection. Every automated read returns
**HTTP 403**, and the browser route sits on a "Performing security verification"
interstitial that does not resolve for an automated pane. The adapter treats an HTML
response to a JSON request as a hard failure so this can never be mistaken for empty
data, and the CLI records the failure as a rejected record with the exact URL and
status. **No substitute data was invented, and no protection was circumvented.**

Unblocking, in order of preference:

1. Ask the Red Fans wiki owners for permission plus a `Special:Export` XML dump or a
   database dump. Point `WIKI_BASE_URL` at nothing and load the dump into `data/raw`.
2. Ask them to allow a named user-agent (the adapter already sends one, configurable
   via `WIKI_USER_AGENT`).
3. Run `npm run ingest -- --source wiki --fetch` from a normal residential connection
   that has passed the challenge in a browser.

Until one of those happens, `content/manual/` is the working source. It runs through
the identical pipeline, so nothing has to be rewritten later.

## Filling `content/manual/`

Each file declares its own `confidence` and `source`, so a curated fact is auditable
like any other. `people.json`, `squads.json`, `matches.json`, `match-events.json` and
`venues.json` ship **empty by design** — they are filled from
`docs/02-data-questions.md`. Set `confidence: 3` for anything a human has verified.

```json
{
  "note": "why these rows exist and what verifies them",
  "confidence": 3,
  "source": { "kind": "manual", "title": "Maor Dubel", "url": null },
  "records": [
    { "fullNameHe": "…", "aliases": ["…"], "birthDate": "1980-05-12" }
  ]
}
```

`seasons.json` accepts a `generate` range instead of listing labels — that is calendar
arithmetic, and it is loaded at confidence 0 precisely because a label is not a claim
that the club competed that season.
