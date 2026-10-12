# ADR-fanlife-0011: FAN LEAGUE — careers in the durable store, the server decides every result

## Status
Accepted (owner roadmap 12.10.2026). **Revised the same day, before any code shipped:** documents in the existing
server-only file table instead of three new tables — no SQL for the owner to run, nothing new to back up.

## Decision
1. **One document per career, in `worker_fanlife_files`** (Supabase, service role only, RLS on, no grant — rule 105):
   `fanleague/careers/<id>.json` holds the career whole — owner hash, club, revision, the frozen catalogue, squad, wallet,
   the AI sides, fixtures with their event logs, and the transfer ledger. `fanleague/owners/<hash>.json` lists one owner's
   careers. A career changes as one unit, so compare-and-swap on the document's etag is the transaction: two taps or two
   tabs can never both apply; the loser re-reads and the action's own `rev` check refuses it (409-style "moved on").
2. **Authority.** A browser never sends a score, a balance or a squad — only an intent (`buy <id>`, `play`) with the
   revision it saw and an idempotency key (a repeat answers the state it already produced). The owner is read on the
   server every time: a signed-in, non-anonymous account (`u:<id>`), else a signed httpOnly device cookie (`d:<random>`).
   Only a sha256 of that key is stored.
3. **Same club, always.** The career's catalogue IS its club: a man not in it cannot be signed or fielded, whatever the
   request says. AI sides are frozen eighteen from their own clubs.
4. **Snapshot.** A career freezes its catalogue (position, hidden rating, price, years) at kick-off; edits in the Player
   Control Center reach new careers only. Hidden ratings never reach the browser — only the team lines.
5. **Friendlies** (next PR) read two locked snapshots and run the same pure engine once; they write nothing to either career.
6. **No false save.** Without a durable store (a serverless host on memory only) a save is refused with a message; a
   page still opens.

## Consequences
+ No migration, no manual step; already inside the nightly `worker_*` backup. − Leaderboards across careers need a read
model later; a career document is ~100 kB for the largest clubs (fine for one row, not for a scan).

## Revision 3 — LEGENDS MANAGER replaces FAN LEAGUE (12.10.2026)

Owner's rulebook V1.0 ("מנג'ר האגדות"). Same switch (`features.fanLeague`, labelled LEGENDS MANAGER), same storage contract,
a new area: `legends/` in `worker_fanlife_files` (careers, owner index, friendlies, `settings.json`, `ratings.json`). FAN LEAGUE's
`fanleague/` test careers are no longer read (owner: clear them). Old URLs redirect to `/all-football/legends`.

- One document per career, compare-and-swap per action, `rev` + idempotency key, refused without a durable store.
- Three active careers per owner, checked inside the owner's lane on create and on restore (best effort across instances:
  the store has no transaction; a race could at worst let a fourth through, never lose data).
- The rulebook's [PROPOSED] values (§9) are settings the control room edits; a career freezes them at kick-off.
- Supabase tables of §3 were NOT created: the document store already gives atomic per-career writes, and §3 is marked proposed.
