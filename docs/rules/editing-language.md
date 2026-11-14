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
| 3 Numbers as objects | `build.Film.flap` (split-flap board, each character turns on the word), `docu/plan.year_flaps` (the first year the narration says in a chapter turns from the last one; one a chapter, four a film); `mini` (score flips on the cut), `form`, `explain number` | flip board and held scoreboard (`docu/plan.score_board`: one board a match chapter, in the corner, turning on each goal the record orders) **in the pipeline** (14.11.2026) |
| 4 One shape | `build.SHAPES`, `build.CLUB_SHAPES` (Panathinaikos and Celtic shamrock, Hapoel star, Olympiacos ball, else ticket), set by `docu/plan` on the storyboard; the chapter `dive` opens the next chapter inside the shape over the old shot, and boards on the old shot fade under it | wipe, window (`docu/plan.chapter_windows`: each chapter card shows the chapter's first picture through the shape) and frame (the end card inside the shape's outline) **in the pipeline** (14.11.2026) |
| 5 20 s per language | `studio/qa.experience` and `studio/docu/model.gate` check **language run** (24 s with 4 s tolerance) | **enforced** in the pipeline: a run over it is re-planned tighter, then fails the gate |

A rule marked "not built" is still the rule: a film cut by hand follows it, and the automatic pipeline gets it next.

**Interest (owner, 14.11.2026: "objects, interest and editing").** The story's turns are seen as well as heard:
`docu/plan.turn_cards` sets a short reversal the narration says ("But…", "Until…", "Then…", "Nobody…", 3–8 words) in
type on the word, in the film's ink, two a film at most, 45 s apart, never in the cold open or over a goal, a card or
the hand-over. Only the narration's own words.
