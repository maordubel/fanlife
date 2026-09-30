# Route parity + Experience QA — Stage A (A1 1983 → A8 24.5.1986)

Implementation pass 28.9.2026 (`docs/life/IMPLEMENTATION-PASS-PROGRAMMER-2026-09-27.md` §1–§8, §3, §4).
Tests: `tests/life-stagea-pass-2026-09-28.test.ts`, `tests/life-stagea-quest-90c.test.ts`.
Browser: `node scripts/life/pass-stage-a-probe.mjs http://127.0.0.1:3211` (390×844; shots in
`data/life-shots/pass-stage-a/`, not committed).

## Which routes exist at 5–8

The life routes (Ultras, journalist, owner, founder, abroad, parent/no-child) are offered from
later chapters — at 5–8 they **do not apply** and nothing in Stage A pretends otherwise. What a
childhood CAN diverge on, and what this table measures:

- **regular** — does the chapter's thing in the offered order
- **money-low / money-high** — A4 gives half/all the tin vs keeps and works
- **promise-breaker** — A2 names "before five" and misses; A7 lies
- **relationship-first** — Amit holds the bread, gives the tin, sits with the wet father, asks via Rachel
- **work-first** — crates/favour/street job (A4), the usher's door and hall gigs (A3)
- **terrace-first** — plays in the new shirt (A5), scouts the fence gap / plan with Ofir (A7)

"Minutes active" = game-clock minutes the route spends doing, not waiting (from the sim).

| chapter | route | meaningful actions | unique screen | unique consequence | callback written | min |
|---|---|---|---|---|---|---|
| A1 | regular | look · crowd gesture · grip · stub | terrace, grip mark | `life:a1:instinct/body/grip` | 1986 shoulders | ~8 |
| A1 | relationship-first | **touch scarf (new gesture)** · cling | scarf mark on painted scarf | `life:a1:scarf=held` | A5 gate scarf, 1986 shoulders | ~8 |
| A1 | curious | "מה קרה?" · floor · red scrap | red-scrap mark | `life:a1:red`, `own:red-scrap` | A2 pillow; 1986 "הפעם אני אסביר" | ~8 |
| A2 | regular | bread "טוב" · kiosk · **loaf on the wall** · play | squashed loaf at home | `life:a2:home=truth/silent` | A4 wallet (truth told back) | 45 |
| A2 | relationship-first | **Amit holds the bread** | Amit at the door | `held-the-bread-1984`, `life:a2:home=amit` | Amit trust | 45 |
| A2 | promise-breaker | "before five", miss it · **run to Rafi's shutter** / explain / silent | Rafi back door toast | no `promise_kept`; `life:a2:home=ran` | 2010 bread memory (existing) | 40 |
| A2 | work-first/cautious | **run bread home first** | bread drop in flat, teams full | `late` ending | — | 50 |
| A3 | regular | Efi walks up (initiative) · follow · **arch at Allenby** · queue · name · ball · step | Efi leaving; arch; hall | `life:knows:hall`, `life:a3:ball` | 1986 efi-hall (knows the hall) | 90 |
| A3 | work-first | **usher's door** (20 min) | door-holding toast | `life:a3:usher=door` | 1986 Efi: "שומר הדלת" | +20 |
| A3 | terrace/brave | **locker door under the basket** (wish / run) | corridor + player | `life:a3:locker` | 1986 Efi recalls | +20 |
| A3 | late | dawdles past **tip-off 18:05** | game already running | warm-up doors closed | — | — |
| A3 | refusal | "לא עכשיו" | street evening | `life:efi:deferred` | A4 second chance (existing) | 10 |
| A4 | regular / money-high | tin · keep · crates · bottles · favour · counter | Kobi walks in | gift, `life:first-shirt:gift` | A5 shirt, many later | 180 |
| A4 | money-low | **half on the table** (−6) | wallet scene | `gave-half-1985`; shirt 6 further (poorest week: short → notYet) | A5 plain/fathers branch | 180 |
| A4 | relationship-first | **promise "what's left is yours"** → collected after gift | coins on her table | `promise_kept:tin`, `life:a4:promise` | Rachel trust | 185 |
| A4 | relationship-first (max) | give all | — | `gave` ending | A5 no-shirt branch | 60 |
| A5 | regular | dress · **Ofir walks up** · keep | Ofir at the shirt | `life:a5:shirt=kept` | — | 30 |
| A5 | relationship-first | **lend for a lap** | Ofir running in it | `wore-your-shirt-1985`, Kobi "רטובה בגב" | Ofir trust | 36 |
| A5 | terrace-first | **kick in the shirt** | stain on crest | `stained` → Kobi, gate close, **A6 radio line** | A6 | 40 |
| A5 | money-low (no shirt) | plain + **Ofir's small scarf** / father's shirt | scarf close | `life:a5:shirt=ofir-scarf` | Ofir shared history | 30 |
| A6 | regular | radio · antenna ride · torch batteries · listen | half-sentences | `heard` | — | 170 |
| A6 | relationship-first | Liron's wire / **sit with wet father** | Kobi at the door / car at Liron's | `life:a6:after=stayed` | **A7 armrest** | +5 |
| A6 | quitter | switch off → card → **father** (stay/away/ask) | wet coat | `life:a6:after` | A7 armrest | 90 |
| A7 | regular | Amit page · Ofir · ask → **plan B knock** | knock at window | `life:a7:plan=ofir/amit/none` | **1986 Ofir at two / Amit gate 7** | 60 |
| A7 | relationship-first | **ask via Rachel** | Rachel to the salon | `life:a7:via-rachel` + promised | 1986 "נראה" morning | 60 |
| A7 | work-first | **offer to wash the car** | — | `life:a7:bargained` | **1986 "האוטו עוד מלוכלך"** | 55 |
| A7 | promise-breaker | **lie: Ofir's father takes us** | Ofir furious at window | `lied` ending, `life:a7:lied` | **1986 "דיברתי עם אבא של אופיר"** | 55 |
| A7 | terrace-first | gap under the fence | gap | `life:a7:scouted` | 1986 gap entry (existing) | +30 |
| A8 | all | morning reads A7; plan partner; gate entries; film; reunion → **shoulders reads A1** | shoulders | `life:a8:shoulders` | 2026 reversal (bible) | ~240 |

**Failure-condition check (§3):** no route gets "same scene + two lines" — every row above
changes a person, place, object or clock, and each writes a flag the next chapter reads.

## Experience QA (§4) — played at 390×844

| | A1 | A2 | A3 | A4 | A5 | A6 | A7 | A8 |
|---|---|---|---|---|---|---|---|---|
| 1 eye first | terrace alone 1.6 s, then box | flat, Rachel | stranger with orange ball | tin under bed | shirt on chair | rain, radio | quiet street | bedroom/street |
| 2 hand first | scarf / look | talk Rachel | walk up (he closes gap) | empty tin | wear | switch on | Amit's page | wardrobe/Ofir |
| 3 decision < 20 s | yes | yes | yes | yes | yes | yes | yes | yes |
| 4 challenge differs | sensory | errand vs clock | navigation + scarcity | money | social | persistence | negotiation | convergence |
| 5 world reacts before card | surge, grip catch | squashed loaf / Rafi door | tip-off whistle, Efi leaves | Kobi walks in | stain / wet back | father comes home | knock | shoulders |
| 6 blocked legible | n/a | teams full said | usher door blocked text | Rafi "אין לך 30" | Kobi left toast | — | — | gate refusals (existing) |
| 7 can miss w/o break | red scrap, stub | play / bread | locker, usher, ball | gift (short) | Ofir | Liron | plan | Efi, Ofir |
| 8 next opens different | cup83 film → flat | street a year on | tin/bedroom | Saturday car | winter rain | street crowd | 1986 morning | 1990 passage |

Probe result (28.9.2026): A1–A8 PASS in browser after two harness fixes (runtime `choose` instead of
DOM click; wait for the radio passage). Known art gap §1.1.2: the 5/6/7-year-old Pogi sprites do
not exist; the eight-year-old stands in (visual QA of A1–A6 bodies stays blocked on art).
