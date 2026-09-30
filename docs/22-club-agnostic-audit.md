# 22 · Club-agnostic vs Hapoel-specific — audit for the Fan Life portal (29.9.2026)

Method: grep of every source directory for Hapoel/derby/Ussishkin literals, then reading the hits. Counts are files that mention the club out of files in the directory.

## 1 · Already club-agnostic (keep as the engine)
- **Opaque ids and the canonical chain** — `CanonicalMatchId`, `player-master`, `match-master`, `entity-graph` mint ids that carry no club (rules 35, 36). `sport` leads every natural key.
- **Provenance** — every fact carries `source_id` + `confidence`; rule 2 gate for the question generator. Works for any club unchanged.
- **Blind Cow** — recognition model, facet builder, validator, scoring and duel RPCs take a player pool. Only three literals: `build.ts` filters goals by `clubSlug === 'הפועל-תל-אביב'`; Hebrew label strings; the "other clubs" list drops Hapoel TA by regex in `extract-career-clubs.ts`.
- **Royal Rumble engine, Away Days map/venue registry, collector market, stand, polls, challenges, analytics, share cards** — mechanics are generic; club appears in copy and one crest.
- **Ingestion** — MediaWiki is isolated in one adapter (rule 12); the "unreadable → null, unusable → reported" contract is source-agnostic. A new club needs a new adapter, not a new pipeline.
- **DB layer** — `worker_*` tables carry no club column today; a `club_id` column is the one schema change needed (see §4).

## 2 · Hapoel-specific, but already DATA (move to a per-club folder, no logic change)
`content/manual/*` (69 files). Club identity data: `clubs.json` (`isUs`, `isDerbyRival`), `trophies.json`, `seasons.json`, `squads.json`, `players-roster.json`, `matches*.json`, `goals.json`, `lineups.json`, `moments.json`, `songs.json`, `player-song-tunes.json`, `shirt-numbers.json`, kit files (`kit-*.json`, `sponsor-*.json`, `manufacturers.json`, `crest-versions.json`), `venues.json`, `venue-registry.json`, `euro-ties.json`, `fan-culture.json`, `fan-groups.json`, `enemies.json`, `grievances.json`, `quotes.json`, `press-columns.json`. Shared by construction and reusable as-is: `competitions.json` (extend), `club-name-variants.json` (the alias table pattern — rule 7 — is what a new club needs first).
Generated files (`content/generated/*`) are a build of the above; a second club needs its own output folder.

## 3 · Hapoel-specific and IN CODE (the real translation debt)
| Where | What | Fix |
|---|---|---|
| `lib/game/questions/templates/*` (25/84 files in `lib/game`) | Hebrew question prompts hardcode "הפועל תל אביב" (history, europe, kits, players, numbers, generated) | prompts as message keys with `{club}` — also rule 10 |
| `lib/archive/match-master-types.ts`, `lib/game/lineup.ts`, `timeline.ts`, `lib/links` | field names `hapoel`, `hapoelSide`, `forHapoel`, `{hapoel, opponent}` (9 files) | rename to `club`/`side`/`for` — a mechanical refactor; data key stays until migrated |
| `lib/game/archive.ts`, `lib/daily/resolve.ts`, `polls/debates-server.ts` | `DERBY_RIVAL` read from `clubs.json` — already data-driven (rule 13). `goals.ts` still tests `opponentHe === 'מכבי תל אביב'` | use the flag, never the name |
| `blind-cow/build.ts`, `scripts/away-days`, `archive/build-graph.ts`, `life/*` | literal club slug `הפועל-תל-אביב` (13 files) | one `CLUB` context (slug, names, colours, founded year) injected at build |
| `lib/share/story.ts` | `'הפועל תל אביב · 1923'` printed on every card | from club context |
| `lib/kit/crestMarks.ts`, `spec.ts`, `lib/game/craft` | crest keys `worker-hapoel`, stencil text `הפועל` | crest and wordmark per club |
| `lib/brand.ts`, design tokens | red/cream identity | per-club palette tokens; the shell layout stays |
| `lib/gates.ts` | gate plan = Bloomfield's real gates, numbers 1–13 | per-club plan or a generic wall; rule 24 belongs to Hapoel |
| `lib/ussishkin/`, `/ussishkin`, gate 5, derby "hate game" | the supporter-owned club chapter, the curva, the black file | Hapoel modules — a club may opt into `modules: []` |
| `lib/life/*` (107/264 files) | THE WORKER LIFE is a Hapoel-family story from 1978 | keep as a club module; the engine (event log, save fold, world/reach, director) is generic and sits in `lib/life/` — a split into `engine/` vs `content/` is the prerequisite |
| Messages (`messages/he*.json`) | Hebrew only; club words inline | English locale plus `{club}` placeholders |

## 4 · Recommended base for the portal (order)
1. **`ClubContext`** — one typed object (slug, sport, names in each locale, colours, crest, founded, derby rival, modules, sources) read by every generator; replace literals in §3.
2. **`club_id` on every `worker_*` row** and in every content path (`content/clubs/<slug>/…`).
3. **Template i18n** — question prompts and share copy as keys with `{club}`; add `en` locale next to `he`.
4. **Source adapters per club** with the same output contract; club-name-variants and alias table first.
5. **Module flags** — Ussishkin, gate 5, black file, LIFE as opt-in club modules.
6. **Guard test** — fail the build if a shared directory (`lib/game`, `lib/archive`, `lib/links`, `lib/share`, `components/ui`) contains a club literal outside the allow-list (this audit's §3 table is the starting allow-list).

## 5 · Rules from this session that already comply
Recognition weight, prices and the other-clubs clue derive from data (`player-prices.json`, `player-league-appearances.json`, `player-career-clubs.json`); a missing field stays null and the clue is not built. The Royal Rumble price list remains hand-set for Hapoel and must be a per-club input.

## 6 · Done on 29.9.2026 (non-breaking; generated files byte-identical)
1. **ClubContext** — `content/clubs/<id>/club.json` (manifest) + `lib/club/context.ts` (`CLUB`, `CLUBS`, `hasModule`, `fillClub` with `{club} {short} {city} {founded}`). The 25 question prompts in `lib/game/questions/templates/*` and the share-card club line now read it. `tests/club-context.test.ts` ties it to `clubs.json` (identity, derby rival — rule 13).
5. **Modules** — `modules` list in the manifest and `hasModule()`; nothing gated yet (all on for Hapoel), so behaviour is unchanged.
4. **Source adapter contract** — `scripts/ingest/adapter.ts` (`ClubSourceAdapter`, `AdapterResult` with `skipped`/`blocked`, rules 2/6/11).
6. **Ratchet guard** — `tests/club-agnostic.test.ts` + `tests/fixtures/club-literals-baseline.json` (19 files, 75 lines of literals in shared dirs). New literals fail the build; retiring one lowers the number.
Not done (needs a decision or an owner step): `club_id` on `worker_*` tables (touches the shared Supabase project, an owner-run migration); `{club}` message keys with an English locale (the prompts still build Hebrew in code); moving `content/manual` under `content/clubs/<id>/` (a large path change across ~100 readers).
