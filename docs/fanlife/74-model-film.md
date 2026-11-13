# 74 · The model film: one assembly recipe for every Football Stories film (owner, 13.11.2026)

Owner, with an example script and eighteen of his pictures (AEK 0–1 Panathinaikos, 7.11.1994): *"Take it, improve,
analyse, build it, in all our styles, all the effects — and take it as the assembly model for all our films
automatically. A full package: the opening, a smart ending, the HOOK, REELS, SHORTS, an automatic marketing package."*
The same day he sent a Vox film as an editing reference; what was taken from it is in the recipe (fast cold open, the
question as a card before 0:15, one world of few inks, numbers as objects, the bookend, a constant corner mark).

## What the model is

`studio/docu/films/pao_aek_1994.py` — "The Ninja of Nea Filadelfeia". A hand-written storyboard that is **cut by the
studio's own editor** (`"edit": true` → `studio/docu/build.edited`): the writer gives each beat its `meta` (type,
chapter, emotion, intensity) and the editor, the camera, the language mix and the gate do for it what they do for a
pipeline film. Before this a hand-written film was drawn exactly as typed and could not be measured.

The order every film follows:

**ident (≤ 3 s) → hook (one close picture a sentence, ~12 s) → the question as a full-screen card (before 0:15) →
title sting → chapters that each end on a turn → the mini-drama (clock, held breath, release) → the wait (a clock
through the passage) → payoff in explainers → bookend (the opening card, answered in type) → one or two sourced
last pages → hand-over to the next film and one subscribe ask → end card.**

The full recipe — durations, which device serves which beat, camera by emotion, the package's specs and the gap list
against today's automatic pipeline (30 rows, file:function each) — is `MODEL.md` in the film's package; its tables are
the brief for the next engineering round.

## What this added to the engine (all reusable, all tested)

| Piece | Where |
|---|---|
| A hand storyboard cut by the editor, with the language mix and `docu-shots.json` for the gate | `docu/build.edited` (`"edit": true`) |
| Names through the studio lexicon for hand films (AEK as the owner decided, Greek names as a commentator says them) | `docu/build.speak(names=…)`, storyboard `pronounce` |
| The free kick crossed and headed in, drawn | `build.Film.chalk` `play: 'cross'` |
| A schematic of a ground in its city, labelled as not to scale | `build.Film.locator` |
| A league table with points, a second marked row, a larger short table | `build.Film.table` rows `[name, points]`, `mark`, `zoom` |
| The drawn ident and the constant corner mark | `build.Film.ident`, storyboard `mark` |
| A print that stays on the desk for the whole line | `cutout` `stay` (`docu/editor.cut`) |
| The gate, a contact sheet and measured thumbnails for a hand film | `docu/model.py` |
| Shorts and Reels drawn FOR 9:16, re-framed on a named focus, from the film's own takes | `docu/vertical.py` |

Two faults found and fixed on the way, both of which the pipeline's films could hit: a `form` whose bracket covers
every tile wrote an empty selector, GSAP threw, and **every tween after it was lost** (cards stayed invisible); and a
table's lit row used the class `.hl`, which is the explainer's highlighter (absolute), so it sat on top of its
neighbours.

## Rules that came out of it

- **The owner's pack is not in git.** His pictures arrive in a folder; `--pack` renames them into the names the
  storyboard uses (`PACK`) and picks the neutral pieces through the media index (`LIB`), which records each use.
- **A club with no art of its own** uses the owner's pack for its identity and the common library for everything
  else; a library picture is redrawn in the film's inks with only the club's colour kept, so no rival colour arrives
  by accident and mixed sources read as one film.
- **No line-up board without a sourced line-up, no quote without a source.** The model shows a plain GOAL card where
  the brief asked for a radio call.
- **A vertical cut speaks only the film's own takes**, names a focus for every picture, and a Short stops before the
  answer.

Held by `studio/tests/test_model_film.py`.
