#!/usr/bin/env python3
"""
חיתוך מחדש של שמונת פריימי ההליכה של פוגי — the one figure in the folder that was never
trimmed to its own alpha box.

    python3 scripts/life/recut-pogi-walk-2026-09-16.py [--dry-run]
    python3 scripts/life/to-webp-2026-09-13.py           # ← always, straight after

`docs/life/GRAPHICS-AUDIT-2026-09-16.md` §1ב measured it and this script re-measured it
before touching anything: `pogi-w1…w8` are 835×1264 canvases where every other figure in
`public/life/art` is content-tight. The engine gives a sprite its size from the TEXTURE
height (`WorldScene.fit`) and stands the CANVAS bottom on the floor (`setOrigin(0.5, 1)`),
so empty canvas is not neutral — it is a shorter boy hovering above the ground:

    frame   feet at % of canvas   hover above groundY   drawn height
    w1            96.60%                 3.40%             94.62%
    w2            99.53%                 0.47%             98.10%
    w3            91.93%                 8.07%             88.84%
    w4            97.47%                 2.53%             94.94%
    w5            93.28%                 6.72%             90.66%
    w6            97.55%                 2.45%             97.07%
    w7            89.40%                10.60%             87.97%
    w8            99.68%                 0.32%             98.89%

That is a 10.3-point float jitter and an 11-point height swing per cycle, and a
`displayWidth` of 0.661×H against the standing pose's 0.356×H — which `applyScale` turns
into a shadow 86% wider the instant he walks.

**The variation is framing, not anatomy, and that is what decides the fix.** Measured
here: shoulder width over figure height is 0.215–0.226 across all eight frames — flat.
The whole figure is drawn at a different SCALE in each frame (shoulders 239px to 275px,
tracking height exactly); a walk cycle's real head bob is two or three per cent, not
twelve. So normalising the eight to one height is a correction and not a loss, and
`hero80-w1…w8` — the twelve-year-old's cycle, delivered right — is the precedent sitting
in the same folder: eight content-tight canvases, all exactly 430 tall, feet at 100%.

Three steps, in this order and no other:

  1. **Crop to the alpha box** (a > 8, the same threshold `to-webp-2026-09-13.visible_yellow`
     counts through). Feet land on the canvas bottom, which is where `setOrigin(0.5, 1)`
     puts the floor.
  2. **Resize to 430 tall**, the native height of `pogi`, `pogi-side` and `pogi-back` —
     the poses these frames interleave with. The street draws the boy at 0.29 × 1536 ≈ 445
     px at the near line, so 430 is the size the standing poses already ship at and a walk
     frame three times sharper than the pose beside it reads as a pop.
  3. **Hand the result to the converter as a PNG** and let `to-webp-2026-09-13.py` do the
     de-yellow, the encode and the decoded-bytes proof. Rule 44's order is satisfied by
     construction — the resize happens here, the de-yellow happens after it, downstream —
     and rule 61's "everyone who writes to this folder finishes with the converter" is
     satisfied literally. This file contains no definition of yellow, because there are
     already three and that is two too many.
"""
from __future__ import annotations

import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
ART = os.path.join(ROOT, 'public/life/art')

FRAMES = [f'pogi-w{i}' for i in range(1, 9)]
# `pogi`, `pogi-side`, `pogi-3q` and `pogi-back` are all 430 tall. The walk is the same boy.
TALL = 430
ALPHA = 8


def box(im: Image.Image):
    """The alpha bounding box at the same threshold the yellow proof uses."""
    return im.getchannel('A').point(lambda a: 255 if a > ALPHA else 0).getbbox()


def recut(key: str, dry: bool) -> dict:
    src = os.path.join(ART, f'{key}.webp')
    with Image.open(src) as raw:
        im = raw.convert('RGBA')
    was = im.size
    bb = box(im)
    if bb is None:
        raise SystemExit(f'{key}: nothing on the canvas')
    cut = im.crop(bb)
    wide = max(1, round(cut.width * TALL / cut.height))
    out = cut.resize((wide, TALL), Image.LANCZOS)
    feet = bb[3] / was[1] * 100
    row = {
        'key': key,
        'was': was,
        'now': out.size,
        'feet_before': feet,
        'hover_before': 100 - feet,
        'fill_before': (bb[3] - bb[1]) / was[1] * 100,
        'aspect_before': was[0] / was[1],
        'aspect_after': out.size[0] / out.size[1],
    }
    if not dry:
        # PNG, deliberately: the next command is the converter, and the converter is the
        # only thing in this repository allowed to decide what a `.webp` in this folder
        # looks like. It reads every `*.png` here, de-yellows, encodes, decodes, counts,
        # writes the `.webp` and deletes the PNG.
        out.save(os.path.join(ART, f'{key}.png'))
    return row


def main() -> int:
    dry = '--dry-run' in sys.argv
    rows = [recut(key, dry) for key in FRAMES]
    print(f'{"frame":10} {"was":>12} {"now":>10} {"hover":>8} {"fill":>8} {"w/h was":>9} {"w/h now":>9}')
    for r in rows:
        print(f'{r["key"]:10} {r["was"][0]}x{r["was"][1]:<7} {r["now"][0]}x{r["now"][1]:<5} '
              f'{r["hover_before"]:7.2f}% {r["fill_before"]:7.2f}% {r["aspect_before"]:9.3f} {r["aspect_after"]:9.3f}')
    if dry:
        print('--dry-run: nothing written')
        return 0
    print(f'{len(rows)} PNG כתובים ל-public/life/art — עכשיו: '
          f'python3 scripts/life/to-webp-2026-09-13.py')
    return 0


if __name__ == '__main__':
    sys.exit(main())
