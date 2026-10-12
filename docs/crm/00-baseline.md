# CRM × ALL FOOTBALL × FAN LEAGUE — PR-00 baseline (12.10.2026)

Owner's roadmap: `FAN-LIFE-END-TO-END-CRM-ALL-FOOTBALL-FAN-LEAGUE-MASTER-ROADMAP-2026-10-12` (+ CRM 1, CRM 2, ALL FANS 1).
This file is the audit the roadmap asks for before any code: what exists, what is reused, what is new, and the decisions
the owner made on 12.10.2026 that override the documents.

## 0. Base

| | |
|---|---|
| Base SHA | `daeff95` (PR #173, `main`) — the same commit the roadmap was written against; nothing merged since |
| Baseline | `npm run typecheck` green; `npm test` (vitest) green; lint see PR description |
| CI (`.github/workflows/ci.yml`, job `doctor`) | hygiene · provenance · lint · typecheck · life:deadends · master:identity · vitest · master:local-db (PGlite, all migrations) · build · master:core-browser · qa:routes · qa:outage |

## 1. Owner decisions that override the documents (12.10.2026)

1. **Language: English only**, CRM included (the documents asked for a Hebrew RTL CRM; the app went English-only on 6.10
   and the owner kept that). Logical CSS properties and `<bdi>`/`dir="auto"` stay mandatory — names in Greek, Hebrew and
   Croatian keep their own direction.
2. **Fan pages in English** (ALL FOOTBALL, FAN LEAGUE). The Hebrew micro-copy of the documents is rendered in English.
3. **Merge policy:** every PR ships behind a switch that is OFF for fans; Claude merges when CI is green. The owner turns
   features on from the control room (no terminal, no env change).
4. **Yellow:** allowed in FAN LIFE (sparingly); per-club rival-colour bans stay (`lib/clubs/theme.ts`).

## 2. Map — what each roadmap item stands on

| Roadmap area | Existing code (verified) | Reuse | New |
|---|---|---|---|
| Admin frame | `app/master/admin/page.tsx`, `components/master/desk/AdminShell.tsx`, `app/desk.css` (`.desk` scope, rule 99) | frame, tokens, skip link, bottom nav | 7 work areas + Tools, global search, legacy URL map extended |
| Task inbox | `lib/master/attention.ts` (deterministic rules, priority 1–3, href) | detectors as-is | `lib/master/crm/tasks.ts`: stable keys, workflow (open / snoozed / dismissed + reason), re-check before "resolved", persisted in its own store file |
| Players | `components/master/desk/PlayersDesk.tsx` (drawer, filters, URL), `PlayersTools.tsx`, `app/api/master/players/**`, `lib/players/service.ts` | everything — preview / draft / publish / revert / merge stay the only write path | top-level "Players" area (alias of `section=data&view=players`), drawer focus trap + dirty-close confirm |
| Clubs / gates | `lib/master/summary.ts`, `components/master/ClubFile.tsx`, `lib/clubs/gates.ts`, `access.ts`, `thresholds.ts` | read models, activation check | Games area: club × gate matrix + experiences (ALL FOOTBALL) |
| Market / community | `app/master/exchange/page.tsx` (`requireAdmin` + `AdminGate` → `worker_admin_whoami`), `app/master/contributions` | pages and DB checks unchanged | entries inside the CRM frame; no market write is added |
| Storage | `lib/master/durable.ts` (Supabase `worker_fanlife_files`, CAS, migration guard), `store.ts` `mutate()` | all saves | — |
| Flags | none generic; precedent `state.ads` (`app/api/master/[...action]/route.ts`) | same pattern | `state.features` + `lib/features.ts` |
| Trivia (gate 2) | `lib/clubs/trivia-deck.ts` (`clubBank`, `dealMode`), `app/clubs/[slug]/[gate]/trivia-run-actions.ts` (sealed ledger cookie), `ClubTrivia.tsx` | bank engine, ledger, the whole client | run core shared by club + aggregate (`lib/clubs/trivia-run-core.ts`); `ClubTrivia` takes an optional `actions` prop |
| Timeline (gate 13) | `lib/game/timeline-engine.ts`, `lib/clubs/chronology.ts`, `SharedTimelineBoard` (`submit` prop) | engine + board | aggregate pool of namespaced cards |
| Memory (gate 6) | `lib/clubs/memory-deck.ts` (`Pick<ClubData,'identity'|'version'|'memory'>`), `ClubMemory.tsx` | deck, wall, client | optional `reveal` prop on `ClubMemory` |
| Ratings / prices | `lib/clubs/rumble.ts` `ratedPool`, `rumble-xi/prices.ts` `priceFor`, `rumble-xi/simulator.ts` (line strengths, Poisson) | ratings, prices, line model | FAN LEAGUE engine (90-minute event log, subs, tactics) |
| Formations | `lib/clubs/rumble-xi/formations.ts` (`4-3-3`,`4-4-2`,`3-5-2` + `slotsOf`) | slots | — |
| Fan identity | `lib/supabase/server.ts` `createClient()` → `auth.getUser()`; Google sign-in `lib/portal/sync.ts` | user id on the server | — |
| User-owned rows | pattern: RLS on, no client write, `SECURITY DEFINER` RPC or server-only service role | same | `worker_fanleague_*` (3 tables) |
| Backups | `lib/master/backup.ts` dumps every `worker_*` table | new tables are picked up by prefix | — |

## 3. Risks found

1. **Aggregate cannot reuse club actions as they are**: every gate action resolves `slug → requestClub()`; a non-registry
   slug returns null. Decision (ADR-0010): extract the run cores, keep club wrappers byte-identical in behaviour.
2. **Trivia pool ids are per club** (`pool` names collide across clubs). The aggregate namespaces question, pool and fact
   ids as `<club>~<id>`; distractors therefore always come from the question's own club.
3. **Match results must be server-authoritative.** A user-session RPC that accepts a score could be called with any
   score, so FAN LEAGUE writes go through server code that verifies `auth.getUser()` and then writes with the service role
   under a revision check (ADR-0011).
4. **`fromYear/toYear` is a span, not a season roster.** FAN LEAGUE labels decades as "recorded club years intersect",
   never "played in 1985/86" (ALL FANS §4.3).
5. `supabase/tests/*.sql` are not run in CI (only the PGlite migration smoke). New SQL is covered by the PGlite smoke and
   by TypeScript tests of the server logic.

## 4. ADRs

- `docs/adr/fanlife-0009-experience-is-not-a-club.md`
- `docs/adr/fanlife-0010-aggregate-pool-and-shared-run-cores.md`
- `docs/adr/fanlife-0011-fan-league-storage-and-authority.md`
- `docs/adr/fanlife-0012-feature-switches-and-crm-tasks.md`

## 5. PR order (as built)

| PR | Content | Switch |
|---|---|---|
| A | PR-00 + PR-01: this audit, ADRs, `lib/features.ts`, `state.features`, `EntityRef` | — |
| B | CRM: 7 areas, task desk with workflow, global search, games matrix, market/community entries, drawer a11y | admin only |
| C | ALL FOOTBALL: pool, gates 2 · 13 · 6, hub tile, CRM workspace + round lab | `allFootball` |
| D | FAN LEAGUE: eligibility, engine, career, time-machine window, season UI | `fanLeague` |
| E | Friendlies + league operations in the CRM + QA | `friendlies` |
