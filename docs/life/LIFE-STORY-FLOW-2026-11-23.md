# LIFE · story flow and the watch layer (23.11.2026)

Owner, 23.11.2026, in meaning: connect the film studio to produce transitions; one full flow of game and story; freedom of choice, but there is always a mission in front of you and it can go several ways; keep the emotion and the real history. The Worker's 1986 chapter ends on the real match film, and that is the model: a viewing experience beside the game.

This document is the design. The code is `lib/life/hood/story/` (the story director), `lib/life/watch/` (the watch layer), `components/clubs/life/watch/WatchCard.tsx` (the viewing moment) and `scripts/life/transition-requests.ts` (the studio bridge). Rule: `docs/rules/life-story-watch.md`. Nothing here is mounted in the hood yet (section 8).

## 1 · The loop

```
roam → a PERSON gives a mission → pick 1 of 2–4 APPROACHES → do it yourself, step by step
     → one COMPLICATION (2–3 answers, none a dead end) → every approach CONVERGES on the same last step
     → AFTERMATH: people, money, reputation, what goes in the Box → the next mission is offered
```

It is the screenplay bible's quest language (TRIGGER / NEED / COLLISION / APPROACHES / COMPLICATION / CONVERGENCE / AFTERMATH, `docs/life/LIFE-SCREENPLAY-BIBLE-2026-09-27.md` §0–4) in the hood's terms (rule life-one-engine-hood: a job starts from a person, the player performs every step, no clock, no fail state).

| Bible | In the hood | In code |
|---|---|---|
| TRIGGER / NEED | the giver's offer line | `Mission.giver`, `story.m.<id>.offer` |
| APPROACHES | 2–4 ways, at least two always open | `Mission.approaches`, `Approach.needs` |
| COLLISION / COMPLICATION | one thing goes wrong, he answers it | `Mission.complication.choices` |
| CONVERGENCE | the one last step of every approach | `Mission.converge` |
| AFTERMATH | effects whatever he chose | `Mission.aftermath` → flags, bonds, money, reputation, keeps |

**Always a mission.** `nextMissions(state)` is never empty: the chapter when it is ready (both sides of a fork), the one-off small jobs that are open, and, when the chapter waits for matchday or the written life is over, the week's standing work (papers, kickabout, radio check). An accepted mission is the only one offered until it ends; walking away costs nothing.

## 2 · The week

Seven days: day 0–5 build up, day 6 is matchday. Every finished job (or "call it a day" at the front door) moves the week on one day. A chapter marked `matchday` opens only on day 6; until then the street offers side and standing jobs, so the week fills with small work and ends at the ground. After matchday the week starts again. A chapter moves the life on to its own age, and that jump is where the studio's time-advance bridge plays.

## 3 · Life stages and routes

| Stage | Ages | State |
|---|---|---|
| Childhood | 6–12 | written: ten chapters, four small jobs, three standing jobs (`childhood.ts`) |
| The teens | 13–18 | not written; Season One E6 belongs here (section 5) |
| On your own | 19–30 | not written |
| Your turn (adult, parent) | 31–48 | not written |

Routes open from the teens: **family**, **ultras** (the end behind the goal; rule 125 §3 binds it), **away traveller**, **member / activist**, **far from home**. Childhood is the family route for everyone. A route is a lean, not a lock: the spine stays shared, the route changes which approaches and side jobs appear.

## 4 · The emotional spine

Father → son → the next generation. Childhood ends on **the Box**: Dad hands over a box like the one his father gave him, and what each chapter kept goes in it (scarf, shirt, half a ticket, the album, a corner of the banner, a thread from the fence). The Box is the save's memory made visible (`StoryState.keeps`), and the adult stage ends by handing it on. Chapter 7 (Lead the Way) is the first time he passes something down: he takes a smaller child to their first match.

## 5 · Real nights, or personal ones

A chapter stands on a real archive night only when the RUSH Fitter says **READY** for the chapter's template, asked over the years that chapter is lived (`chapterFits`: birth year + age, a year either side; no night is used twice). Then the row is printed as approved: date, title, sources. In every other state (NEUTRAL, HELD, IRRELEVANT, or no birth year on record) the chapter is **personal**: the same mission, no date, no score. The story's own words never hold a year, a score or a club (a test enforces it).

On 23.11.2026 the Fitter binds childhood nights for 13 of 13 core clubs (1 to 5 chapters each); the list is printed by `scripts/life/transition-requests.ts`.

## 6 · Season One on the street

| Episode | Hood mission | Giver · place | Approaches | Complication | Aftermath | Archive night needed |
|---|---|---|---|---|---|---|
| E1 The First Noise (6) | `first-noise` | Dad · home, matchday | kiosk first · scarf first · the neighbour's radio | the crossing is jammed, the noise has started | the first scarf; Dad +; radio at home or next door | none needed (`kickoff-run`: a home match of that year dates it) |
| E2 Six Short (7) | `six-short` | kiosk · kiosk corner | stack crates · wash the car · collect empties | one coin short | the first shirt (bought, owed, or Dad's old one) | none (`bottle-run`) |
| E3 The Way In (8) | `the-way-in` | Dad · the ground, matchday | with Dad · the mate's short cut · early with the neighbour | the queue takes half the ticket | half a ticket; "been inside" | a home match dated to the day (`first-step`) → the watch card |
| E4 The Missing Square (10) | `missing-square` | mate · school gate | swap doubles · buy packets · play for it | only a kid from the other lot has it | the album, full or one short | the week's paper (`sticker-swap`; `clipping-hunt` when the zoom mission is mounted) |
| E5 No Ticket (12) | `no-ticket` | mate · the corner, matchday | the fence · ask Dad · the kiosk radio | Dad was there | a thread of the fence; Dad knows | a home match of those years (`sneak-in`) → the watch card |
| E6 Away (15) | not written (teens) | the crew · bus stop to be added to the hood | on the bus alone · go back for the friend · the later bus | the bus does not wait | both halves of the bus ticket | an away match dated to the day (`away-day` / `away-pen`) |

Between them the street adds: `monday-colours` or `the-window` (a fork at nine that converges on "the street knows you"), `her-seat` (a Saturday without Dad), `lead-the-way`, `the-banner`, and `the-box`.

## 7 · The watch layer and the studio

**Watch.** `watchFor(clubId, {matchDate | matchId | chapter})` returns the match highlights, our own film and an interstitial, from repository records only; nothing recorded → `null`. Every row in `lib/life/watch/data.ts` names the file that holds its link, and a test opens that file and looks for the id.

- The Worker's 1986 link: `lib/life/cutscenes.ts` → `CUTSCENES['1986-championship']` (the same file, byte for byte, in The-Worker), played by `components/life/HistoricalCutscene.tsx` at the end of the 1986 chapter. Four more match films are in that file (its period reel of 1999 is left out: its own record says it is not footage of the match); seven archive film rows are in `lib/life/history/days.ts`.
- The studio's published films: `scripts/football-stories/channel/<film>/upload-meta.json` (`published.film`, `published.short[s]`), `…/youtube.json` (`video_id`) and `scripts/football-stories/channel/shorts-<date>.json` (`full`, `video_id`).
- The card embeds from `youtube-nocookie.com` only after a tap on a drawn poster (no request leaves the page before it), links out with "Watch on YouTube", and Continue is always enabled.

**Studio bridge.** `scripts/life/transition-requests.ts` writes `scripts/football-stories/life/transition-requests.json`: per club, one `chapter-card` per chapter, one `time-bridge` per year gained, one `matchday-opener` per matchday chapter (22 clips a club today), each with duration, formats `9:16` and `16:9`, text beats, and the archive night where the Fitter bound one. `--check` fails when the file is stale. It renders, uploads and publishes nothing.

**The hook (not wired; this is the exact place).** The studio's worker (`scripts/football-stories/studio/worker.py` → `run_once`) dispatches a job by `kind` to a maker in `scripts/football-stories/studio/kinds.py`; job kinds are declared in `lib/stories/jobs.ts` (`JOB_KINDS`, `newSpecialJob`). A LIFE interstitial is a new kind, `life-transition`, whose spec is one request row (`id`, `club`, `kind`, `beats`, `night`, `seconds`, `formats`): the maker renders the beats with the studio's own type and motion (`studio/cinema/type.py`, `studio/motion.py`, club palette from `scripts/football-stories/palettes.ts`), writes `public/life/transitions/<club>/<chapter>-<kind>.{mp4,webm}` (de-yellowed and encoded as `lib/life/transitions.ts` describes), and the delivered clip is then recorded in `lib/life/watch/data.ts` → `TRANSITION_CLIPS` with that path. It was not added in this round because it needs a queue row type, a maker and a storage decision that were not fully read; nothing was triggered.

## 8 · Not done

- Nothing is mounted: `HoodHost` still runs the single M1 job. `toHoodJob(level, mission, approachId)` returns the job, the steps and the pickups to append; `JobId` in `lib/life/hood/types.ts` has to widen to `string`, and the run has to hold more than one job.
- Teens, young adult and adult arcs, and the routes, are tables only.
- The save does not hold `StoryState` yet.
- Only Hapoel Tel Aviv has match highlights on record. Other clubs get them when a link is recorded in their archive (a `films`-style row with a source), never by search.
- No interstitial was rendered. The eight Worker clips are the only ones that exist.
- No handoff: a "watch on our channel" door to YouTube is not a cross-app moment in `ecosystem/contract.json`; if the channel should count in the funnel it needs its own decision.
