# ADR-fanlife-0012: Feature switches live in the control state; CRM tasks keep only their workflow

## Status
Accepted (owner roadmap 12.10.2026)

## Decision
1. **Switches:** `state.features` (`lib/features.ts`): `allFootball`, `allFootballGates`, `fanLeague`, `friendlies`.
   Default off. Toggled in the control room (Settings → Features), audited, read on the server only. The owner session
   always sees switched-off features ("Owner preview" ribbon) so the owner can play them in production first.
2. **Tasks:** detectors stay deterministic and stateless (`attention.ts` + new detectors). What a person decides about a
   task — snooze until, dismiss with a reason, note — is stored per stable task key in its own durable file
   (`crm/tasks.json`), never in the growing control state. A task is "resolved" only when its detector stops reporting
   it; dismissing hides it until its evidence changes (fingerprint), so a new problem under the same key comes back.
3. **Search** reads the same read models (summaries, player listing API, tasks) — no new index, no copy of records.

## Consequences
+ Turning a feature off never deletes a season or a pool. − Two reads (state + tasks file) on the desk.
