# The studio's editing language: five rules every film is cut by (owner, 14.11.2026)

Owner, 14.11.2026, on the editing lessons taken from the Vox reference (`claude/edit-reference-vox-2026-11-13.md`):
*"These are also editing rules that must be in the studio."* They bind every Football Stories film (DOCU, Shorts,
FANLIFE KIDS, CLASSIFIED), with `model-film` (the order and the package) and `no-sliced-parallax` (how a still moves).

1. **One world, four inks.** Every library picture is redrawn the same way: a black-and-white halftone cut-out on a flat
   house colour (cream `#f4ecd8`, red `#d71920`, green `#1f8a4c`, ink `#15130f`), with the club's colour as the one
   accent and no rival colour. One picture gives several different cut-outs, which is what stops a film looking
   repetitive. The owner's own paper-cut scenes stay in full colour as the hero pictures.
2. **The cold open**: 4–6 fast close cut-outs of the story's own objects in about 12 s, then the film's question as a
   full-screen type card before 0:15.
3. **Numbers are objects.** A score is a scoreboard held in two hands, a year is a flip board, a statistic is built word
   by word in time with the voice. One statistic per card.
4. **One shape per film**, taken from the story (a dossier tab, a scarf stripe, a shamrock leaf), used as the window a
   picture sits in, the wipe between shots and the frame of the cards.
5. **Never more than 20 s in one visual language** (collage/scene → explainer → type → scene). The editor enforces it,
   not the script.

## How each rule is held today

| Rule | Where | State (14.11.2026) |
|---|---|---|
| 1 Inks | `studio/paper.inked`, applied by `docu/plan.ink` to every picture the media index gives a documentary | **in the pipeline** (14.11.2026) |
| 2 Cold open + question card | `docu/editor.COLD_OPEN_S` (first 12 s: a different picture on every look), `docu/plan.question_cards` (the narration's planted question set in type when asked, before 0:15, and again as the bookend before the hand-over); `qa.experience` "the stake" | **in the pipeline** (14.11.2026) |
| 3 Numbers as objects | `build.Film` `mini` (score flips on the cut), `form`, `explain number` | the held scoreboard and the flip board are not built yet |
| 4 One shape | — | not built (gap #19) |
| 5 20 s per language | `studio/qa.experience` and `studio/docu/model.gate` check **language run** (24 s with 4 s tolerance) | **enforced** in the pipeline: a run over it is re-planned tighter, then fails the gate |

A rule marked "not built" is still the rule: a film cut by hand follows it, and the automatic pipeline gets it next.
