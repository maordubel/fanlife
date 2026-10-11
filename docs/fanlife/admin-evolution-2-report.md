# Admin evolution, round 2 — report (11.10.2026)

## 1 · CI was red on every run — root causes and fixes
| Check | Cause | Fix |
|---|---|---|
| **CI · Typecheck** (`tsc -p tsconfig.all.json`, red since #139) | 24 real type errors in `scripts/rumble/*`, `scripts/ingest/clubs/league-lineups.ts`, `tests/clubs/*`, `tests/players/merge.test.ts` — `players` is nullable on club data, `priceTier` missing from the price-entry type, an implicit `any`, a `null` colour key in a test callback. The app's own `tsc -p .` never saw them. | Fixed in the code (null-safe reads, widened types). **No `@ts-ignore`, no `any` shortcuts, no test removed.** |
| **CI · Tests** (2 failures once typecheck passed) | `tests/club-agnostic.test.ts`: #136 added two club-name literals to the shared `lib/away-days/club.ts`. `tests/ingest/club-wave.test.ts` still asserted "one publisher ⇒ review", which rule 102 (owner, 10.10) reversed for UEFA. | Club data files moved to `lib/clubs/away-files.ts` (club identity is data, outside the shared engine). The wave test now states the rule: UEFA alone ⇒ approved; any other single publisher ⇒ review. |
| **Requested club research** (cron, red every 15 min) | `FAN_LIFE_CRON_SECRET` is missing or shorter than 32 characters in the repository secrets; the job failed on `test ${#CRON_SECRET} -ge 32` with no explanation. | The workflow now says exactly what to set and where, and reports the HTTP status and body when the control room answers badly. **Owner action:** set `FAN_LIFE_CRON_SECRET` (same value as `CRON_SECRET` on Vercel). |

Local run of every CI step: hygiene ✓ · provenance ✓ · lint ✓ (warnings only) · typecheck ✓ (0 errors) · life:deadends ✓ · master:identity ✓ · full vitest 334 files / 6,182 tests ✓ (after the two fixes) · master:local-db ✓ · build ✓. The browser flow (`master:core-browser`) needs the Playwright build CI installs; it cannot run in this container.

## 2 · XI budget decision — rotation 33 / 34 / 35
`budgetFor(seed)` (`lib/clubs/rumble-xi/types.ts`): the round's seed picks €33M, €34M or €35M; consecutive rounds walk 34 → 35 → 33. Every level is hard. The same seed always deals the same budget, so a shared link, the server check and the screen agree. A club must be ready at the tightest (€33M), so no round can be undealable. The deal, rival, `playXI` and the game UI all read the deal's `budget`; the rules text tells the player the budget changes. The ELEVEN 33 vs XI_BUDGET 35 discrepancy is gone. CLAUDE.md rule 103 amended.

## 3 · End-to-end Player Control Center, desktop 1440 and mobile 390
`scripts/qa-pcc-e2e.cjs` (Playwright against the dev server): **44 checks, 0 failures** (`docs/fanlife/pcc-e2e/results.json`, shots beside it).
List · dropdown filters (open, narrow, Escape closes, clear all) · open drawer · Publish disabled with the reason shown · reason · preview impact · save draft · draft survives reload · draft invisible to games · publish (price, positions, score) · draft cleared · revert restores the archive value · reports (4 tabs) · merge list with reasons · review · merge · merged man listed with his keeper · keeper shows who was folded into him · unmerge restores price and positions · bulk CSV preview and publish · no horizontal scroll anywhere · no console errors.

## 4 · Published changes reach the games (vitest)
`tests/players/rumble-effect.test.ts`: a published price + position is the price and slot dealt in five-a-side **and** the eleven (400 seeds each), a removed man is dealt in neither. `tests/clubs/rumble-xi.test.ts`: every ready club, every shape, every rival, rotating budget; 5,000 rounds inside the round's own budget.

## 5 · Merging loses nothing, unmerging restores everything
`tests/players/merge.test.ts`: after a merge the games see one man carrying both men's names (aliases), years, positions and sources; the other leaves the pool; his archive record is untouched (still listed as *Merged*, with his keeper). Unmerge returns him with the same price, position and score, and the keeper is unchanged. Chains are refused, a locked price needs the owner's exception, a reason is required.

## 6 · UX
* Filters are now dropdowns (Club · Position · Price · Decade · Show · Sort) instead of three walls of chips; **Clear all filters**; the Publish button explains why it is disabled and sits in a sticky bar.
* Drawer shows "Also carries (merged in, still on file)" and a one-click Undo.
* Before/after: `docs/fanlife/pcc-shots/*` (before) vs `docs/fanlife/pcc-e2e/*` (after); overview/clubs/data in `docs/fanlife/admin-shots/`.
* Fixed a latent bug from #152: the new overview/club CSS used undefined colour variables; it now uses the desk's tokens.
