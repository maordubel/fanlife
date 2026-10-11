# Player Control Center — QA (11.10.2026)

## Counts, before and after (the desk adds nothing to the archive; these are what it shows)
| club | players | no position | price not in frozen list | roster-wave (unreviewed) |
|---|--:|--:|--:|--:|
| hapoel-tel-aviv | 700 | 26 | 0 | 48 |
| zrinjski-mostar | 249 | 3 | 0 | 162 |
| hapoel-petah-tikva | 367 | 9 | 0 | 310 |
| panathinaikos | 543 | 16 | 0 | 334 |
| aek-athens | 1181 | 0 | 0 | 105 |
| celtic | 1373 | 152 | 0 | 333 |
| st-pauli | 523 | 4 | 0 | 275 |
| olympiacos | 672 | 0 | 0 | 639 |
| **all** | **5,608** | **210** | **0** | **2,206** |
"No position" counts men with no position in the archive, the public-source file or the owner workbook (they are dealt as free men). Before the desk nothing could be edited, so "after" = "before" until the owner publishes.

## Automated (`tests/players/control-center.test.ts`, 19 tests)
whitelist + null/empty semantics · every club listed with decades · search by name/original/id, no fuzzy · filters · CSV · draft invisible to games · publish changes the pool price · base stays on file · revert restores and keeps both audit events · five-a-side and XI read one price · stale edit = 409 · reason required, ladder exception needs confirmation · pinned €5M needs owner exception · 404/400 · multi-position fits both slots, one card · MF→FW moves the slot · unknown = free man · manager score separate from price · removal leaves every game and is restorable · impact lists consumers · store down ⇒ error, pool keeps last good · every route 401 without the owner cookie, 403 for a cross-site write.

## Browser (dev server, headless Chromium)
Desktop 1440 and mobile 390: list, drawer, preview impact → exception → publish → edited row → revert; no horizontal overflow, no page errors. Screenshots in `docs/fanlife/pcc-shots/`. Found and fixed: the drawer sat under the top bar and tab bar (the desk body is its own stacking layer) → it is portalled to the desk root.

## Not covered / risks
* CSV import, bulk commit, duplicate finder, recommendations, what-if simulator (spec phase 4) are not built.
* Storage is the control room's durable store (Blob), not Supabase tables — see the architecture note. Without Blob connected, edits are per-instance and not durable; the desk says so.
* Other instances see a new revision within ~8 s (per-instance refresh); the instance that published sees it at once.
* The XI budget: `ELEVEN.budget` in `lib/clubs/rumble.ts` is 33 while `XI_BUDGET` (`lib/clubs/rumble-xi/types.ts`) is 35 and is what the eleven uses; readiness here uses `xiReadiness` (35). Left as found — flagged for the owner.
* A man given a secondary position is counted for slots (`fits`) but `offersByFamily` still counts primaries only, so readiness for a small club is slightly conservative.
