# 62 · CLASSIFIED — the living-comic composer

CLASSIFIED is the third series on **FanLife: Football Stories**: the strange true stories behind football, told by
our narrator over a living comic. The owner draws the panels (art brief: `docs/fanlife/60-classified-art-brief.md` on
the `claude/comic-art` branch) and uploads them to Drive. The composer does the rest: depth, motion, camera,
effects, lettering, edit.

Code: `scripts/football-stories/comic/` (Python: numpy, Pillow, OpenCV, ffmpeg; free only, no paid API).

## The owner's material is used as supplied

Owner decision, 4.11.2026: when the owner puts files in a folder for a specific match, case, club or documentary,
they are approved material and are used **exactly as they are**. That includes press photographs and real faces.
The composer never blurs, crops to anonymise, rejects or "cleans" them. The layers re-composite to the original
picture (`layers.recompose`, tested); the grade is a light tint, and `"grade": 0` in an episode turns it off.

The rules "no real faces, no blood" apply only to what the composer **draws in code**: overlays, stamps, lettering.
The effects contain no people and no blood. Pain is a comic effect (SMASH!, impact stars).

The owner's pictures and the renders **never enter the repository**. `drive_fetch.py` and `compose.py` refuse a
destination inside it, `.github/workflows/classified-demo.yml` works only in the runner's temp folder, and
`comic/tests` fails if a manifest file name or Drive id ever appears among the tracked files.

## How a FILE is built

1. **Panel map**: `comic/classified_manifest.json` lists every panel: Drive id, the name as uploaded, a local
   file name, its role in the brief (P01…, CH1…, S02…) and its kind (`panel`, `sheet`, `photo`, `cutout`).
   Where it is not clear which brief role a picture fills, `brief_match` says so. The composer does not guess.
2. **Download**: `drive_fetch.py --file file01 --out <temp>` uses Drive's public link. A file that comes back
   as a web page or does not decode as a picture is reported and skipped.
3. **Depth and layers** (`depth.py`, `layers.py`):
   - **Depth map**: Depth Anything V2 Small (ONNX, Apache-2.0), downloaded and cached on the runner. If the
     model is missing or fails, a fallback runs instead: spectral-residual saliency, then GrabCut. The pipeline
     never stops, and the report says which path each picture took.
   - **Layers**: three of them (background, subject, foreground), cut where the depth crosses the picture's
     own edges.
   - **Mattes**: soft, a few pixels wide, snapped to the picture's edges with a guided filter.
   - **Edges**: the edge colours are separated with the matting equation, so a layer that moves carries no fringe.
   - **Holes**: what a nearer layer covers is filled behind it (TELEA inpaint, softened).
   - **Cache**: per picture by sha256 (`~/.cache/fanlife-classified/layers`).
   - **Parallax**: when the depth is only the fallback's estimate, the layers separate less.
4. **Episode** (`comic/episodes/<file>.json`) is a list of beats. Each beat has:
   - `panel`: the manifest id, or a pack asset id.
   - `dur`: seconds. Or `voice`: a key into a timing file (`--timing`, `{key: [start, end]}`), so a cut lands
     on the narrator's line.
   - `move`: `push` · `pull` · `pan_l/r/up/down` · `dolly_l/r` (strong parallax) · `slowmo` · `hold` · `static`.
     Also optional `focus` ([x, y], or `"subject"` for the depth map's subject), `amount` and `ease`.
   - `transition` into the beat: `cut` · `whip` (motion blur and streaks) · `smash` (white flash and a punch-in)
     · `slide` (the next panel slides in, inked) · `turn` (page turn) · `fade`.
   - `fx[]`, each with an optional `from`/`to` window:
     - **Overlays**: `smoke` · `shards` · `droplets` · `glint` · `rain` · `flare`/`godrays` · `embers` ·
       `speedlines` · `stars` · `flash`.
     - **Lettering**: `stamp` (CLASSIFIED, slammed onto the paper, ink bleeding) · `caption` (a typewriter case
       file) · `smash` (a SMASH!/CRACK! shout) · `title` (FILE 01 · THE BOTTLE) · `tab` (the tone tab).
     - **Pack**: `cutout` (a transparent PNG composited as a foreground layer).
   - `speed`: the effects' time scale (0.25 = slow motion). `shake`: handheld amount (WAR beats shake gently by
     default).
5. **Look** on every frame:
   - **Line boil**: only the ink lines move, 1–2 px, three drawings cycled on twos.
   - **Halftone shimmer**, **paper grain** and a **vignette**.
   - **Grade**: the tone's accent (LAUGH cyan · WAR vermilion · HEART navy).
   - **Photographs** keep the grain and grade, but get no boil and no halftone.
   - **Type**: lettering uses The Weekly's own faces (Knewave shouts, Archivo caps and heads, Ultra numbers,
     Courier Prime typewriter).
6. **Render**: `compose.py --episode … --panels <dir> --out <mp4>` writes H.264 1080p25. Other options:
   - `--vertical`: 9:16 for Shorts, reframed on the subject.
   - `--audio`: lays a voice or mix under the picture.
   - `--stills t1,t2`: writes PNG frames instead of a video.
   - `--report`: writes the depth path per picture and the missing panels.
   - **Speed**: frames render in parallel, one process per CPU.
   - **A panel the owner has not supplied** is reported, and an ink slate saying so stands in its place
     (`--missing slate`, the default). `skip` and `fail` are the other choices. A picture is never invented.

## Plain photographs and packs work the same way

`--pack <folder>` reads any folder:

| Folder | What it holds | How the composer uses it |
|---|---|---|
| `01_Scenes/` | Comic panels or press photographs | Full-frame scenes, moved with camera moves and depth parallax |
| `02_Editing_Assets/` | Transparent PNG cut-outs | Composited over a scene with `{"type": "cutout", "asset": "<id>", "at": [x, y], "height": .7, "depth": 1}` |
| `03_Source_References/` | Reference pictures | Listed, kept out of the edit |
| `credits.json` | `{"<file>": "credit", "*": "pack credit"}` | Each picture's credit, carried in its asset record |

A flat folder of pictures also works: every picture in it is a scene.

## How the owner adds new panels

1. Upload the new pictures to the CLASSIFIED Drive folder (shared "anyone with the link"), named as in the brief.
2. Write "uploaded" in the chat. Claude adds their Drive ids to `classified_manifest.json` and writes or extends
   the episode's beats.

## Run the demo (clicks only)

1. Open **GitHub → Actions → "CLASSIFIED · demo"**.
2. Click **Run workflow**. "Also render the 9:16 cut" is on by default.
3. Wait about 10 minutes. The runner downloads the FILE 01 panels, renders the cold open (13.6 s), and sends the
   video to your Telegram chat, the same chat the Football Stories Reel goes to.
4. The run's page also holds the video for one day, under **Artifacts**.

The demo, beat by beat:

| Panel | Motion and effects |
|---|---|
| Dossier desk | CLASSIFIED stamp slams in, typewriter case file: Montecastillo, Jerez · Friday 17 May 2002 |
| P08 reach | Push-in, glint on the bottle |
| P01 slip | Slow motion with droplets |
| P10 fall | Whip-pan, SMASH! with glass shards and impact stars |
| P20 empty shelf | Quiet hold, then the title card FILE 01 · THE BOTTLE |

## What the owner's FILE 01 / FILE 02 drops do not include yet

| FILE | Not supplied yet | Close, to be confirmed |
|---|---|---|
| FILE 01 | P03 camp · P06 final bench · P09 foot catch · P11 shards · P18 pile-on · V1 · V2 | Decided by the owner (4.11.2026): P05 = standing in the floodlights, P15 = entering the stadium; CH2 = the green jersey (Casillas), CH1 = the red training top — measured on each run (`roles.py`) · P14 is an armchair before a TV, where the brief has a phone |
| FILE 02 | P03 stadium at dusk · P04 away end · P05 seats torn · P06 fence breaks · P08 tear gas · P16 TV summer · V1 | "Footballer facing police in smoke" could be P07 or an alternate P11 |
| Series kit | S01 style anchor (not needed by the composer) | Decided by the owner: S04 WAR = the red/vermilion background, S05 HEART = the navy one — measured on each run (`roles.py`) |

`manifest.missing_roles()` computes this list, and `drive_fetch.py` prints it on every run.

## The full episode

`produce.py` turns an approved script into the finished FILE: voice, clock, picture, mix, captions, QA, Shorts, the
YouTube package and the Telegram draft. See `docs/fanlife/65-classified-production.md`.
