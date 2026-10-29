---
name: life-rush-mission-authoring
description: Write or change a LIFE · RUSH mission (the GTA/DOOM action engine that plays a mission inside LIFE) — template, archive needs, Fitter states per club, spec, tests. Use whenever a mission, a verb, a hazard, a mission need or the RUSH Fitter is added or changed.
---

# LIFE · RUSH — authoring a mission

ADR: `docs/adr/fanlife-0013-life-two-engines.md`. Code: `lib/life/rush/` (pure), `lib/clubs/life/rush.ts` (club view).
TOWN (the voxel day) is not touched by a mission. RUSH never writes the save.

## 1. Decide the mission in one line
Verb (run · drive · sneak · carry · find) + place + clock + what is at stake. If it needs two verbs, it is two missions.
Camera: `chase` by default; `eyes` for sneaking, finding, tunnels.

## 2. Route and hazards
- `main`: nobody is harmed. Hazards from `clock traffic police crowd height weather steward`.
- `ultras`: may add `strike` (thrown objects), `shove`, `steal` (a rival group's gear). Never blood, weapons or injury.
  Rival ultras groups are invented and wear nothing the club page bans.
- `clock` is in every mission.

## 2b. The quest (RUSH 2) — every mission is steps, in an open place
A mission is not one dash. `lib/life/rush/quest.ts` gives every template a recipe, and a script may ask for a
version of it with `mission: {template, beat}`. Build it from these parts only:
- **steps**, in order, the last always `goal`: `reach` (a place, or a group that falls in) · `talk` (act next to him;
  `cost` = game seconds, `say` = his line) · `collect` (every pickup of the step; open world: picked early counts) ·
  `stop` (the car in a lay-by, `hold` s; passing it costs time, never ends the drive);
- **escort** (`joins`): somebody walks with you at his pace; too far and he stops; the gate waits for him;
- **extras**: `pickups` with `step: null` (+5 s each) and singing `rings` (+8 s) — optional, never required;
- **noises** (sneak): a bin that turns every steward's head for 3.5 s;
- **clues by asking** (find): `talk` steps with `reveals`.
Every key a step prints (`obj.*`, `npc.*`, `got.*`) needs words in both languages. The bot must win every beat on
every seed (`tests/life-rush-sim.test.ts`): if it cannot, fix the level or the bot, never loosen the test.
Place things on the near side-street pavement (`sidePave`) or the main pavements — never in a car lane.
A script asks for missions only on EXISTING options (a new option multiplies the exhaustive LIFE sim).
Briefing cards: `public/life/rush/cards/<template>.webp` (`cards.ts`), grey, fiction, English title printed in.

## 2c. A run at home (place `flat`, rule 130)
`flat-run` builds `lib/life/rush/flat.ts`: rooms + `FLAT_DOORS` (walk through by the two approach points — `flatVia`),
furniture `blocks`, toy `trips` (fall only at a sprint), Mum and the cat as patrols (`role: 'mum' | 'cat'`), voices on
a time (`Voice.t`). A new home mission reuses this place; a new room is a row in `FLAT_ROOMS` + a door, and the bot test
must still win every seed. The camera there never turns with the stick.

## 3. Needs — what the mission asks of each club's archive
For each fact the mission prints or depends on, add a `Need`:
- `of: {anchor: [kinds]}` (match, home, away, derby, final, europe, title, relegation, promotion, ground, founding)
  or `of: {club: 'rival' | 'ground' | 'city'}`.
- `grade`: `critical` (no mission without it) · `enriching` (else neutral version) · `decor`.
- `day: true` when the night must be known to the day.
- `absentMeans: 'irrelevant'` only when its absence is the club's story (no approved rival → no derby raid).
- `why`: one plain line — it is printed on the research task.
Then `weight`: which kinds make this mission matter more for a club.

## 4. Text
`title`/`brief` may use `{club} {city} {rival} {ground} {date}`. `neutralTitle`/`neutralBrief` never use
`{date} {rival} {ground}`. `{date}` prints the archive row exactly as recorded (day, else year). English source.

## 5. Gate (run all, all green)
1. `npx vitest run tests/life-rush.test.ts` — contract, reader, Fitter, spec.
2. `npx vitest run tests/clubs/life-rush-fit.test.ts` — every core club: ≥3 playable, bound night = the club's own
   approved row, HELD carries a critical research task. Read the printed matrix: a new HELD is a research task to
   report, not a bug to hide.
3. `npm run typecheck`, `npm run lint`.
4. If a kind is mis-read on real data (a "final round" read as a final, a club named "Derby" read as a derby), fix the
   word list in `archive.ts` AND add the real wording as a case in `tests/life-rush.test.ts`.

## Never
- Never invent a date, score, opponent or ground to make a mission READY — a missing record is HELD with research.
- Never name a club, rival or ground in `lib/life/rush/*` (the purity test reads the source).
- Never let a mandatory mission dead-end: story mode after two failures, `slip` continues the chapter.
