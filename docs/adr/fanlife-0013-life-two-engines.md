# ADR-fanlife-0013: LIFE runs on two engines — TOWN lives the day, RUSH plays the mission

## Status
Accepted (owner, 21.10.2026). Plan: Docs "LIFE · שני מנועים — TOWN × RUSH". This ADR is phase M0.

## Context
LIFE's day is a Sims-like voxel diorama (`public/life/voxel`, three r128 global, FOV 20). The owner wants missions to
switch into a GTA / DOOM register — close camera, speed, a clock — and wants every mission to fit every club through
that club's own archive, with no pilot club. The universal engine already has the seam: an effect `play` becomes a
`Directive` the shell runs (`MiniGame`), and the result comes back through `afterPlay` as `good | ok | slip`.

## Decision
1. **Two engines, one save.** TOWN is unchanged and frozen while a mission runs. RUSH is a new module
   (`lib/life/rush/`, renderer later in `lib/life/rush/render/` on three 0.169 as a module, reusing
   `lib/life/football/render`). RUSH never writes the save, never reads a chapter, never names a club.
2. **The contract is data** (`lib/life/rush/spec.ts`): LIFE sends a `MissionSpec` (verb, camera, route, seed, skin,
   age, clock, hazards, difficulty, mandatory, the archive night or none, title, brief); RUSH returns a
   `MissionResult` (`good | ok | slip`, clock left, ≤3 evidence flags, assisted, skipped). M1 wires it as
   `game: 'mission'` through the existing `play` directive.
3. **Five verbs, two cameras.** run · drive · sneak · carry · find; `chase` (behind the back, GTA) by default,
   `eyes` (first person, DOOM) for sneaking and finding.
4. **Violence (owner):** the main route harms nobody — the danger is the clock, traffic, police, crowd, height,
   weather, stewards. The **ultras route only** allows very light violence: a thrown object, a shove, a rival
   group's gear "stolen". No blood, no weapon, no injury on screen; rival ultras groups are invented and obey the
   club's rival-colour bans. `templateProblems` refuses `strike | shove | steal` on a main-route template.
5. **Mandatory or optional is the script's call (owner).** A mandatory mission cannot be skipped, but after
   `ASSIST_AFTER_FAILS` (2) failures story mode carries the player and a fail plays the chapter's `slip` — never a
   dead end. A skip is always `ok`.
6. **No pilot (owner): every mission is a template fitted to every club** (`lib/life/rush/fit.ts`). A template
   declares what it needs from the archive (`needs`: anchor kinds or club facts, graded critical / enriching /
   decor, optionally to the day). The Fitter answers per club × mission:
   READY (bound to one approved night, printed as recorded) · NEUTRAL (plays with no date and no name) ·
   HELD (a critical record is missing → research task with where to look) · IRRELEVANT (its absence is the
   club's story, e.g. no approved rival → no ultras derby). Pure, deterministic, ordered by the club's own story
   (`weight` × how many such nights the archive holds).
7. **The archive is read, never guessed** (`lib/life/rush/archive.ts`). The club side (`lib/clubs/life/rush.ts`)
   builds the view from `lifeAnchors` (the same approved rows a universal life stands on), the approved rival
   (with the spellings in `lib/clubs/spellings.ts`, shared with the Question Forge), and the recorded home ground or
   the sourced `world.json` ground. Kinds come from the row's own words; a side is read only from a scoreline
   written home side first, never from prose.
8. **Graphics upgrade is part of the plan, not RUSH-only:** G1 light, G2 materials and street kit, G3 characters —
   each lands in TOWN too.

## Consequences
+ A mission is written once and plays for every open club; a missing record becomes a named research task.
+ The save model, the chapters and TOWN are untouched by M0.
− Two three.js copies on one page once RUSH renders (r128 global + 0.169 module): RUSH loads lazily and TOWN is
  released on weak phones; moving TOWN to 0.169 is a separate task.
− Kinds are read with word lists per language; a language the list misses yields fewer nights (fail-safe: HELD or
  NEUTRAL, never a wrong date).

## Measured at M0 (8 core clubs, `tests/clubs/life-rush-fit.test.ts`)
Every club has ≥3 playable missions; every bound night equals the club's approved row; HELD always carries a
critical research task. Typical gaps: relegation and ground-opening nights; Hapoel Tel Aviv has no dated title row
in the LIFE anchors; AEK Athens and St. Pauli have no dated final.
