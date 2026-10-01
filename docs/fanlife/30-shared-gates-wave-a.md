# Shared gates — first playable wave

Authority: the owner's 1 October instruction prioritizes playable gates over further cosmetic work. The canonical Bible still governs data, approvals and one engine per gate. The owner authorizes merging changes after successful verification. Work is in Fan Life only; The Worker remains independent.

## What this wave delivers

| Gate | Shared flow | Club data |
| --- | --- | --- |
| 1 — All-time XI | Four existing formations, position/name/era scouting, documented fit, distinct picks, captain, device save/reload | Compiled canonical players; Hapoel Player Master through its adapter |
| 2 — Trivia | Existing six interaction types, original dealing/grading, topic/era/hard filters, clock, lives, combo, auto-reveal/advance, match report and replay | Server-only club question bank; Hapoel football questions carried forward; small packs derive date checks from already eligible events |
| 6 — Memory | Original seeded rotation and category/era ordering, pair matching, sourced pair reveal, completion and replay | Legacy candidates through the adapter, or distinct event/date pairs from eligible pack events |
| 12 — Archive | Search, on-this-day, paging, individual record, date/confidence and source links | Eligible chronology projection; unapproved research remains in the admin evidence console |
| 13 — Timeline | Existing shared chronology unchanged | Existing three-club projection |

This is a first working archive projection, not the complete native Entity Graph/rabbit-hole experience. Shared XI uses neutral name chips; real historical shirts, player versions, sharing and native manager prompts are not migrated in this wave. Trivia's native revenge/hint/personal-run APIs remain intact in the extracted engine; the shared UI exposes seeded filtered runs. Native Hapoel screens and LIFE remain accessible from `/ground`.

## One engine

`lib/game/trivia-engine.ts` injects the bank into the original algorithm. `lib/game/trivia.ts` is its native compatibility facade. `lib/game/memory-engine.ts` accepts sourced candidates; native candidate assembly stays in `memory.ts`. `formations.ts` holds the exact existing layouts, re-exported by native `lineup.ts`.

The pre-extraction commit `ed65709f1d12c6b277d1966ba56cb4c2d399460b` was used to capture twelve native trivia runs and four memory boards. Both old and extracted implementations matched before the temporary capture modules were removed. Persisted SHA-256 golden checks protect dealing, public payloads and verdicts. The existing hundreds-of-seeds trivia and chronology checks remain.

## Data and readiness

The backwards-compatible schema 1 contract adds `trivia`, `memory`, typed `players` and per-gate readiness. The compiler derives new event games only from already approved/confidence-eligible/checked-source chronology facts. It never promotes Zrinjski's review anchors. True/false alternatives are quiz statements; the reveal supplies the actual documented date, not a new approved historical claim.

An optional small `players` array accepts the same Fact envelope as archive input, plus `value.name`, `sport: football`, canonical coarse `positions` (`GK/DF/MF/FW`, or an empty unknown list), nullable `fromYear`/`toYear`, and aliases. IDs are exact, club-scoped and duplicate versions are quarantined. Gameplay requires confidence 2+, valid approval dates/actor and available, checked source references. Automated approval additionally needs two publishers, confidence 3, high parser certainty, no conflict and explicitly non-sensitive content. Tests use synthetic player records only; no researched player facts were invented for sparse clubs.

Hapoel is the existing curated carry-forward exception, recorded as `legacy-curation`; current source access and new human approvals are not asserted. Native questions retain their source references. Existing player provenance is retained in the source ledger. Theme, players, trivia and memory enter Hapoel's content hash; compiled packs already hash all their inputs.

Full targets: Trivia 60 questions, Memory 6 distinct pairs, XI 22 approved identities plus a supported formation covered by distinct documented positions, Archive 20 eligible records, Timeline 11 dates. Partial evaluation starts at 3 questions, 2 pairs, 11 players, 1 archive record, or 3 chronology dates. Unknown player positions remain usable as explicitly unknown in free play but never certify position coverage. Targets describe this first wave, not a completed club archive.

Every club hub and `/master/core` now lists all thirteen gates. Eight pending shared engines have explicit requirements and no misleading play link. Admin pause and gate switches remain independent publishing controls. The evaluation preview of a research club is explicitly permitted; a paused club remains closed.

## Request authority and device state

`requestClub(path, gate)` checks the server host/path and the requested gate number. Trivia actions also check content version, seeded run/cursor, question index, current question ID and legal options before revealing that question's verdict/evidence. Incorrect, stale, unknown-host and cross-tenant payloads fail closed. Scores are evaluation UI, not trusted competitive rankings.

Migrated legacy entry points redirect on non-Hapoel tenant hosts; native Hapoel routes and POST action routing stay unchanged. English is the shared UI default; Hebrew is supported independently from the original historical content language. Other UI languages remain future work.

XI and activity saves use versioned keys containing the server-resolved club ID. XI restoration validates current canonical player IDs, supported formations, legal slots, no duplicates and a valid captain. Activity is local, bounded and deduplicated per run; clearing one club does not clear another. There is no signup, active Supabase connection or shared leaderboard.

## What remains for a complete portal demonstration

1. Expand verified club content: canonical players with positions/years, more varied trivia facts and archive records. Sparse clubs currently have short event/date games and a locked XI.
2. Migrate Blind Cow, Royal Rumble and Terrace Vote next, using player/clue/stat and reviewed culture contracts. Opinion ballots must not become fabricated historical claims.
3. Adapt asset-heavy Historical Line-up, Kit Builder, Shirt Collection, Goal Reconstruction and Derby with their real evidence/asset/rival requirements.
4. Connect admin research proposals and approval/rollback to published compiled packs so approved facts actually unlock games; this console remains read-only for core facts.
5. Extend the shared archive to entity connections and game-specific evidence deep links; add more local progress coverage and sharing.
6. Add a culturally authored non-Hapoel LIFE chapter after anchors, culture, places and dead-end checks are ready.

The Worker was checked at `addbb4805202b520699577770c77e1d49eceedcc`. Its latest changes concern LIFE scene dressing and transition video playback; they are outside this gate wave and were not blindly merged. The existing upstream detect/diff/review workflow remains.

## Verification and delivery

Focused tests cover original golden behavior, all three club engines, sparse/draft/blocked data, source validation, exact player identity, malformed saves, multilingual alias search, per-gate controls, stale deals and cross-tenant actions. Existing native tests remain.

CI retains lint, typecheck, all unit/integration tests, local database checks, provenance, identity/color checks and the production build. Browser verification extends the existing three-club Timeline proof with full Trivia/Memory rounds, archive source navigation and date filters, local activity, XI save/reload, locked sparse XI, filters with no eligible round, Hebrew/RTL, tenant routing and forbidden-color scans. Screenshots and reports stay in the CI artifact. The reviewed final commit and run are recorded in the delivery PR.
