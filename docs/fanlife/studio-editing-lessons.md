# Football Stories — editing lessons (the log the `football-stories-film-editor` skill reads and keeps)

Every round on the studio's editing adds one entry: what the owner said, what was measured, what changed, what the
numbers became. Newest first. The skill reads this before touching the editor and appends to it after every render.

## Targets (the numbers a film must meet, measured by `qa.experience_numbers` on the rendered picture)

| measure | target | why |
|---|---|---|
| flashes (luma up and back inside 6 frames) | 0 | owner 17.11.2026: "everything flickers" |
| worst jerk | ≤ 130 px | rule 142, VOX's camera guard |
| changes a minute | 10–22 | film, not slideshow and not strobe (was 40 on the failed sample) |
| longest shot | ≤ 12.5 s, moving | `editor.LONG_HOLD` |
| documentary share | ≤ 60% | graphic layer on most sentences |
| story thread | on every chapter with ≥ 3 knots | owner: "connecting lines, storytelling" |
| jump cut to a closer framing of the same picture | never (cold open excepted) | it read as flicker |

## 2026-11-17 · "everything flickers — more movement, more film, graphic connections, connecting lines, storytelling"

- **Owner**: the VOX-pass sample (HTA 2009/10) is a failure: flickering, bad work.
- **Measured**: 176 s, 116 changes (39.9 a minute), 17 flashes, worst jerk 408 px, a still of 18 s (end card).
- **Causes**: cuts every 2.6 s to a closer framing of the SAME picture (jump cuts); 0.3 s whips/slides/zooms between
  sentences; type and objects popping in bright over dark pictures (0.2–0.32 s); the camera's `snap`.
- **Changed (film mode)**: TARGET 2.6→5 s, MIN_SUB 1.4→2.4, MAX_STILL 4→7, LONG_HOLD 12; no jump cut (the cut goes to
  another relevant picture, else the shot runs on under one move); soft transitions only — dissolve 0.8 s, push
  0.85 s, ink 0.8 s; kinetic words 0.45 s with a 0.7 s veil and a 0.5 s exit; objects enter over 0.8–1.0 s with their
  opacity eased; `snap` never chosen; segments 4–8 s.
- **Added**: the story thread (a hand-drawn line along the top of each chapter with a knot and a key word per
  sentence); a pen line from every object's word to the object, and an arc between two objects.
- **Measured after** (same script, same voice, re-rendered): 51 changes (17.7 a minute, was 39.9), 4 flashes (was 17:
  the turning tint, a score board, the record card), worst jerk 33.5 px (was 408), longest shot 18 s (the end card).
- **Next**: the last 4 flashes (tint/board/record entrances); the 12 s follow card and 18 s end card; the thread larger
  (done: 8 px line, 34 px words) — check on the phone; more accents on a beat's first sentence (mix fell back to 71%
  documentary when segments grew).

## 2026-11-17 · VOX pass (merged #572)

- Segments per sentence, relevant pictures by caption, objects library, club scenes. Mix 48/25/27 — but the cut rate
  doubled and it flickered (see the entry above). Lesson: more graphic ideas must not mean more cuts.
