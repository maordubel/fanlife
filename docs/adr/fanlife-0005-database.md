# ADR-fanlife-0005: Database: one Supabase project with club_id, club resolved on the server

## Status
Proposed

> **עדכון 30.9:** בפריסה אחת, `club_id` נגזר מהכתובת (host) בצד השרת. פרויקט Supabase אחד נשאר ההמלצה.

## Date
2026-09-30

## Context
37 `worker_*` tables, ~150 SECURITY DEFINER functions, no `club_id`. Global unique `member_no`/`supporter_no` and sequences; `worker_stand_post.gate` checks 1–13; archive slugs are Hapoel-scoped. Owner will create a new Supabase project for this portal later. Hapoel currently lives in the DUBID-shared project.
## Decision (proposed; owner to confirm)
1. **One new Supabase project** for the family, additive migration adding `club_id` (default `hapoel-tel-aviv`, backfilled), club-scoped unique keys and counters, RLS by club.
2. Functions take **no** club parameter from clients: the club is resolved from a server-side setting bound to the deployment.
3. Identity is one account with a per-club membership (`worker_club_membership`).
4. Polls stay anonymous (no user link), now per club.
5. Hapoel migrates from the shared DUBID project when the new one is ready; until then nothing changes.
## Alternatives
Project per club: no schema change but 14 projects, no cross-club identity, 14× ops. Rejected unless the owner prefers isolation over identity.
## Consequences
+ One identity, one place to run SQL. − ~500-line migration and RPC rewrite; verify on Postgres with two clubs.
## Dependencies
Depends on 0001. Blocks M6.
## Validation
Attack tests with two clubs: no cross-club read/write, counters independent.
