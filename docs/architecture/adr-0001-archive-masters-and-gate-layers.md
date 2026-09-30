# ADR-0001: Archive masters and gate layers

## Status
Accepted — owner decisions 21.9.2026 (recorded in D2, D3, D4 and D8).

## Date
21.9.2026. Branch `gates-84` @68fc585.

## Engine Compatibility

| Field | Value |
|---|---|
| **Engine** | Next.js 14.2 App Router, React 18, TypeScript. Phaser 3.90 runs THE WORKER LIFE, which this ADR does not touch. |
| **Domain** | Core/Data and UI |
| **Knowledge Risk** | LOW |
| **References Consulted** | `package.json`, CLAUDE.md, `docs/13`, `docs/14`, `docs/16`, `docs/17`, and the six cluster specs of 21.9. There is no `docs/engine-reference/`. |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | Master readers import `server-only`. No truth appears in the RSC or server-action payloads of `/kits`, `/kits/build`, `/trivia/*` or `/timeline`. |

## ADR Dependencies

| Field | Value |
|---|---|
| **Depends On** | None. It builds on rule 35 (`lib/canon/matchId.ts`) and the player side of the database (`20260922090000_worker_shared_project.sql`, which superseded `20260917090000_portal_identity.sql` on 22.9.2026). |
| **Enables** | Server-graded trivia (`rpc_submit_answer`), a lineup ingest, and generated Red Thread levels. |
| **Blocks** | Waves 2 and 3 cannot start until masters-core and progress are merged. |
| **Ordering Note** | Minting is one-way. The Salzburg merge runs before the first `--write-ids`. |

## Context

**Problem.** Maor delivered new HTML prototypes for Gates 1–8 and 10–13. He asked for a gameplay upgrade that keeps the brand and the historical record intact, driven by archive "masters". His standing requirement (rule 76) is that the portal *"יחזיק את כל המידע, **ידבר עם עצמו**, ישתמש בנתונים נכון וייצור סנכרון מדויק"*.

Each prototype carries its own truth (`PLAYERS`, `BANK`, `NODES`/`EDGES`, `ITEMS`, kit options). The repo, as measured, has five problems:
- **Keys.** A player is keyed four ways and a match six ways, and there is no `match-ids.json`. Player Master (719 people, 61 of them phantoms) feeds only tests.
- **Leaks.** 20% of dealt trivia ids contain the answer. V13 put the Gate 4 truth in the bundle. `/kits` serialises every Gate 4 answer.
- **Progress.** Deeds stay local. The Royal Rumble ids are rejected by `worker_gate_run`. Gates 4 and 5 record nothing. The union merge cannot remove.
- **Graphs.** The Gate 12 and 13 prototypes carry two unrelated graphs, and production has none.
- **Renderers.** Gates 4 and 5 use two renderers, and V14 adds a third.

**Constraints**
- **Maor works by clicks only.** He receives ZIP deltas through GitHub web upload, which **cannot delete**. A retired file therefore becomes a tombstone (rule 26, `TOMBSTONES` in `tests/guards.test.ts`), and SQL or deletions arrive with click instructions in Hebrew (`docs/14` §6).
- **Parallel writers.** Several agents write at once, so the two-file i18n split (`he.json` + `he.life.json`) grows into **cluster catalogues** `messages/he.gates.{core,players,kits,challenge,replay,archive,card}.json`. A duplicate key fails `tests/i18n.test.ts`.
- **Brand.** Tokens only; vermilion `#B02D10`; no yellow, gold, amber or orange, measured on the decoded file (rules 8, 27, 61, 62); logical RTL properties (rule 9).
- **History.** Confidence ≥2. Conflicts are kept (rule 60 §3). Nothing is invented.
- **Baseline.** Green: 106 files, 2,543 tests.

## Decision

### D1 — The masters layer
A master is a **generated, deterministic, provenance-keeping index of archive truth**:
- **Build.** A script `scripts/**/build-*.ts` writes `content/generated/<name>.json` with `{schemaVersion, generatedAt, inputsSha, counts, rows, report}`.
- **Read.** There is one `server-only` reader.
- **Fields.** Every field is `{value, source, confidence, alternates?, conflict?}`.
- **Rebuild.** A rebuild is byte-identical except for `generatedAt`, and a stale `inputsSha` fails a test.
- **Ids.** **Builders never mint ids.** They read registries in `content/manual/`. An unknown id is a build error; an unresolved name goes to `report`.
- **Client.** The client only ever receives projections.

| Master | Stable id | Reader | Consumers |
|---|---|---|---|
| **Player Master v2** | `p_`+10 hex in `player-ids.json`; merges only via a reviewed `player-aliases.json` (rule 7) | `lib/archive/player-master.ts` | Gates 1/3/7/9/10, trivia, graph. `roster-facets`, `rosterIndex` and `xi/board` become views over it. |
| **Match/Moment Master** | `m_` from `match-ids.json`; `goal:<id>` / `moment:<slug>` | `lib/archive/match-master.ts` | Gates 2, 3, 8, 9, 10, 12, 13 |
| **Kit Master** | `kit-<yyyy>-<yy>-<variant>`; alias `legacyKey` (`2009/10\|home`) | `lib/kit/kit-master.ts` | Gates 4 and 5, `/kits/archive`, Rumble, XI minis, graph |
| **Question Master** | opaque `q_`/`f_`+hash; `aliases{old→new}` | `lib/game/question-master.ts` | Gates 2, 6, 13 (order mode), 10 |
| **Entity Graph** | reuses the ids above, plus `season:` `team:football:` `place:` `trophy:` `column:` `tie:` `song:` `fans:` `crest:` `maker:` `sponsor:` | `lib/archive/graph.ts` (server), `graph-types.ts` (client-safe) | Gates 12, 13, 10; the Gate 6 shelf; `/hapoel` |

**What each master adds**
- **Player Master v2**
  - `kind`: pickers show players only.
  - `foreignSlot{status, from}`, kept apart from `declaredNationality`.
  - `spells[]`.
  - No phantoms: unmatched shirt-number spellings are reported, not created.
- **Match/Moment Master**
  - The two Salzburg rows become **one** `m_` with both dates in `claims[]`.
  - A move stores zones and the reporter's text, never `rx`/`ry`.
- **Kit Master**
  - Sourced fields.
  - `evidence`: an exact photo for 12 kits; the rest are candidate photos marked "בערך".
  - `gate4.playable`: 31 of 35 kits.
  - The graph uses this id, which settles the specs' disagreement over `kit:<season>|<variant>`.
- **Question Master**
  - One answer and three real distractors.
  - No conflicted fact is ever asked.
  - `sport` on every question.
- **Entity Graph**
  - About 5,700 entities and 12–14k edges, each with a `labelKey`, `sourceIds` and a confidence of high, medium or low.
  - No cross-sport edges.
  - Press rows yield `low` edges only, and those never reach Gate 13.

**Not masters**
- The Worker Card is personal state, read through a typed `CARD_SOURCES` registry.
- Gate 11 reads `enemies.json` alone (Maor is the source, rule 18).

### D2 — Ids are minted now (owner decision)
- `m_` for every match row, after the Salzburg merge.
- `p_` for the 658 roster persons.
- The registries are append-only. A correction adds an alias and never re-mints (rule 35).

### D3 — The progress and event layer
**Events.** `lib/profile/events.ts` `emit(GateEvent)` does three things:
1. `applyEvent` inside `store.update()` — the only local write.
2. A fire-and-forget push to the portal when the player is signed in.
3. `track()` with ids and integers only.

`RecordRun` becomes an emitter; its props stay the same, plus `variant` and `seed`.

**Gate ids and deeds**
- A gate id is `gateId(href)[/variant]`.
- `wallGate()` resolves an id by its longest prefix.
- `royal-rumble` and `royal-rumble-live` become aliases.
- A deed counts once per gate per day and goes to `worker_gate_run` as `deed:<gate>:<day>`.

**Collections**
- Collections only grow.
- Save and un-save are **parity tokens** (`id#k`, odd means saved), so a union merge can still remove.
- `PREFERENCE_SETS` never count.

**One SQL file (owner decision).** `supabase/migrations/2026092…_gates_sync.sql` adds:
- `worker_profile_item` + `worker_collect`;
- `worker_question_mark` + `worker_mark_questions`;
- on `worker_profile`: `card`, `card_edited_at`, `supporter` and `shirt_number`.

Every table has owner-only RLS, and `worker_poll_vote` stays unlinkable (rule 76).

**Merge rules**
- Counters take `max`.
- Sets are unions of parity tokens.
- Card and supporter: newest edit wins.
- Question marks: newest per question, counters take `max`.

Until the SQL runs, everything still works locally.

### D4 — One kit engine, two looks
- `resolveKitRender(spec, mode)` returns one layer plan, and `KitShirt` is the only public entry.
- **Photo mode** draws the *same* SVG surfaces in the template's geometry on a 1122×1402 viewBox, with greyscale `shading.webp` (multiply) and `highlight.webp` (screen) laid over them.
  - Marks sit under the shading.
  - It is enabled per body template via `kit-templates.json`.
  - A kit renders photo only if *every* offered option has geometry; otherwise it renders vector.
- **Crests always come from `crestArt()`.** Photo cut-outs are never builder parts.
- **Real maker and sponsor logos (owner decision) are allowed in Gates 4–5.** This is a dated exception to rule 25:
  - It is recorded like `yellowExemptions`: approver, date and exact paths.
  - Yellow logos are recoloured to 0 yellow, measured on the decoded file.
  - Everywhere else the alternative marks and the lettered sponsor stay.

### D5 — Three experience families (brief §4.2)
- **Challenge** (Gates 2, 3, 6, 7, 8, 11, 13): `session.ts`, a skippable `StageCard`, `HUD`, `Reveal.tsx` (rule 78), `RecordRun`, `ShareRow`.
- **Workspace** (Gates 1, 4, 5): one full-bleed screen with the object dominant, a step strip, Undo and Reset.
- **Explore/Identity** (Gates 10, 12): a dock or tabs, no run clock, deeds instead of scores.

**Shared pieces**
- New: `answers/{TrueFalse,OrderPicker,PairMatcher,YearScale}`, `EntityCard`, `NumberPicker`.
- Extended: `RosterSheet` gains `initialFilter`.

### D6 — The server deals and grades
- **Delivery.** Server actions deal and grade. Ids go out via `publicId`, and truth is never serialised.
- **Gate 4 hints** return signed receipts; the penalty is `max(receipts, claim)`.
- **Gate 4 unlock.** An HMAC token over `kitId|dna` (`lib/kit/unlock.ts`) unlocks DNA through `kitDnaFor`. A locked kit sends only `{key, seasonLabel, variant, decade, playable}`.
- **Gate 13 `tryLink`** runs on the server, and no adjacency reaches the client.
- **Gate 8's hint** returns an envelope, never a point.
- **Known limit.** An anonymous player can replay a receipt.

### D7 — Cluster catalogues
- New strings go only into `he.gates.<cluster>.json`.
- `he.json` gets no new keys, and existing keys stay (rule 32).

### D8 — Gate 13 (owner decision)
- The **Red Thread is the main game** at `/timeline`.
- The chronology game stays as the variant `/timeline/order`, with its cursor bug fixed.
- Levels start curated (`red-thread-levels.json`, approved by Maor); generated levels come later.

### Architecture diagram
```
content/manual/*.json (rows·source·confidence)    registries (mint-once): player-ids (p_) · match-ids (m_)
        ▼
scripts build-*  players · matches · kits · trivia masters · archive:graph   (never mint)
        ▼
content/generated/*.json ──import 'server-only'──▶ lib readers
        │  deal · grade · tryLink · search · describe   (server actions, publicId)
        ▼
 Challenge 2·3·6·7·8·11·13 │ Workspace 1·4·5 │ Explore/Identity 12·10
   Reveal · StageCard · answers/* · RosterSheet · KitShirt(vector|photo) · EntityCard · ShareRow
        │ emit(GateEvent)  (RecordRun)
        ▼
lib/profile/events.ts → store.update(applyEvent)   ── the only local write
   ├─▶ lib/portal/sync: worker_gate_run · worker_profile_item · worker_question_mark · worker_profile.card/supporter
   └─▶ lib/ads.track (ids + integers)
lib/profile/card.ts (CARD_SOURCES) ◀ profile + MemberBook + describe()  → Gate 10, cardStory
```

### Key interfaces
```ts
playerById(id: PlayerId): PlayerRecord | null;   resolvePlayer(nameOrSlug: string): PlayerId | null
pickerRoster(filter?: RosterFilter): PickerRow[]
matchById(id: MatchId); momentById(id: `goal:${string}` | `moment:${string}`)
resolveKitRender(spec: KitSpec, mode: 'vector' | 'photo'): KitLayerPlan
dealRun(spec: RunSpec, ledger: { wrong: string[]; seen: string[] }, seed: number): PublicQuestion[]
grade(publicQid: string, seed: number, answer: Answer): Verdict
tryLink(levelId: string, from: EntityId, to: EntityId): { ok: boolean; labelKey?: string; sourceIds?: string[] }
type GateEvent = { type: 'gate_completed'; gate: string; variant?: string; score: number; correct: number; asked: number; seed?: number }
  | { type: 'deed'; gate: string } | { type: 'kit_unlocked'; kitId: KitId } | { type: 'kit_design_saved'; designId: string }
  | { type: 'trivia_wrong' | 'trivia_revenged'; questionId: string } | { type: 'archive_saved'; entityId: string }
  | { type: 'goal_rebuilt'; replayId: string; score: number } | { type: 'red_thread_completed'; routeId: string }
  | { type: 'hate_wall_completed'; seed: number; survivorId: string } | { type: 'shared' | 'duel_taken' }
```

## Alternatives Considered

1. **Embed each prototype as a page** (iframe or verbatim port).
   - *Pro:* fastest and pixel-true.
   - *Con:* a second design system (`#d7192d`, Arial, CDN Tailwind), demo data shown as fact, raw `localStorage`, and 8.4 MB of base64 in Gate 10.
   - *Rejected* by brief §32 and rules 1, 8, 10.
2. **A dataset per gate.**
   - *Pro:* the clusters stay independent.
   - *Con:* the same person, match or kit gets a different id in each gate, so Gate 12 cannot link to Gate 13 and Gate 4 cannot link to Gate 5. Every correction has to be made N times.
   - *Rejected* by brief §5–§7 and rule 59.
3. **Graph and grading on the client.**
   - *Pro:* no round trips.
   - *Con:* the answer sits in the bundle (the V13 and trivia leaks), and the graph is megabytes on a phone.
   - *Rejected* by rule 4 and brief §26.
4. **A second renderer for the V14 layers.**
   - *Pro:* one shirt looks right today.
   - *Con:* it covers one season only. Its "exact" layers are cut-outs of the answer, and their RGB survives under alpha. It weighs 22.4 MB and carries yellow.
   - *Rejected* by brief §8 and §15. Photo mode gets the same look for any spec at about 0.7 MB.

## Consequences

**Positive**
- One id per person, match, kit or entity across the twelve gates and the card.
- One graph and one renderer.
- No truth reaches the client.
- Progress syncs across devices.
- Parallel work stops colliding on the catalogue.

**Negative**
- Five builders to re-run.
- Irreversible mints.
- One server round trip per answer or link.
- Rule 25 is widened for two gates.
- Maor has manual steps: one SQL file, plus the GitHub deletions of V13's four root docs and `public/kits/knowledge-v13/`.

**Risks and mitigations**

| Risk | Mitigation |
|---|---|
| A wrong merge before minting | Reviewed alias files only |
| A stale master | The `inputsSha` test; masters ship in the same ZIP |
| Conflicts in append-only files | One commit per cluster; the integrator concatenates |
| Photo art missing | Per-template fallback to vector |
| JSON bloats the serverless bundle | Server-only imports; function size measured in QA |

## Requirements Addressed

**Brief §33**

| Items | Met by |
|---|---|
| 1, 20 (playable, substantial) | D5 and the per-gate specs |
| 2, 3, 12 (native look, no forbidden colours) | Tokens, D4 recolouring, `qa:sweep` and the probes |
| 4, 5, 18, 19 (shared systems, canonical data, no dead demo code) | D1, D2, tombstones |
| 6, 7, 8 (one renderer, one graph, one player source) | D4, the graph, Player Master v2 |
| 9 (persistence) | D3 |
| 10, 11 (mobile, RTL) | D5 layouts; widths 320/390/430/1280 |
| 13, 14, 15 (no passive waits, undo, reveals) | `useReveal`, skippable `StageCard`, Gate 8 step-undo |
| 16 (LIFE unaffected) | LIFE is untouched |
| 17 (build and tests) | Validation Criteria |

**Brief §30**

| Gate | Met by | Real-data limit |
|---|---|---|
| 1 | Player Master picker; foreign-slot filter; version follows the filter; poster with mini kits; challenges as constraints, not scores | — |
| 2 | Question Master; Quick Pick with 7 modes; 12 questions in 6 types; Revenge from `worker_question_mark`; Match Report | songs 18 |
| 3 | Match Master lineups; line-band zones; ≤3 locks; skippable reveal | 5 playable (2000/01 withheld) |
| 4/5 | D4, D6; 5 steps over 8 fields; evidence reveal; token → DNA; "Brief Fit", not a fan meter | 23 of 35 without an exact photo; no crest art for 1997–2000 |
| 6 | Master fact pairs; no shirt↔season pairs; shelf ids resolve in the graph | — |
| 7 | No score; per-question pre-filter; `MemberBook.supporter` stores ids | — |
| 8 | v6 step bar, envelope hint, bridges, `useReveal`; `progress.ts` tombstoned | 21 goals; 3 on hold for conflicts |
| 10 | Existing Google auth; anonymous-first; `book.card`; `CARD_SOURCES`; no base64 | — |
| 11 | `enemies.json`; 8 rounds; revenge once; `WALL-` code; same-wall link | 56 names |
| 12 | Graph dock; two-tap box; sourced drawer; deterministic rabbit hole; trail; parity Mine | venue pass |
| 13 | D8; `tryLink`; labels with sources; per-level time rule | thin fan-culture edges |

## Performance Implications
- **CPU.** Builders run offline. Masters are memoised once per process. The trivia lobby's five bank rebuilds per visit become precomputed counts.
- **Memory.** The server holds Player Master (≈0.9 MB) and the graph (a few MB). The client receives projections only.
- **Load.** Gate 4 drops from 22.4 MB (V14) to about 0.7 MB of WebP maps per template. Heavy gates are lazy-loaded, with no base64.
- **Network.** One small action per answer or link. Sync is fire-and-forget, and `worker_collect` is batched.

## Migration Plan (saved device data)

| Data | What changes |
|---|---|
| Player slugs (`worker.xi.v1`, `xi_pick`) | Mapped to `p_` at read time; written back on the next save. |
| Gate 7 ballots | `nameHe` and position labels migrate in `read()`. `board.ts` merges legacy `worker_poll_vote.pick` values through `resolvePlayer`. No SQL. |
| Gate ids | The Royal Rumble aliases are applied at read time. `/trivia/<topic>` rolls up to `/trivia`, and old topic routes stay as aliases. |
| Collections | Existing members count as saved; parity applies from now on. `kit:<maker>:<from>` becomes an alias of `maker:<slug>`. `lineup.reveal` becomes a preference. |
| Kits | `worker.kits.v1` keys are accepted once; `legacyKey` resolves to `kit-…`. |
| Replay | `worker.replayProgress.v1` was keyed by article title (5 collisions), so it is dropped rather than guessed. Best scores remain in `profile.gates['/goal']`. |
| Card | Punches merge into `profile.days`. `forgetDevice` gains its three missing keys. |

## Validation Criteria

**Build gates.** `tsc -p tsconfig.all.json`, the full `vitest` suite, `eslint` on changed files, `repo:hygiene`, `assets:provenance`, `story:overlap` and `qa:sweep` must all be clean.

**New tests**

| Test | Asserts |
|---|---|
| `player-master` | Every slug and lineup name resolves; no phantoms; stable ids |
| `match-master` | Aliases resolve; every goal has a match or a stated reason |
| `kit-master` | Every field sourced; conflicts listed |
| `kit-gate4` | No truth, season, `/kits/` path or year in the deal; photo invariant; server hint penalty; 4→5 token |
| `kit-render` | One plan for both modes; the crest comes from `/brand/crests` |
| brand ledger | `yellowPx: 0` for every file under `public/kits/` |
| Question Master | Answers survive the rebuild; no answer inside any dealt id (400 seeds) |
| `entity-graph` | Every edge has sources; no cross-sport edge; no `low` edge in Gate 13; byte-identical rebuild |
| `thread` | Curated levels and 300 seeds all solvable |
| `progress` | Deed idempotency; plate 9 lights |
| `worker-card` | Gate 7 flows into the card |
| `portal-sync` | Anonymous → signed-in |

**Probes and screenshots.** `gate4-probe`, `gate3:probe`, `goal:probe`, and screenshots at 320×568, 390×844, 430×932 and 1280×800.

## Related Decisions
- `docs/16-gates-upgrade.md`, `docs/17-gate-8-envelopes.md`, `docs/13-player-master.md` (superseded for ids), `docs/14-portal-identity.md`.
- CLAUDE.md rules 1, 4, 5, 6, 7, 8, 9, 10, 18, 20 (to be updated to name the engine), 24, 25 (the logo exception), 26, 27, 32, 35, 59, 60, 61, 62, 69, 76, 78.

## Work board

**Waves.** Every cluster runs in its own worktree from `gates-84` @68fc585.

| Wave | Cluster (catalogue) | Owns |
|---|---|---|
| 1 | **masters-core** (`core`): mint, PM v2, Match Master | `content/manual/{player-ids,player-aliases,match-ids}.json`, `scripts/players/**`, `scripts/archive/build-match-master.ts`, `scripts/ingest/lib/matchIds.ts`, `lib/canon/**`, `lib/archive/{player-master,match-master}.ts`, `lib/game/{roster-facets,roster-search,allTimeXI,archive}.ts` |
| 1 | **progress** (`core`) | `lib/profile/{store,standing,events}.ts`, `lib/portal/**`, `components/play/RecordRun.tsx`, `lib/gates.ts`, `supabase/migrations/*gates_sync.sql`, `types/database.ts` |
| 1 | **kits** (`kits`): Kit Master, photo mode, Gates 4/5 | `lib/kit/**`, `components/kit/**`, `app/kits/**`, `scripts/kits/**`, `lib/game/{kitBuild,kit-build-run}.ts`, `public/kits/templates/**` |
| 1 | **replay** (`replay`): Gate 8 | `app/goal/**`, `components/replay/**`, `GoalPitch.tsx`, `lib/game/{replay/**,goal*.ts}`, `content/manual/goals.json` |
| 1 | **challenge** (`challenge`): Question Master, Gates 2/6/11 | `lib/game/{trivia,question-master,memory*,hate*}.ts`, `lib/game/questions/**`, `scripts/trivia/**`, `app/{trivia,memory,derby}/**`, `components/play/{answers/**,StageCard.tsx}`, `components/memory/**` |
| 2 | **players** (`players`): Gates 1/3/7 | `app/{xi,lineup,polls}/**`, `lib/{xi,polls}/**`, `lib/game/lineup*.ts`, `components/{roster,ballot}/**`, `content/manual/lineups.json`, `lib/game/member.ts` |
| 2 | **archive** (`archive`): graph, Gates 12/13 | `scripts/archive/build-graph.ts`, `lib/archive/{graph,graph-types,wing}.ts`, `app/{archive,timeline}/**`, `components/archive/**`, `lib/game/{thread*,timeline}.ts`, `content/manual/red-thread-levels.json` |
| 3 | **card** (`card`): Gate 10 | `app/tik/**`, `lib/profile/card.ts`, `components/profile/NumberPicker.tsx` |

**Dependencies**

| Cluster | Needs |
|---|---|
| players | masters-core, progress |
| archive | masters-core, kits (ids), challenge (dated facts) |
| card | progress, players, archive, kits, challenge |
| replay | masters-core, for `momentId` wiring |

**Shared files**
- **Append-only**, one commit per cluster: `tests/guards.test.ts` (`TOMBSTONES`), `docs/shipped-paths.txt`, `content/manual/{asset-provenance,fact-conflicts}.json`, `package.json` scripts, `lib/share/story.ts`, `tests/brand.test.ts`.
- **Frozen:** `messages/he.json` and `lib/i18n.ts`.
- **Another cluster's files.** Changes there, such as challenge's `Profile.marks` in `store.ts`, `merge.ts` and `sync.ts`, land after merge 2 as a separate commit.

**Merge order**
1. masters-core
2. progress
3. kits
4. replay
5. challenge
6. players
7. archive
8. card
9. Integration QA: suite, probes, screenshots at four widths, payload-leak probe, function size.
10. The delta: ZIPs of ≤100 files, the rebuilt masters, one SQL file, and Hebrew click instructions for the SQL and the GitHub deletions.
