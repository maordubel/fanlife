# ADR-fanlife-0011: FAN LEAGUE — careers in Supabase, the server decides every result

## Status
Accepted (owner roadmap 12.10.2026)

## Decision
1. **Three tables, not thirteen.** `worker_fanleague_careers` (one row per career: owner, club, status, revision,
   `state jsonb` holding squad, wallet, fixtures, table and the catalogue snapshot digest), `worker_fanleague_ledger`
   (append-only: transfers, results, audit; unique idempotency key) and `worker_fanleague_friendlies` (invite, two locked
   snapshots, one immutable result). A career is a document that changes as one unit, and compare-and-swap on `revision`
   gives the atomicity a set of narrow tables would need a transaction for.
2. **Authority.** A browser never sends a score, a balance or a squad. Server actions verify the user with
   `createClient().auth.getUser()`, then read/compute/write with the service role under `revision = expected`. RLS is on,
   owners may SELECT their own rows; there is no insert/update grant to anon/authenticated.
3. **Same club, always.** Every signing, lineup and friendly side is re-checked on the server against the career's
   frozen catalogue (`playerVersion.clubId === career.clubId`). A forged body cannot add a foreign player.
4. **Snapshot.** A season freezes its catalogue (positions, rating, price, sources) at creation; admin edits reach only
   new seasons.
5. **Friendlies** read two locked snapshots and run the same pure engine once (unique on invite id); they write nothing to
   either career.
6. **Without Supabase** (evaluation, local dev) the same service runs on the durable file store, keyed by a device id —
   playable, clearly marked "saved on this device".

## Consequences
+ Small schema, backed up by prefix (`worker_*`). − Leaderboards across careers need a read model later.
