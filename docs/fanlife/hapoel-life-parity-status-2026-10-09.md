# Hapoel Tel Aviv LIFE parity + Worker feed — 2026-10-09 (delta 8)
- LIFE entry: one rule for every club; removed `native` state, `/life` door and "hand-authored original" link. Hapoel LIFE = `/clubs/hapoel-tel-aviv/life` (universal engine + club pack), playable (PARTIAL, 3080 anchors).
- Hapoel `ClubData.life` no longer 'legacy'; control room "LIFE opens" now reads universal readiness.
- Worker masters reader moved to `lib/clubs/feeds/worker-masters.ts` (data only). Test `tests/clubs/hapoel-life-parity.test.ts` guards.
- Contract: docs/fanlife/worker-feed-contract.md.
- Leftover dead file `lib/clubs/adapters/hapoel-wave-c.ts` (upload cannot delete; unreferenced).
- Gate: lint clean, tsc clean, vitest 6 shards green, next build green.
