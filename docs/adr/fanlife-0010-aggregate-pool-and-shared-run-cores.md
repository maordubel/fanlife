# ADR-fanlife-0010: The aggregate pool is derived, and the gate runs share one core

## Status
Accepted (owner roadmap 12.10.2026)

## Decision
1. **Derived, never a second truth.** `lib/experiences/pool.ts` reads `engineClubIds()` → `loadClub()` for each club that
   is published for the gate (`gateAccess` on its real control row; preview semantics only in evaluation/owner preview).
   It keeps only what the club compiler already approved (status approved, confidence ≥ 2, checked sources) and copies
   nothing back into any pack.
2. **Namespaced ids:** `<club>~<id>` for questions, pools, fact ids, timeline cards and memory pairs. Distractor pools are
   therefore always the question's own club — a cross-club "two right answers" cannot be dealt.
3. **Composite version** = sha256 of the member clubs' `id:version` pairs + algorithm version. A run started on one
   version is refused on another (same `VERSION_RETIRED` rule as a club).
4. **Run cores, not copies.** `lib/clubs/trivia-run-core.ts` holds the ledger logic that was in
   `trivia-run-actions.ts`, parameterised by a resolver. The club actions call it with `requestClub`; the aggregate
   actions with the pool. `ClubTrivia` and `ClubMemory` accept an optional `actions`/`reveal` prop that defaults to the
   club actions, so club gates are byte-identical in behaviour.
5. **Balance:** a deal caps each club's share (`balanced`), may be `chaos` (any eligible record) or `duel` (two clubs).
   A mode that cannot be fielded answers with its blocker — never padding.
6. **Cache:** the pool is built per composite version (LRU) — one compile per club per instance, as today.

## Consequences
+ One grading path, one ledger, one memory wall. − Ids grow; the id length guard is a parameter of the core.
