#!/usr/bin/env python3
"""
הפתיח — the opening sequence's four paintings and two clips, ingested.

  WORKER_OPEN=<folder> python3 scripts/life/ingest-opening.py

The opening is the one part of this game that is not a scene: four painted moments and two
short pieces of animation that play before the child is ever controllable. It therefore
lands in `public/life/opening/` rather than in the art manifest, and it is the only place
in the repository that holds VIDEO.

**Video is where rule 8 nearly slipped through.** The clips arrived as 24MB GIFs graded
warm — golden hour, sepia walls, dust in the light — and measured 3.6% and 8.9% yellow by
this project's own scanner. Nothing in the pipeline would ever have looked: `count_yellow`
runs on PNGs in `public/life/art`, and an mp4 is neither. So the same treatment runs here,
frame by frame, before the clips are encoded — and it is the SATURATION-capping variant
rather than the hue rotation, for the same reason the September backdrops use it. These are
places and afternoons, not shirts. Rotating a wall of Jaffa stone off the yellow band would
make the opening of this game the colour of a plant pot.

It is implemented in numpy because it is 96 frames of 960×640: the per-pixel loop in
`build-art.py` is the same arithmetic and would take about a minute per clip.

Encoding: H.264, and only H.264. 24MB of GIF becomes about 300KB of mp4, which is the
difference between an opening sequence and a reason to close the tab on a phone. A VP9
encode of the same frames was tried and came out three times larger — eight frames a
second of a slow pan is close to the worst case for its motion model — so there is one
file per clip and every browser this game runs in plays it.
"""
import os
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'public/life/opening')
SRC = os.environ.get('WORKER_OPEN', os.path.join(ROOT, 'brand/source/life-opening'))

# The same three numbers `build-art.py` uses, and they must stay the same three.
HUE_MIN, HUE_MAX = 33.5, 80.0
SAT_MIN, VAL_MIN = 0.18, 0.18
SAFE_SAT, SAFE_RAMP = 0.26, 0.09

# A still is a full-bleed background on a phone held either way; 1400 is plenty and keeps
# each frame near 300KB as a palette PNG.
MAX_STILL_W = 1400

# Three of the four paintings. `window.png` is in the source folder and is NOT ingested:
# it is the same room, the same boy and the same scarf as the first frame of `clip-memory`,
# and the clip's own poster is that frame. Two renders of one moment is 460KB of an opening
# sequence spent twice.
STILLS = [
    ('born', 'born.png'),
    ('shoulders', 'shoulders.png'),
    ('drawing', 'drawing.png'),
]

CLIPS = [
    ('clip-family', 'clip-family.gif'),
    ('clip-memory', 'clip-memory.gif'),
]


def deyellow(arr):
    """
    The saturation cap, vectorised, on an H×W×3 uint8 array.

    Identical in effect to `build-art.safe_sat` applied through `deyellow_place`: inside
    the treated hue band, saturation above `SAFE_SAT` is pulled down along a ramp whose
    maximum output is `SAFE_SAT + SAFE_RAMP / 4` = 0.2825 — three units of an 8-bit channel
    clear of the 0.30 the scanner reports at. Hue and value are untouched, so a wall the
    painter lit at four in the afternoon is still lit at four in the afternoon.
    """
    rgb = arr.astype(np.float32) / 255.0
    mx = rgb.max(axis=2)
    mn = rgb.min(axis=2)
    delta = mx - mn
    with np.errstate(divide='ignore', invalid='ignore'):
        sat = np.where(mx > 0, delta / np.maximum(mx, 1e-6), 0.0)

    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    hue = np.zeros_like(mx)
    safe = delta > 1e-6
    hue = np.where(safe & (mx == r), 60.0 * (((g - b) / np.maximum(delta, 1e-6)) % 6.0), hue)
    hue = np.where(safe & (mx == g), 60.0 * ((b - r) / np.maximum(delta, 1e-6) + 2.0), hue)
    hue = np.where(safe & (mx == b), 60.0 * ((r - g) / np.maximum(delta, 1e-6) + 4.0), hue)

    touched = (sat > SAFE_SAT) & (mx >= VAL_MIN) & (hue >= HUE_MIN) & (hue <= HUE_MAX)
    excess = np.clip((sat - SAFE_SAT) / SAFE_RAMP, 0.0, 1.0)
    target = sat + (SAFE_SAT - sat) * excess

    # s = delta / mx, and value is mx, so a new saturation is a new minimum channel.
    scale = np.where(sat > 1e-6, target / np.maximum(sat, 1e-6), 1.0)
    scale = np.where(touched, scale, 1.0)[..., None]
    out = mx[..., None] - (mx[..., None] - rgb) * scale
    return np.clip(out * 255.0 + 0.5, 0, 255).astype(np.uint8)


def count_yellow(arr):
    """The scanner, on an array. Hue 34–74, S ≥ 0.30, V ≥ 0.30 — `build-art.SCAN_*`."""
    rgb = arr.astype(np.float32) / 255.0
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    delta = mx - mn
    sat = np.where(mx > 0, delta / np.maximum(mx, 1e-6), 0.0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    hue = np.zeros_like(mx)
    safe = delta > 1e-6
    hue = np.where(safe & (mx == r), 60.0 * (((g - b) / np.maximum(delta, 1e-6)) % 6.0), hue)
    hue = np.where(safe & (mx == g), 60.0 * ((b - r) / np.maximum(delta, 1e-6) + 2.0), hue)
    hue = np.where(safe & (mx == b), 60.0 * ((r - g) / np.maximum(delta, 1e-6) + 4.0), hue)
    return int(((sat >= 0.30) & (mx >= 0.30) & (hue >= 34.0) & (hue <= 74.0)).sum())


def clean_palette(flat):
    """
    De-yellow the PALETTE, not the pixels — the same trick `ingest-2026-09.py` uses.

    Quantising averages neighbouring colours, so a table built from a clean image can still
    contain an entry inside the band. On these four paintings it was not a rounding error
    either: `shoulders` went in at zero yellow pixels and came out of the octree with 4,568
    of them, because the entry the quantiser chose for a whole region of stadium light sat
    two units the wrong side of the line. A 256-entry table run through the same cap turns
    "no yellow in this file" from a sample into the property.
    """
    table = flat.getpalette()
    if not table:
        return flat
    entries = np.array(table, dtype=np.uint8).reshape(-1, 1, 3)
    flat.putpalette(deyellow(entries).reshape(-1).tolist())
    return flat


def run(cmd):
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stderr.strip()[:800])
        raise SystemExit(f'ffmpeg failed: {" ".join(cmd[:6])}…')


def do_still(key, name):
    path = os.path.join(SRC, name)
    if not os.path.exists(path):
        print(f'-- missing {name}')
        return
    im = Image.open(path).convert('RGB')
    if im.width > MAX_STILL_W:
        im = im.resize((MAX_STILL_W, round(MAX_STILL_W * im.height / im.width)), Image.LANCZOS)
    arr = deyellow(np.asarray(im))
    left = count_yellow(arr)
    out = clean_palette(Image.fromarray(arr).quantize(colors=200, method=Image.FASTOCTREE))
    dest = os.path.join(OUT, f'{key}.png')
    out.save(dest, optimize=True)
    after = count_yellow(np.asarray(Image.open(dest).convert('RGB')))
    print(f'{key:14s} {out.width:5d}x{out.height:<5d} {os.path.getsize(dest)/1024:7.1f}KB  yellow {left} → {after}')


def do_clip(key, name):
    path = os.path.join(SRC, name)
    if not os.path.exists(path):
        print(f'-- missing {name}')
        return
    src = Image.open(path)
    frames = getattr(src, 'n_frames', 1)
    delay = src.info.get('duration', 120)
    worst = 0
    with tempfile.TemporaryDirectory() as tmp:
        for i in range(frames):
            src.seek(i)
            frame = src.convert('RGB')
            if frame.width != 960:
                frame = frame.resize((960, round(960 * frame.height / frame.width)), Image.LANCZOS)
            arr = deyellow(np.asarray(frame))
            worst = max(worst, count_yellow(arr))
            Image.fromarray(arr).save(os.path.join(tmp, f'{i:04d}.png'))
        fps = max(1, round(1000 / max(1, delay)))
        pattern = os.path.join(tmp, '%04d.png')
        # H.264 only, and that is a decision rather than an omission. A VP9 encode of the
        # same frames came out THREE TIMES LARGER than the H.264 one at matched quality —
        # eight frames a second of a slow pan is close to the worst case for VP9's
        # motion model — and every browser this game runs in plays H.264 in a <video>.
        # A second codec that is bigger and buys nothing is a second file to keep in sync.
        mp4 = os.path.join(OUT, f'{key}.mp4')
        run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(fps), '-i', pattern,
             '-c:v', 'libx264', '-profile:v', 'main', '-pix_fmt', 'yuv420p',
             '-crf', '28', '-preset', 'slow', '-movflags', '+faststart', '-an', mp4])
        # The poster: the clip's own first frame, already de-yellowed, written as a palette
        # PNG. Without one a <video> shows a black rectangle for as long as the network
        # takes, and the crossfade INTO a clip lands on nothing — which on a slow phone is
        # the whole opening flashing black between beats.
        poster = clean_palette(
            Image.open(os.path.join(tmp, '0000.png')).convert('RGB').quantize(
                colors=200, method=Image.FASTOCTREE
            )
        )
        poster.save(os.path.join(OUT, f'{key}-poster.png'), optimize=True)
    poster_bytes = os.path.getsize(os.path.join(OUT, f'{key}-poster.png'))
    print(f'{key:14s} {frames} frames @ {fps}fps  mp4 {os.path.getsize(mp4)/1024:6.1f}KB  '
          f'poster {poster_bytes/1024:5.1f}KB  worst frame yellow {worst}')


def main():
    os.makedirs(OUT, exist_ok=True)
    only = sys.argv[1] if len(sys.argv) > 1 else ''
    if only in ('', 'stills'):
        print('--- stills ---')
        for key, name in STILLS:
            do_still(key, name)
    if only in ('', 'clips'):
        print('--- clips ---')
        for key, name in CLIPS:
            do_clip(key, name)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
