# 65 · CLASSIFIED — producing a whole FILE

The composer (doc 62) draws a living comic from a list of beats. `scripts/football-stories/comic/produce.py` makes a
whole episode from an approved script: narration, clock, picture, mix, captions, QA, Shorts, the YouTube package and a
DRAFT to the owner's Telegram. Nothing is uploaded to YouTube and nothing is published: that is the owner's click.

## What the owner clicks (no terminal)

1. Read the script (`docs/fanlife/classified/file01-the-bottle.script.md`) and approve it in the chat.
2. **GitHub → Actions → "CLASSIFIED · produce an episode" → Run workflow.**
3. Pick the FILE (`file01`), tick **"I have read and approve this FILE's script"**, keep "Send the DRAFT to my
   Telegram chat" on, press **Run workflow**. Without the tick the run stops at once and makes nothing.
4. When the run finishes (not yet timed on a full FILE; the job allows 2½ hours) Telegram holds: the preview (960 px, under 50 MB), the three Shorts, the three thumbnails, and
   `telegram-draft.txt` (title, description, tags, QA, and the upload steps), `youtube.json`, `captions.en.srt`.
5. The run's page keeps every master for 3 days under **Artifacts** (`classified-file01`): `master.mp4` (1080p),
   `short-1..3.mp4`, `thumbnail-1..3.jpg`, `captions.en.srt/.vtt`, `youtube.json`, `description.txt`, `qa.json`,
   `report.json`, the contact sheet.
6. To publish, in YouTube Studio: Create → Upload video → `master.mp4` → title, description and tags from
   `youtube.json` → Subtitles → `captions.en.srt` → a thumbnail → Private or Scheduled. Shorts the same way.

## What the run does

| Stage | What | Where |
|---|---|---|
| Check | Every panel is in the FILE's map, every word an effect waits for is in its line, every source is listed, ≥3 chapters, the title is "The [object] That [consequence]" | `produce.validate` (`--check` alone) |
| Roles | `@CH1` / `@CH2` / S04 / S05 decided by measuring the pictures' saturated hue (owner: green = Casillas = CH2; WAR = the red background, HEART = the navy one). An unclear measurement is reported as UNDECIDED and the listed order is used | `roles.py`, manifest `role_rules`, `report.json → roles` |
| Follow line | Rule 136 through the studio's `with_cta`: once, at the end of CHAPTER 2 (the cold open belongs with chapter 1), on the supporters' card with our own SUBSCRIBE button pressed on the word "subscribe" and turning to SUBSCRIBED. The close ends "…subscribe, and the next one will find you." | `produce.with_follow`, `card_follow` |
| Narrator | The owner's **Take B**: Kokoro bm_george, the pronunciation lexicon, misaki, human timing and breaths; the narrator chain in the mix. Cached per line | `produce.narrator`, `studio/voice.py`, `studio/kit/pronounce/lexicon.json` |
| Clock | A beat lasts lead + its line + a breath (0.5 s); a line spread over two panels (`cont`) shares its time by `share`; `t0: "word"` lands on the word named in `smash_at_word` (SMASH! on "away"); `freeze: "word"` stops the camera there | `produce.lay_out` |
| Picture | The VOX case board (below) on that clock, the narration captions burned in (studio captions). `CLASSIFIED_VOX=0` or `"engine": "classic"` in the episode keeps the living comic (`compose.py`) | `casefile.CaseFilm`, `.post` |
| Mix | The studio's `build_mix`: score by the tone tab (manifest `tones.*.music`: LAUGH `helland-clowns`, WAR `leberch-dark`, HEART `sub-clair-lofi-study`), effects levelled under the voice and thinned (`level_fx`/`thin_cues`), the owner's crowd recordings only at a save. A track that cannot be fetched falls back to the composed score, and the report says so | `studio/audio.py` |
| QA | Streams, length (±15 % of the episode's `minutes`), sync, loudness (−14 LUFS), dead air, black gaps, captions; a contact sheet | `studio/qa.py` |
| Shorts | Three 9:16 cuts of whole beats (≤ 59 s; beats are dropped from the end until it fits), with the hook and the call to the full film | `studio/shorts.py` |
| Package | `youtube.json` (title + candidates, description with the chapters of the actual cut and the sources, tags, private), `description.txt`, three thumbnails in the case-folder look | `release.py` |

## The case board — VOX is the leading edit (owner, 5.11.2026)

The owner watched FILE 01 as a living comic and wrote: *"there's a feeling of epilepsy, the pictures shake, they're not
clear. Take the VOX atmosphere there too. VOX is our leading edit."* `comic/casefile.py` now draws every FILE the way
the studio's VOX film is drawn (doc 66 §7), on VOX's own code (`studio/vox`: board, camera, elements; the `classified`
style in `vox/compose.STYLES`):

- **A board per chapter** — cork, closed manila folders and typed index cards (some lines blacked out), the case number
  stencilled faint. One camera glides across it: cosine-eased, a shallow pull-back, no overshoot, the arrival framing
  held until the glide has landed. A chapter change lifts off the board while it fades to cork and settles onto the next.
- **The owner's pictures are prints**: the whole picture (contained, never cropped, never treated), a white border,
  dropped onto the board and then still. Red string from the previous print's pin to this one's, drawn on as it lands.
- **Lettering**: the slug line (label + date/place) typed letter by letter; the pen circles the key detail where the
  script asked for a glint, droplets, shards or depth blur, and draws an arrow from the shout (SMASH!) that pops beside
  it; a source with a quoted headline lies on a torn clipping and the highlighter sweeps over the quote;
  VERSION A | VERSION B are kraft tabs over two prints side by side on one row; a score card pops and is underlined.
- **The stamp lands once per chapter**: the chapter's own stamp effect where the script has one (FILE 01 · CLOSED),
  otherwise CLASSIFIED on the chapter's folder. It presses in (a small settle, the ink bleeding) — no flash, no thump.
- **Never drawn on the board** (they flicker, flash or wobble): line boil, the depth re-warp of a picture, lamp flicker,
  flashbulbs, flash frames, hand-held shake, impact jitter, crash zooms, speed lines, particles, strobing grain.
  `report.json → dropped_fx` counts what the script asked for and the board left out. A fade to black dims smoothly and
  the light comes back over the next beat's first 0.9–2.4 s.
- **Measured** (`comic/tests/test_casefile.py`, stand-in panels): on a held beat the mean luma moves under 0.35 levels a
  frame and the picture under 0.6 px (phase correlation); a slow camera move steps the same every frame; the print keeps
  its detail against the picture shrunk to that size; the stamp count is one per chapter. FILE 01 with stand-in panels,
  every frame (8,445): mean |Δluma| 0.25, p99 3.6, max 8.3 (a glide between differently coloured prints) — the living comic reached 20 on
  the flicker, 20 on the flashbulbs and 100 on a flash frame.

Look at it without the narrator: `python3 scripts/football-stories/comic/casefile.py --episode … --panels <dir> --out
/tmp/stills --stills 3,12,40` (or `--clip 13-19 --out /tmp/clip.mp4`).

## Episode fields (beyond doc 62)

`id` · `say` (the narration, word for word from the script) · `camera` (the script's direction, kept beside the move
that renders it) · `mood` / `delivery` · `cont` + `share` · `smash_at_word`, `smash2_at_word`, `crowd_at_word` ·
`freeze` · `chapter` (YouTube chapter title) · `sources` (numbers into the episode's `sources`) · `fallback_for` (which
missing panel this beat stands in for). Package: `title_candidates`, `selected`, `hook`, `tags`, `thumbnails`
`[{panel, hook: [lines]}]`, `shorts` `[{from, to, hook}]`.

Draft-2 camera moves: `crane_down` · `crane_up` · `orbit` · `tilt3d` · `crash` · `follow` (plus doc 62's). Transition
`rewind` (the tape winding back). Effects: `flicker` (a lamp coming on) · `dof` (depth blur rising) · `flashbulbs` ·
`glow` (a TV's light) · `confetti` · `fade_black` (`to` < 1 dims) · `string` (the red case-board string) · and the
cards `chapter`, `version` (`side: l|r`), `score`, `sources`, `follow`, `end`.

## Paper puppets

The owner draws puppet sheets (doc 64 §1): one figure cut into pieces laid apart on white (or transparent), each with an
overlap tab at its joint. `rig.py` cuts the pieces (paper-white and its light shadow keyed away, edge colour un-mixed
from the white), pins them by a rig, and poses them.

A rig is `scripts/football-stories/comic/rigs/<name>.json` — coordinates only, never the art. Every point is a fraction
of the sheet (x of its width, y of its height), so the same rig survives a re-export at another size:

```json
{"name": "pup-keeper-n",
 "key": {"v": 0.86, "s": 0.12},
 "parts": {
   "torso":       {"pick": [0.16, 0.25], "pivot": [0.17, 0.36], "z": 0},
   "head":        {"pick": [0.35, 0.17], "pivot": [0.35, 0.22], "parent": "torso", "attach": [0.17, 0.14], "z": 2},
   "upper_arm_r": {"pick": [0.68, 0.19], "pivot": [0.68, 0.11], "parent": "torso", "attach": [0.22, 0.15], "z": 1},
   "forearm_r":   {"pick": [0.78, 0.18], "pivot": [0.78, 0.11], "parent": "upper_arm_r", "attach": [0.68, 0.26], "z": 1}
 }}
```

- `pick`: a point inside the piece. `pivot`: the piece's joint. `parent` + `attach`: the point on the parent where this
  joint is pinned. `z`: draw order (lower first). `rest`: an optional rest angle. Exactly one part has no parent (the
  root, normally the torso, pivoting at the hips).
- `python3 scripts/football-stories/comic/rig.py --sheet <sheet.png> --list` prints every piece found (centre and box as
  fractions), which is what a rig is written from; `--rig … --pose kick --stills <dir>` draws six frames of a pose.
- Part names for the built-in poses: `torso head upper_arm_l forearm_l upper_arm_r forearm_r thigh_l shin_l thigh_r
  shin_r`, plus `ball`, `scarf`.
- Poses (degrees, clockwise on screen positive, for a figure facing right; `flip` for one facing left): `kick` (striker
  winds the leg back, strikes, follows through), `dive` (keeper lays out along an arc, arms past his head), `scarf_raise`,
  `head_turn`. A pose is keys `{t: 0…1, a: {part: angle}, move: [dx, dy] in sheet heights, ease}`, eased between keys;
  a rig may add its own under `"poses"`.
- In a beat: `{"type": "puppet", "rig": "pup-keeper-n", "pose": "dive", "at": [0.4, 0.8], "height": 0.6, "t0": 0.5,
  "flip": false}`. The sheet is the panel asset of the same id (or `"sheet"`). A missing sheet or rig is reported in the
  run, never invented.

## Tests (no network, no owner art)

`comic/tests/test_produce.py`: FILE 01 validates against the manifest and matches draft 2 word for word; the follow line
lands after chapter 2 and the close ends on it; the clock follows the voice; effects land on their word; the role rules
decide green/red and red/navy and refuse an unclear measurement; a dummy four-beat episode goes through the whole path
(stand-in voice, dummy panels) and its QA, captions, Short, package, thumbnail and DRAFT note are checked; the workflow
runs only by hand and only when approved. `comic/tests/test_rig.py`: cutting, joints that hold in any pose, easing, the
built-in poses, drawing in a beat.
