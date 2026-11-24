# studio-press · The film opens on a front page, and a line with no picture is a collage

Owner, 23.11.2026, after two samples of the story-first engine: "still boring … the backgrounds are banal … there is no
visual hook that makes you want to stay. I, the creator, cannot watch more than 50 seconds." His brief: go to Flow and
make proper graphics; a newspaper front page, halftone cut-out figures, newsprint and paper textures; "Vox explainer
style — soft paper textures, bold outlines, minimal typography, and that characteristic handmade frame-rate look".

1. **The hook is a front page** (`studio/docu/press.py → front_page`, `build.Film.press`). The first beat of a film is a
   printed page on aged newsprint: a masthead, the narrator's own first sentence stamped line by line as the headline
   (`press.headline`: his words, in order, cut only at a word; the rest is the deck), a halftone photograph, a cut-out
   figure on a disc of the club's colour, and the sentence's number ringed by a marker. The camera pushes in the whole
   time. Nothing on the page is a fact the narrator did not say (studio-vox-pass, Designer.sourced).
2. **A line with no picture of its own is a collage, never a banal background** (`press.scene`, `press.direct`). An
   `illustration` beat is pasted from the press kit on newsprint: `duotone` (the terrace under the club's colour),
   `ground` (the ball, the pylon, a disc), `burst` (rays and a figure), `paste` (a taped photograph). The scene follows
   the beat's own art; never the same scene twice running; a beat under four seconds keeps its picture.
3. **Handmade frame rate.** Pasted pieces boil at eight frames a second (`press.boil`, stepped `tl.set`), headlines are
   stamped with `steps()`; the camera itself stays smooth. Rule 142 stands: nothing bounces or overshoots.
4. **The kit** is `studio/kit/press/` (README there): seven pieces made in the owner's Flow from his brief — fictional,
   anonymous, no real person, club, badge or lettering — so every club may use them. A cut-out stands for "a
   footballer", never for a named player: no name, card or caption is attached to one (studio-pictures §2).
5. **Colour**: paper, ink and the club's own colour, nothing else (rule 95; held by a test).
6. **Free tier**: the kit is in the repository; a film costs no Flow credit. New pieces are made by hand, one prompt at
   a time, never by the worker. HyperFrames' paid style templates are not used.
7. `STORIES_PRESS=0` turns it off (Actions variable; the studio desk lists it under The engine).

Held by `studio/tests/test_raconteur.py → ThePress`. The round's log: `docs/fanlife/studio-editing-lessons.md`.
