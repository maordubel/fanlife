# ADR-fanlife-0007: Assets, storage and rights

## Status
Proposed

> **עדכון 30.9:** פריסה אחת ⇒ נכסי מועדון כבדים **חייבים** להיות באחסון חיצוני (לא ב-Git ולא בחבילה). התקציב הוא לחבילת ה-deployment כולה.

## Date
2026-09-30

## Context
`public/` is 275MB (255MB LIFE), `.git` 377MB; every deployment carries it; provenance ledger is keyed by repo path.
## Decision
1. Club-specific heavy assets (kit photos, crests, LIFE art, film) live in object storage keyed `<club>/…`; git keeps code, fonts, manifests and small JSON.
2. Provenance ledger rows gain `club` and storage key; the check runs against the storage listing.
3. Per-club deployment budget (initial proposal: ≤ 25MB of static assets).
4. Rights gate unchanged: `usable_in_app=false` until settled; monogram crests; official crest request per club is a tracked task.
5. Historical exemption (0003) requires the ledger row.
## Alternatives
Assets in git per club (storage cost ×14). Rejected.
## Consequences
+ Small builds. − New upload/import pipeline and CDN config.
## Dependencies
Depends on 0002, 0003. Blocks M7.
## Validation
Fresh club deployment under budget; ledger check fails on an asset with no row.
