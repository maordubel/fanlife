# M1 migration report — 30 September 2026

Base: `c34607ae088d50aa0e05b1cde9ac9d2910dd049a`, the owner's portal/host-registry merge. Changes preserve that work rather than restoring an older delivery branch.

## Delivered

- ClubData, server host resolver, immutable providers and versioned Timeline engines.
- Hapoel adapter preserves all 3,080 eligible chronology cards and original provenance.
- Pack compiler validates identity/schema/date/evidence/approval/conflicts/readiness.
- Existing Zrinjski research remains unapproved; a small verified core enables a short round.
- Minimal Olympiacos core; three exact-date results per new club, PARTIAL readiness and two placements.
- One chronology algorithm and one interactive board, including the existing native route.
- English shared UI, optional Hebrew RTL, per-club ink, missing/stale/error states.
- Read-only evidence console `/master/core`, linked from navigation and club pages.
- Upstream integration is manual dispatch, draft PR and review; scheduled integration/automatic merge disabled.

## Review locally

`npm ci` then `npm run dev`, default evaluation mode, no credentials:

- `/master/core` — evidence/readiness.
- `/clubs/hapoel-tel-aviv/timeline?seed=42` — original content, full shared round.
- `/clubs/zrinjski-mostar/timeline?seed=42` — short verified round.
- `/clubs/olympiacos/timeline?seed=42` — short verified round.
- Append `&lang=he` for RTL; default UI is English.
- `/timeline/order?seed=42` — original presentation and integrations, same algorithm/board.
- `olympiacos.localhost:<port>` and `zrinjski.localhost:<port>` — host-based evaluation.

No hosting or production database changes are included.

## Scope limits

This is the M1 chronology slice, not all gates or complete histories. Red Thread, XI, trivia, goals, kits, other gates, LIFE, shared account/progress, production RLS, live research orchestration, Greek/Croatian translation and full themes remain separate milestones. Shared evaluation results are not written into the original Hapoel ledger. The evidence desk is read-only; admin approval/rollback is later. Do not infer other gates' readiness from Timeline, or claim all native actions/APIs are tenant-aware.

## Audit

`node scripts/master/audit-club-imports.mjs --write` produces [the inventory](m1-import-audit.json): 462 direct legacy data/identity/copy imports across 391 files, including two adapter exceptions. Data and identity/copy are labelled separately. This is a regex direct-import inventory, not a transitive independence proof.

## Research ledger

Only teams, match date and final score are asserted. No media/article prose copied. Two independent publishers per core fact; source URLs, automated actor and approval date are in each core file. No owner approval is invented.

| Event | Match date | Evidence |
| --- | --- | --- |
| Zrinjski 4–3 AZ | 2023-09-21 | UEFA results + Al Jazeera match report |
| Aston Villa 1–0 Zrinjski | 2023-10-05 | UEFA results + Villa's dated win inventory (search index; rendered page omits body) |
| Zrinjski 1–1 Aston Villa | 2023-12-14 | UEFA results + Sky Sports match report |
| Aston Villa 2–4 Olympiacos | 2024-05-02 | UEFA results + Reuters via ESPN |
| Olympiacos 2–0 Aston Villa | 2024-05-09 | UEFA results + Reuters |
| Olympiacos 1–0 Fiorentina, after extra time | 2024-05-29 | UEFA results + Reuters; club report cross-check published next day |

## Verification

Golden fixtures captured from the untouched base before extraction: 12 seed/cursor combinations including former duplicate-ID regression seed 95. The original 300-seed suite is unchanged. New tests cover all clubs, caches, sparse packs, compiler failures, host override attempts, stale versions and wrong-card payloads.

Local browser execution was blocked by the environment's Unix-socket restriction (Chromium process singleton EPERM). No local visual pass is claimed. `scripts/master/core-browser-smoke.mjs` is part of CI: it launches the production build, completes all three club rounds through real server actions, checks replay, RTL/mobile, evidence UI, host mismatch and absence of live Supabase requests. CI screenshots/logs are written under `/tmp/fanlife-m1-browser*`.

## Closed milestone

PR #3 was merged to main at `355ca2e70d5d66d8838f1b25f3dab7e6698cbf5f`. [CI run 36826215373](https://github.com/maordubel/fanlife/actions/runs/36826215373) passed all steps: 4,922 tests, typecheck, lint, local database, build and real browser flow. All three rounds, replay, RTL, mobile and tenant mismatch passed with no browser errors and zero live Supabase requests. Vercel reported successful deployment. The owner's final browser assertion checks tenant isolation directly rather than framework-owned 404 wording.
