# Pass C — 2000–2012: route parity and experience QA (28.9.2026)

Source brief: `docs/life/IMPLEMENTATION-PASS-PROGRAMMER-2026-09-27.md` §21–§40.
Guard: `tests/life-c-pass-2026-09-28.test.ts` — every chapter ends for four confused tempers
(seeded on the empty worldline), ≥2 physical verbs per chapter, and §11.4 with the remaining
dialogue-as-deed choices named (`LEFT`). World rows: `lib/life/world/passC.ts`; chores:
`lib/life/content/storyChoresPassC.ts`.

## What plays differently

| chapter | what the hands do now | persistent flag (read later) |
|---|---|---|
| 2000-bridge | Amit's list is written at the counter (`list-00`, 5 notes) — skill/trust by what was written | `b:list-full` (day) |
| 2000-team | the one-two drill is played on the dirt (`onetwo-00`) | — |
| 2002-desk | J01 rebuilt: three evidence cards on the café table (phone/notes/tape), ask Shani for the photo, the cashier at the ticket office as second source, 21:00 deadline; kill/rumour/memoir/verify | `life:desk:first` |
| 2006-desk | J02: what 2002 left on the desk (letter after a rumour, envelope after the truth), call him first / second source / correct / defend | `life:desk:j2` |
| 2006-home | a red confetti scrap on the parquet for whoever stayed for the derby | `life:uss:confetti` (read in 2007-registered, `u-confetti`) |
| 2007-table | the progress board in the community room — what moved without you — before the close | — |
| 2009-up | the hall empties: lights / fold chairs (`chairs-09`) / wait with the child / hand Inbal the key; last light read from it | `life:2009:closed` (read in 2012-five, `n-key`) |
| 2010-cup | the week before: shift / Keren's birthday / nothing; Oli's call about Teddy | `life:cup2010:owed`, `life:teddy2010:asked` (read in 2010-teddy and 2010-anthem) |
| 2010-qualify | the qualifier evening is SET UP (`qualify-10`: chairs, cups, aerial, list) | — |
| 2010-friends | Roma's three needs by 20:15: clear the sofa (`sofa-10`), buy two tickets (120 ₪), translate the banner line by line — or give/refuse to Roma out loud; banner put up by hand (`banner-up-10`) | `life:intl:hosted` (read in 2010-anthem `c10-host`) |
| 2010-anthem | Metuki's plates carried to the table (`plates-10`) before he sits | — |
| 2011-people | Melanie's reflector, Dor's posters; the invitations come from THEM. **Softlock fixed:** `l-close` beat raised `l:done` before the talk | `life:partner` |
| 2012-cups | rebuilt: the promise on the phone (time/whistle), diary on the fridge, sofa beside Kobi, pressure beat (keep/break/lie), partner at the café or Amit's boxes (`move-12`) | `life:promise:2012`, `life:cups2012` (read in 2012-five `n-echo`) |
| 2012-five | Shachor at the corner on who closes the hall since 2009 | reads `life:2009:closed` |
| 2001/2012-terrace, 2002-europe, 2007-registered/-key, 2010-teddy | reviewed; no change beyond tonight's rooms (not redone) | — |

## Route parity (13 routes × chapter, condensed)

Every chapter is finishable on the empty worldline (`life:worldlines` 32/32). Route-specific
screens: journalist → 2002-desk/2006-desk; ultras/leader → 2012-terrace; founder → 2007×3/2009-up;
international → 2010-friends/-anthem; relationship-first → 2011-people/2012-cups (partner at the
café); no-partner → Amit's move; work-first → 2010-cup shift, 2000-bridge shift; low money →
2010-friends "give tickets to Roma" / "refuse" (both closed without a shekel); broken promises →
2012-cups `lied`/`broken` endings, 2010-teddy `d10-miss`. Regular supporter path completes in every
chapter with no route flag.

## Experience QA (§4)

Headless simulation only (`lifeWorldSim`, 4 tempers × 20 chapters, all end, streak ≤ 2). **Browser
play at 390×844 was NOT done this pass** — the shared machine was under load and the pass was
interrupted by a rate limit. Needs a probe run before calling the chapters shipped.
