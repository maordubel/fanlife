# Player Control Center — architecture (11.10.2026)

Owner request: one place in the admin to edit every man in every club, by club and decade — positions (several at once), price, manager score — and to remove a man who is a mistake. Spec: `FANLIFE-PLAYER-CONTROL-CENTER-IMPLEMENTATION-2026-10-11.md`.

## Data flow (one truth)
```
repository archive (club packs + roster wave)  ──►  loadClubBase()   [lib/clubs/resolver.ts, cached, never edited]
                                                        │
published overrides  (players/published.json, revision N)  ──►  withPlayerOverrides()  [lib/players/apply.ts]
   · removed men leave `players`; a position list replaces the archive's
                                                        ▼
                                           loadClub()  → every game, page and report
rawPool / ratedPool [lib/clubs/rumble.ts]  read the same snapshot (lib/players/effective.ts):
   price → overrideOf().price ?? frozen list ?? €1M fallback · rating → overrideOf().rating ?? workbook/derived · positions → primary + `alt`
```
* `(clubId, playerId)` is the key; a name is never a key. Five-a-side and the eleven read the same `ratedPool`, so one price per man per club.
* A published change bumps `revision`; `loadClub` rebuilds a club when the revision it was built on differs (each instance re-reads the store every ≤ 8 s). If the store is unreachable the **last known good** snapshot keeps serving and the desk says so; a failed read is never shown as a new revision.
* The frozen price list (`content/generated/rumble-prices-v3.json`) is never written by the desk; the desk shows *base* (list) next to *effective*.

## Storage (deviation from the spec, on purpose)
The spec proposes Supabase tables. The control room already keeps its state in the durable store (`lib/master/durable.ts`: Vercel Blob with ETag compare-and-swap, local disk in development), and the project rule is to reuse. So: `players/published.json` (revision + override map), `players/drafts.json`, `players/audit.json` (append-only; a revert is a new event). Every write is conditional on the ETag it read and retries on a lost race; a record-level `rev` makes a stale edit a **409**. Moving to SQL later changes `lib/players/store.ts` only.
* Override = a field **mask**: a present key is a decision, an absent key inherits. `positions: []` means *explicitly unknown* (the man is dealt into outfield slots, never goal), which is different from inheriting.
* The desk warns when the store is not durable (no Blob connected): such changes do not survive a restart.

## Editing rules
* Whitelist (`lib/players/validate.ts`): `price` 1–5, `positions` (distinct GK/DF/MF/FW), `rating` 40–99, `removed`, `note`. Anything else is refused by name.
* Publish needs a reason, compares `expectedRev`, and shows the **impact** first (`impactOf`): the price ladder after the change (a violation needs "publish as an exception"), whether five-a-side or any formation stops being ready, and which games it reaches.
* A locked / owner-pinned price — and a pinned €5M icon above all — can only be changed with the owner's explicit exception, by a session whose role is `owner`.
* Removing a man is a flag, never a delete; he stays in the desk (filter *Removed*) and can be restored.

## API (all under `/api/master/players`, owner cookie on every call, same-origin on every write)
`GET ?club&q&position&price&status&decade&sort&dir&page` · `GET /export` (CSV) · `GET /:club/:id` · `POST /:club/:id {action: preview|draft|discard|publish|revert}`. Codes: 400 schema · 401/403 auth or exception · 404 identity · 409 conflict · 422 off the ladder · 503 store down.

## Consumers touched
`rawPool`/`ratedPool` (price, rating, `alt`), `fits` (a man fits every family he has played), `loadClub` (removal, positions), the desk page and shell. `alt` also benefits every man the archive already lists with several positions.

## Not done (second phase of the spec)
CSV **import** with preview and bulk commit, duplicate-candidate finder, price recommendations, research queue, what-if simulator; Supabase tables. Phase 0–3 and CSV export are in.
