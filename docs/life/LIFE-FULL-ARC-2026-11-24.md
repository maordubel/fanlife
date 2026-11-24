# LIFE · the full arc, six to forty-eight (24.11.2026)

Owner, 24.11.2026: "Take inspiration for the full script from THE WORKER as well." THE WORKER (`maordubel/The-Worker` @ `15229a9`, read only) is the hand-written Hapoel Tel Aviv life; this is the same depth rewritten for every club, in the hood's mission shape (`lib/life/hood/story/types.ts`, rule life-story-watch).

Code: `lib/life/hood/story/{teen,young,adult}.ts` (missions), `stages.ts` (`LIFE_STAGES`, `LIFE_SPINE`, `LIFE_MISSIONS`, `standingFor`, `routeOf`), `arc-words.ts` (every line, English). Test: `tests/life-story-arc.test.ts`. Childhood (`childhood.ts`) is reused unchanged.

**Not wired yet.** `director.ts` still plays childhood alone. Adopting the whole life is that file owner's change: `MISSIONS = LIFE_MISSIONS`, `SPINE = LIFE_SPINE`, the standing work from `standingFor(state.age)`, `STAGES[*].authored = true`, and `ARC_WORDS` joined to `STORY_WORDS`. The test walks the whole life with the director's own semantics (childhood through the director itself) for every core club.

## The four stages

| Stage | Ages | The question | The love (THE WORKER `lib/life/pure-love.ts` stages) | Chapters · small jobs · standing |
|---|---|---|---|---|
| Childhood | 6–12 | Who gave it to you? | inherited | 10 · 4 · 3 (unchanged) |
| The teens | 13–18 | What kind of supporter are you? (Stage B, `STAGE-B-1990-2000-CONTENT-IMPLEMENTATION.md` §3) | chosen | 12 · 2 · 3 |
| On your own | 19–30 | What does it cost you, and what will you give back? (Stage C, `SCREENPLAY-2000-2026.md`) | carried | 11 · 2 · 3 |
| Your turn | 31–48 | Who walks behind you now? (`SCREENPLAY-2000-2026.md` FAMILY, FINALE) | handed on | 10 · 2 · 3 |

**Routes** (family, ultras, away, member, far) are two forks of four that converge on the next shared chapter: the teens at sixteen (`the-end`, `the-road`, `the-room`, `the-same-step`) and the twenties at twenty-three (`their-banner`, `the-coach`, `the-vote`, `the-far-job`). Each sets `story:route:<id>` and `story:lean`; later chapters open a third approach on the route (`sing-through`, `the-organised-trip`, `the-books`, `coming-home`), never the only way through. THE WORKER source: `THE-WORKER-LIFE-SCRIPT.md` §5 (the ladders, and "eligibility is an invitation, not a promotion"). Ultras stay light, as rule 125 §3 allows: paper choreography, a rival banner brought home, things thrown are paper cups; nobody is hurt.

**Devices carried over.** *Do, don't choose* (`THE-WORKER-LIFE-SCRIPT.md` §1: "going somewhere is the choice"): every approach is a route through the street, never a menu line. *No Game Over*: every complication answer continues. *The opportunity engine* (`lib/life/opportunityResolver.ts`, "0–2 good opportunities"): the director offers the chapter, the open small jobs and the week's work. *Gigs* (`lib/life/gigs.ts`) and *Toto* (`lib/life/toto.ts`): the standing work (`kiosk-shift`, `the-week`, `the-coupon`). *The shirt collection* (`lib/life/shirts.ts`): `shirt-swap`, `arms-up`. *The debts* (`THE-WORKER-LIFE-SCRIPT.md` scenario 6): `owe:group` and `owe:crew` open in the teens and are paid forward in `paying-back`. *Presence is not binary* (`STAGE-B…` §4.4): the radio, the phone box, the armchair and the empty seat are all ways of being there. *The watch layer* (the 1986 title night ending on its film, `lib/life/cutscenes.ts`): every match night carries a Fitter template, so a club with a READY archive night gets the date and the film; every other club gets the same chapter, personal.

## Every chapter in one line

| # | Mission | Age · giver · place · day | Template | One line | THE WORKER source |
|---|---|---|---|---|---|
| T1 | `the-wall` | 13 · mate · corner | — | The older lot at the wall; a note to run to the ground. | `STAGE-B…` §3 "first independent routes"; `THE-WORKER-LIFE-SCRIPT.md` B6 (news passed man to man) |
| T2 | `know-in-time` | 13 · kiosk · kiosk · matchday | `clipping-hunt` | The information game: two stories at once, tell Dad right. | `STAGE-B…` §3 "Will you know in time?", §7 B8 (transistor → pager grammar); `lib/life/content/chapter1990.ts` |
| T3 | `first-away` | 14 · mate · corner · matchday | `away-pen` | The first away; the coach does not wait for the late friend. | FAN LIFE `LIFE-STORY-FLOW-2026-11-23.md` §6 E6; `THE-WORKER-LIFE-SCRIPT.md` scenario 6 (the bus north) |
| T4 | `dads-hero` | 14 · dad · home | — | The father's hero: defend, doubt, "the man, not the job". | `STAGE-B…` §7 B5 (defence → doubt → rupture); `lib/life/content/chapter1995sinai.ts` |
| T5 | `too-dear` | 15 · kiosk · kiosk · matchday | `cup-final-trip` | The ticket you can't afford; coins over the heads at the coach door. | `THE-WORKER-LIFE-SCRIPT.md` §3 (what it costs him), scenario 6 `owe:group`; `lib/life/gigs.ts` |
| T6a | `the-end` | 16 · mate · pitch · matchday | `tifo-carry` | Ultras, light: carry the paper rolls; the other lot throw cups. | `THE-WORKER-LIFE-SCRIPT.md` §5 ULTRAS; FAN LIFE rule 125 §3 |
| T6b | `the-road` | 16 · mate · corner · matchday | `away-pen` | Away traveller: hold the coach list, give up your seat. | `THE-WORKER-LIFE-SCRIPT.md` §5 TRAVELLER |
| T6c | `the-room` | 16 · neighbour · school | — | Member: the meeting in the hall, a fanzine, a letter. | `THE-WORKER-LIFE-SCRIPT.md` §5 JOURNALIST, USSISHKIN_FOUNDER |
| T6d | `the-same-step` | 16 · dad · ground · matchday | `kickoff-run` | Family: one match on Dad's step while the crew wave. | `STAGE-B…` §4.1 gate identity (reason `family`); `THE-WORKER-LIFE-SCRIPT.md` B6 א2 |
| T7 | `stand-through-it` | 17 · dad · ground · matchday | `where-you-stood` | The loss you stand through, to the whistle. | `STAGE-B…` §7 B8 "the laces", B7; `lib/life/content/chapter1998laces.ts` |
| T8 | `the-only-bus` | 18 · dad · corner | — | Duty (work, or national service where it exists) vs the only bus, full of the other lot; truth, excuse or silence. | `THE-WORKER-LIFE-SCRIPT.md` B6 א3 "the scene of the decade"; `lib/life/content/chapter1996army.ts` |
| T9 | `the-steps` | 18 · mate · ground | — | The friend on the steps with nothing in his hands; give him the scarf. | `THE-WORKER-LIFE-SCRIPT.md` scenario 9, moment two; `lib/life/content/threads.ts` |
| Y1 | `own-seat` | 19 · kiosk · kiosk | — | Your own season card: next to Dad, or with the crew. | `THE-WORKER-LIFE-SCRIPT.md` §3 (the season tickets); `lib/life/subscription.ts` |
| Y2 | `away-abroad` | 21 · mate · corner · matchday | `europe-night` | Abroad: dead phone, your friend's ticket in your pocket. | `SCREENPLAY-2000-2026.md` E03 (first passport), E05 (find the bus) |
| Y3 | `the-drift` | 22 · neighbour · pitch | — | The friend who drifts: "it's only a game". | `SCREENPLAY-2000-2026.md` K01–K03; `THE-WORKER-LIFE-SCRIPT.md` scenario 8 (the one who counts) |
| Y4a | `their-banner` | 23 · mate · pitch · matchday | `derby-banner-raid` | Ultras, light: their banner home before the derby, nobody hurt. | `THE-WORKER-LIFE-SCRIPT.md` §5 ULTRAS; rule 125 §3 |
| Y4b | `the-coach` | 23 · kiosk · corner · matchday | `away-day` | Away: run the coach; the boy who can't pay. | `THE-WORKER-LIFE-SCRIPT.md` §5 TRAVELLER ("no passenger left in debt") |
| Y4c | `the-vote` | 23 · neighbour · school | — | Member: the vote on prices; "not our club to run". | `SCREENPLAY-2000-2026.md` U01–U05, N03 |
| Y4d | `the-far-job` | 23 · dad · home | — | Far from home, chosen: "ring me at half-time". | `THE-WORKER-LIFE-SCRIPT.md` §5 DISTANCE_RETURN; `SCREENPLAY-2000-2026.md` X01, K01 |
| Y5 | `the-promise` | 25 · kiosk · kiosk · matchday | `cup-final-trip` | The night you choose: the final, the promise, or both. | `STAGE-B…` §4.5 (miss a cup for a promise); `THE-WORKER-LIFE-SCRIPT.md` scenario 3 |
| Y6 | `the-calendar` | 26 · neighbour · home | — | The fixture list on the fridge, half someone else's. | `SCREENPLAY-2000-2026.md` L02, L04 |
| Y7 | `the-new-gate` | 28 · dad · ground · matchday | `new-ground` | The first day at a new gate; no step is yours yet. | `SCREENPLAY-2000-2026.md` N05–N06; `lib/life/content/chapter2015newhall.ts` |
| Y8 | `the-news` | 30 · dad · home | — | Somebody small is coming; Dad fetches the Box. | `SCREENPLAY-2000-2026.md` L06, L09 |
| A1 | `arms-up` | 31 · kiosk · kiosk | — | A first shirt, the other way round. | `THE-WORKER-LIFE-SCRIPT.md` A4, scenario 7; `lib/life/shirts.ts` |
| A2 | `the-armchair` | 33 · dad · home | — | The armchair years with Dad and the remote. | `SCREENPLAY-2000-2026.md` A01, A03 |
| A3 | `their-first` | 34 · dad · ground · matchday | `lead-the-way` | Their first match; you promised they could leave. | `SCREENPLAY-2000-2026.md` L07, F03; `THE-WORKER-LIFE-SCRIPT.md` A1 (shoulders) |
| A4 | `dads-last-away` | 36 · dad · corner · matchday | `away-day` | His last away: today he follows you. | `THE-WORKER-LIFE-SCRIPT.md` scenario 9 ("now I take you"), B6 א4 (the fuel stop receipt) |
| A5 | `their-saturday` | 38 · neighbour · school | — | Their own match at the same time as yours. | `SCREENPLAY-2000-2026.md` L09 "the scarf doesn't choose for him" |
| A6 | `the-empty-seat` | 40 · neighbour · ground · matchday | `kickoff-run` | Dad can't do the steps; the seat beside you; he heard it on the radio. | `THE-WORKER-LIFE-SCRIPT.md` §1 (the empty step); `SCREENPLAY-2000-2026.md` D01, D07; `STAGE-B…` §4.4 |
| A7 | `the-bucket` | 42 · mate · kiosk | — | The club in trouble: buckets at the gate, counted in public. | `SCREENPLAY-2000-2026.md` P01–P07 (P02), U04 |
| A8 | `nobody-went-home` | 44 · neighbour · ground · matchday | `title-night` | The big night: find the little one in the crowd, ring Dad. | `THE-WORKER-LIFE-SCRIPT.md` A8 (1986, the film at the end); `SCREENPLAY-2000-2026.md` D07 "Dad?" |
| A9 | `no-reserved-place` | 46 · mate · corner | — | The friend (or you) comes back: no reserved place, but friends. | `SCREENPLAY-2000-2026.md` K03 |
| A10 | `handed-on` | 48 · dad · home | — | The Box handed on; an empty space on the shelf. | `THE-WORKER-LIFE-SCRIPT.md` scenario 9, moment three; `SCREENPLAY-2000-2026.md` F02, F03.1; FAN LIFE `LIFE-STORY-FLOW…` §4 |

Small jobs: `grounded` (the comedy of the other life, `lib/life/content/dialogue.ts` "the other life closes at two"), `shirt-swap`, `paying-back`, `the-older-lot`, `dads-stories` (THE WORKER's oral history, `THE-WORKER-LIFE-SCRIPT.md` B6), `the-shutters` (the kiosk keeper, `LIFE-SCREENPLAY-BIBLE-2026-09-27.md` cast). Standing work by stage, after `lib/life/gigs.ts`, `lib/life/toto.ts` and the NPC schedules (`lib/life/content/schedules1986.ts`).

## What stayed Hapoel-only, on purpose

- Every name: Pogi, Kobi, Rachel, Efi, Ofir, Amit, Keren, Liron, Shachor, Limor and the rest of THE WORKER's canon. The hood has four roles (Dad, the mate, the kiosk, the neighbour), named by each club's own cast.
- Real people: the hero is "the name on Dad's wall", never a player; no real official, owner or rival is a character.
- Places and markers: Bloomfield, Ussishkin, Gate 7 / Gate 5 (now "the end", "the same step"), the second home in the basketball hall, Allenby, Jaffa, the central bus station, Egged, Toto, shekels, the army (now "national service where it exists"), the Beitar-branded bus (now "the other lot in their colours").
- Every dated anchor: 1983, 1986, 1990, 1991 (the curfew night), 1993, 1996/97, 1998, 1999, 2000, 2007 (the founder window, whose title is never granted after the fact), 2010, 2026. A date or a score reaches a chapter only through the Fitter; no story word holds a digit.
- Hapoel's own stories: the Histadrut sale, supporter ownership and Hapoel Ussishkin, the international and anti-fascist friendships, the 2025 owner branch. They are club history, not a universal life.

## Checks

`npx vitest run tests/life-story-arc.test.ts` (23 tests): shape by the director's rules; templates real and age-fitting; ultras templates only on the ultras route; forks converge; every key exists; no digit, Hebrew, Greek, club or Hapoel/Israel marker in any line, id or effect; for each of `CORE_CLUB_IDS`, eight seeded lives walk six to forty-eight without ever running out of missions, deterministic, every stage ending, one side of each fork; and five hundred lives reach every approach and every complication answer.
