# LIFE · the hood — feel audit (24.11.2026)

Direction for the round: game flow, story flow, the flow of the challenge and the missions; the reality of the past; enjoyment; connection to the character.

## How it was measured

`lib/life/hood/story/feel/playthrough.ts` plays a new life through the hood sim and the story director, no browser. A "real player" presses New, types a name, sits through the opening, walks to whoever the HUD points at (the first offer), reads every line, takes the first way, does every step himself (RUSH's bot walks and reads the traffic, sprinting while it has the legs), answers the complication, reads the cards. Two clocks: street seconds (sim) and screen seconds (a line: 0.9 s + 0.045 s per character, a choice +1.4 s, a card 4–6 s, title 2 s, name 6 s, an intro beat 3.8 s). A **gap** is street time between two things he does or that happen to him (talk, step, pickup, accept, finish, complication, challenge event, arrival); a line in his head does not close a gap. **Dead walk** is the part of every gap beyond 20 s. Run: 30 minutes, seed 1, `hapoel-tel-aviv` and `olympiacos` (the two gave the same numbers within 2 %; birth year 1978 for both).

`tests/life-feel.test.ts` runs the same harness and holds the budgets below.

## The 10 worst moments, before (code at `376d6292`)

| # | Moment | Numbers |
|---|---|---|
| 1 | **The week is a grind.** A matchday chapter waits for day 6, so the week's work fills the days one by one, and the focus is always the same job. | 16–17 standing jobs in 30 min against 8 chapters; worst wait **6 jobs** between two chapters; the papers round (241 m, ~46 s) ×16; `story.m.papers.offer` read **×17**. |
| 2 | **A slow, menu-first start.** Title, name, a four-beat intro, the chapter card, then a walk to Dad and a menu (a side job sat beside the chapter). | Control at **27.2 s**; first mission at **39.1 s**; first step at **50.3 s**; Dad's first words a menu, 2 lines. |
| 3 | **The dead walk to the ground.** Matchday steps end at the gate, 320 m up the road, with nothing on the way. | Max gap **61.8 s**; 2 gaps over 40 s; **145 s** of dead walk in 30 min. |
| 4 | **The walk back home after the match.** The next chapter (or the converge talk with Dad) starts at the front door while he is at the gate. | ~55 s of empty street each time (measured 54.9 s and 55.8 s). |
| 5 | **No stake, no clock.** Kick-off, the kiosk shutting, a curfew are in the words but nothing ticks; nothing can go wrong in the street. | 0 missions with a clock; 0 fail-forward outcomes; the only risk was a talk choice. |
| 6 | **Every way plays the same.** The 2–3 approaches differ only in where he walks and what he picks up. | 3 step kinds (walk, collect, talk) across all 31 childhood approaches. |
| 7 | **The next mission after a menu, far away.** After the last card he walks to the next giver, then opens a menu. | 11–22 s walks (61–126 m) after every card; `story.talk.menu` ×3. |
| 8 | **No past.** The street of 1984 is the street of 2014: no year, abstract coins, no radio, payphone, paper or tape. | 0 era items; money is a bare number. |
| 9 | **No him.** His name is never said in play; no voice, no nickname, no Heart, no look back at a stage. | 0 inner-voice lines; 0 callbacks; 0 recap cards. |
| 10 | **No juice.** A keepsake is a chip on a card; the ground does not roar when he gets there; no paper the morning after; the hood plays no sound. | 0 reveals, 0 arrival beats, 0 sound cues. |

## What changed, by moment

1. **The week is felt, not served** (`director.ts`): when the next chapter waits for matchday, the week's work jumps to the eve and then to the day (a `midweek` event and the inner voice say so), so at most two small jobs stand between two matchday chapters; the standing work rotates (least done first). Standing jobs got their own little challenge (papers before the kiosk shuts, a carry, a curfew kickabout, bargaining for batteries).
2. **The cold open** (`feel/session.ts → feelStart`, `HoodHost`): two lines (2.6 s each) instead of four at 3.8 s; the chapter card carries his age; Dad's offer is open in his ear the moment the card closes, with no walk. A chapter's offer is never behind a menu (`play.ts → storyTalk`: the chapter first, small jobs behind "Something else?").
3. **The walk to the ground has something in it**: three knots of people singing on the main street (RUSH's own rings); on a matchday, stand in one a moment and the song gives the kick-off clock 8 s back. From ten, once he has been inside, **the bus** at the mate's corner is a shortcut (fare in the era's money).
4. **No dead street home**: a match is the time skip — reaching the gate and then a talk back home puts him at the front door ("Full time. The walk home is a blur of songs."); a new day that starts far up the road starts at the front door.
5. **A ticking reason on the HUD** for every chapter way and most small jobs (`challenge/table.ts`): kick-off, the kiosk shutting, the school bell, dark, the gates, tea on the table, Mum's curfew for the teens. A clock that runs out is a **slip**: the story bends (a flag, a line, the street's opinion), the mission still ends. Children get 1.6× / 1.3× the time.
6. **Each way plays differently** (`challenge/run.ts`), on top of the steps it already had: RUN against the clock; SNEAK past a watcher whose look sweeps (seen running in it is a slip); CARRY (no sprint, two knocks spill it); FIND with RUSH's own search (the thing is in one of a few places, stand and press talk, warmer/colder on the HUD; a child has fewer places); SPEND the coins in his pocket (two things, the era's prices); BARGAIN (half is laughed off, a fair offer saves a coin, paying keeps the keeper sweet); a PROMISE to two people with two clocks.
7. **The next offer at the high**: after the last card the next giver calls him over (`feelAfterCards`), so the next chapter starts where the last one ended; "Not now" always works.
8. **The past in what he does and sees**: `lib/life/rush-render/era.ts` (decade tables: parked car silhouettes, phone box or payphone, aerials and dishes, kiosk wares; one-line hook in `hood.ts`; a plain first pass the renderer may refine) and `feel/era.ts` (money in the country's own money where the pack gives the country — shekel, drachma → euro 2002, lira, mark, pound, dirham, Egyptian pound, dinar → convertible mark 1998 — else neutral coins; the radio as the only live source before 1990, the set in the corner in the 90s, a text in the 2000s; texture lines on a long walk, each tied to a thing with its first year).
9. **Him**: a first-person inner voice at the start and end of each mission (warm, a little funny), callbacks that remember (Dad's old shirt, the radio through her wall, half a ticket, the empty square, the window Dad still does not know about), the nickname the mate gives him from how he did the first chapter, one visible **Heart** meter (what he has lived, never what he repeated; shown, never popped), a **recap card** at the end of each stage (his name and age, his ways, the Box, who stood by him, the Heart, the things that went wrong and made a story).
10. **Juice**: "Into the Box" as a major banner with the box-lid sound; the ground's roar on arrival; the paper the morning after a dated matchday (headline from the archive row only, his name in the crowd photo caption); sound cues from `sound.ts` (clock, found, kept, missed, the song), off with the sound setting, woken only by a gesture; the HUD's pulse and the voice line respect reduced motion.

## Pacing, before → after (30 min, both clubs)

| | Before | After | Budget (test) |
|---|---|---|---|
| Control (from pressing New) | 27.2 s | 17.2 s | ≤ 20 s |
| First mission | 39.1 s | 24.2 s (7 s after the street) | ≤ 30 s, ≤ 10 s after control |
| First step done | 50.3 s | 36.3 s | — |
| Chapters in 30 min | 8 | 17–18 | ≥ 10 |
| Week's work in 30 min | 16–17 | 5 | — |
| Worst wait between chapters | 6 jobs | 2 | ≤ 2 |
| Max gap | 61.8 s | 48.1 s (quietest stretch 32.9 s) | ≤ 50 s |
| Gaps over 40 s | 2 | 1 | ≤ 2 |
| Dead walk | 145 s | 79–81 s | ≤ 120 s |
| A step line repeated | ×16 | none above ×1 | ≤ 4 |

## Not done / risks

- **Reading time grew**: about 40 % of the half hour is now reading (cards and lines, 683–718 s of 1800). The next round should shorten cards (one line each) and let the voice line run over the street only.
- The street's year is fixed per level (the birth year + 9, the middle of childhood); the teens and later still wear the childhood decade.
- The era dressing and the HUD were type-checked and unit-tested, not seen in a browser (the other session owns the dev server).
- The 48 s gap left is the walk from the far side street to the ground on a matchday way that skips the main street's song.
- Prices are texture, not a record: proportions follow THE WORKER's `prices.ts`; no number is claimed as history.
