# Hapoel Tel Aviv — verified identity fixes and remaining parity work
Date: 2026-10-11
Authority: `maordubel/The-Worker` for historical persons, roles and prices; Fan Life retains its universal club engine.

## Implemented on this review branch
- `content/manual/player-names-en-overrides.json`: אביחי ידין → Avihai Yadin; מאוויס צ'יבוטה → Mavis Tchibota.
- `tests/hapoel-player-identity-parity.test.ts`: safeguards those overrides, uniqueness of explicitly merged IDs and the ten Worker canonical €5M icons in the shared historical price table.
- No historical records permanently deleted; no player roles guessed from a name; no universal club pricing changed. Additional branch commits modify `lib/clubs/rumble-xi/names.ts` and `scripts/rumble/build-names-en.ts`, with live-path regression coverage.

## Critical architectural findings
1. Both repositories' `content/generated/player-master.json` have the same Git blob SHA (`46ccb0c1c89dddc7d7ca1d8b459ccc9a1c851925`). The base master isn't the primary mismatch.
2. Fan Life uses `content/generated/player-names-en.json` in `lib/clubs/rumble-xi/names.ts`. The runtime name resolver now honors exact archival-name overrides immediately, even before generation. Still regenerate and commit `content/generated/player-names-en.json` with `npm run rumble:names` to keep all consumers and the prebuilt artifact aligned. The generator's hardcoded temporary-path write was removed.
3. Fan Life universal cards read price by club and player ID from `content/generated/rumble-prices-v3.json` through `lib/clubs/rumble-xi/prices.ts`, optionally replaced at runtime through Player Control Center snapshot (`lib/players/effective.ts`). The Worker price table keyed by Hebrew slug is separate. DO NOT overwrite universal prices blindly with the Worker table.
4. Existing hand-curated Hapoel merge: `p_706a75168c` → `p_78adb477be` (מאיר מליקה). `lib/clubs/rumble.ts` and `lib/players/apply.ts` have distinct merge pathways; ensure duplicate cards, historical goals and saved ID links resolve consistently.
5. Missing positions have an existing fact-driven input `content/manual/player-positions-extra.json`. `lib/clubs/rumble-xi/positions.ts` reads it and `lib/players/service.ts` reports unknown position. Prefer exact sourced roles, not assumed positions.
6. The 11-a-side budget appears as 33 in `lib/clubs/rumble.ts` and 35 in economy documentation. Align only after tracing actual game mode and owner-approved rules.

## Required exhaustive migration; not yet executed
1. Export effective player rows using Player Control Center for club `hapoel-tel-aviv`, including owner overrides, frozen price, canonical ID, aliases, position provenance, English name provenance, source links, and seasons.
2. Independently dump the Worker master with canonical slug, aliases, years, known positions and `content/generated/player-prices.json`.
3. Identity match in descending confidence: matching canonical historical source ID; exact ID; verified Hebrew and Latin aliases with compatible years; only then fuzzy *candidate* (human review). Never collapse homonyms because of name alone.
4. Generate four CSV reports: `auto-correct-names`, `positions-from-verified-source`, `duplicate-candidates`, `Worker-vs-FanLife-pricing`. Each changed row must include before, after, confidence, evidence, file/ID, and reason.
5. For duplicate records: retain the canonical keeper ID, move all source/season/appearance/goal/alias relationships, preserve old ID redirects and ownership references, hide dropped ID from game pool; do not physically delete historical source material.
6. For invalid nonplayers, remove from the playable pool only after checking referenced match/squad material, and record the reason. Unknown history != invalid player.
7. For pricing, compare across the same **person** rather than across incompatible Worker Hebrew slugs and Fan Life club IDs. Preserve 10 historical €5M icons; review differences with owner locks and the new universal tier rules before applying.
8. Rebuild `npm run rumble:names`; regenerate applicable prices only after approved pricing diff (`npm run rumble:prices`). Never silently re-price unrelated clubs.
9. Run `npm test`, `npm run typecheck`, verify both formats and check live Player Control Center overrides. Ensure desktop/mobile display, search, user saves and historical match references remain intact.

## Current limits
The GitHub file connector truncates the large generated player, price and roster JSON payloads; this branch therefore contains **confirmed small spelling corrections and a protective regression test**, not a full per-player exhaustive repair. Exhaustive unplaced count, duplicate count and true effective Fan Life prices cannot be certified without reading all source rows plus the current published owner snapshot. Do not present proposals as applied corrections.
