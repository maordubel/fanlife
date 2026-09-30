# Stage B — route parity and experience QA (28.9.2026)

Brief: `docs/life/IMPLEMENTATION-PASS-PROGRAMMER-2026-09-27.md` §9–§20.
Commits: `f13310d` (note board + seats/calls/carried things), `a621e25` (gate seven 1996, Yaron, loop guard, tests).

## New shared primitive — the note board

`lib/life/noteBoards.ts` + `content/noteBoards.ts` + `components/life/NoteBoardSheet.tsx`.
Opened as `{ e: 'minigame', id: 'board:<id>' }`; scraps are sorted into honest columns by tap or drag,
the verdict is a word (never a number) written to a surviving `life:` flag, then the after-conversation runs.
A board with too few cards folds empty and the story continues (no loop). Used three times:

| board | chapter | writes | read later by |
|---|---|---|---|
| `notebook-1990` | 1990 | `life:1990:notebook` (clean/mostly/mixed/half/blank), `life:journalist:seed` | 2000-title `t-src-rumour` |
| `court-1995` | 1995-sinai | `life:sinai:ledger` (clean/certain/mixed) | `s2-court` hidden "both" choice |
| `lists-1998` | 1998-laces | `life:laces:lists` (certain/strict/torn/blank) | 2000-title `t-src-rumour` |

## Route parity

Routes: R = regular · G5 = gate-5 organiser · BB = basketball · AD = army/distance · $- / $+ = low / high money · BP = broken promises · RF = relationship-first.

| chapter | route | meaningful actions | unique screen | unique consequence | callback written | minutes active |
|---|---|---|---|---|---|---|
| 1990 | R | radio sources, half-time note, board | note board | `life:1990:notebook` | 2000 `t-call`, `t-src-rumour` | ~25 |
| 1990 | $- / RF | payphone behind the pillar (1 ₪), Rachel first/second | payphone call (remote) | `life:1990:called` | 2000 `t-call` remembers it | +4 |
| 1991 | R / $+ | Shachor crates (carry chore) | carry chore | wallet + chore result | — | ~8 |
| 1993-cup | RF / G5 | seat choice on the ride | window seat | `life:1993:seat` (efi/pole/limor/ofir) | 1993-galil Efi keeps the seat | ~6 |
| 1993-galil | AD / RF | empties → pick 2 of efi/kid/gear → bus home | north bus | `life:galil:seat` | 1997 `efi-hall-97` | ~12 |
| 1995-sinai | G5 | court ledger board; banner sweep | board + banner chore | `life:sinai:ledger`, `life:sinai:gate=painted` | `s2-court` "both" | ~15 |
| 1995-sinai | R / BP | stand with the seven / watch / around / home | gate seven, spring 1996 | `life:sinai:gate` defended/watched | end cards | ~10 |
| 1996-army | AD / BP | swap Saturday with Yaron; repay or break | kiosk repayment | `life:swap:yaron/repaid/broken`, Yaron memory, `promise_kept` proof | a5-kiosk | ~6 |
| 1997-basket | BB / RF | chain: carry/stay/argue/write/home; walk with Efi or alone | hall chain + walk | `life:hall:1997`, `life:hall:walked`, `community_help` proof | 1999-basket seed corner | ~12 |
| 1998-laces | G5 | lists board | note board | `life:laces:lists`, organiser mark, `l1:cut` | 2000-title rumour | ~9 |
| 1999-basket | BB | seed corner reads 1997 | — | — | reads `life:hall:1997` | ~5 |
| 1999-cup | RF | box with the 1983 stub; the hug | bedroom box | `life:cup99:stub` (first-shirt fallback) | c99-kobi-hug | ~5 |
| 2000-title | RF / $- | call home after the title | phone call | `life:title:call` | reads 1990 call, notebook, lists | ~6 |
| 2000-double | — | unchanged (night belongs to 2000-bridge) | — | — | — | — |

## Deliberate deviations from the brief

- **1998 S2 "Moment Puzzle"** — not built: nobody at Bloomfield saw the other match (canon, rule 11).
- **1999-basket S1 "celebration"** — canon is a relegation night; not staged as a party.
- **1999-basket S2 "4 needs"** — skipped; the chapter already has the queue work and page assembly.
- **2000-double S4 night** — left to the 2000-bridge agent (not my chapter).
- **1990 S2 phone during the match** — TransistorNet runs only in `bloomfield-inside`; the call is after the whistle instead.

## Experience QA — the 8 questions

Answered from the sim (`tests/fixtures/lifeWorldSim.ts`, confused-player × 4 temperaments) and code reading.
**The browser probe (`scripts/life/pass-stage-b-probe.mjs`, 11 scenarios) did not complete:** `goto` and
canvas waits timed out with load ~24 on 2 CPUs. It is committed, and should be run on a quiet machine
(`ONLY=<scenario> node scripts/life/pass-stage-b-probe.mjs <url>`).

1. **Does the player know what to do?** Yes. Every new action is a named hotspot/actor with a verb; boards teach in one line.
2. **Is there at least one physical action?** Yes in every changed chapter (board sort, chore, seat, box, phone).
3. **Does a choice cost something?** Time (board, chores), money (asimon 1 ₪), a relationship (Yaron swap/break).
4. **Can the player get stuck?** No. The sim reaches the end in every chapter; empty boards fold; 1995 has a `s3-home-late` fallback at 19:30.
5. **Is anything invented?** No. No dates, scores or scorers were added; real people have no lines (the veteran is a role, `אוהד ותיק`).
6. **Is the result remembered?** Yes. Every verdict is a surviving `life:` flag with a named reader later (table above).
7. **Do two routes feel different?** Yes. Gate seven ends painted, defended or watched; the Galil seat and 1993 seat diverge per companion.
8. **Anything yellow / untranslated?** No. New UI strings are in `messages/he.stage.lifeB28.json` via `t()`; the board uses house tokens only.
