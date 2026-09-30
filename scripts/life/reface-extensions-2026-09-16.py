#!/usr/bin/env python3
"""
הרצועות שמתחת לחדר היו כמעט שחורות — regenerating every backdrop extension from the WebP.

  python3 scripts/life/reface-extensions-2026-09-16.py --measure     # report only
  python3 scripts/life/reface-extensions-2026-09-16.py --write

**The measurement that started this.** On a 360x740 phone the street reads as a picture in
the top two fifths of the glass and a black void under it, with the child standing in the
void rather than on the pavement. `street--ground.webp` has a mean brightness of 31 where
the bottom of `street.webp` — the pavement it is supposed to CONTINUE — is 99. Swept
across the whole art folder: **46 of 61 ground strips are more than 25 levels darker than
the paint they continue**, several of them by 80.

**Why, exactly.** `finish-backdrops.py` composites the stretched edge band toward `ink`
through `mask = 255 * 0.92 * (v/255) ** 0.55`. Gamma 0.55 is a fast-then-slow curve, and
it is fast very early: a quarter of the way down the strip the mask is already 45% ink,
halfway it is 63%. The comment above it explains the intent — "this reads as the room
standing in the dark, which is exactly how Very Little Nightmares lights its dioramas" —
and the intent is right. The curve is the wrong shape for it. It was chosen to escape the
opposite failure (a wide band of mid-grey smear that Maor photographed), and it escaped
straight past the target.

**The curve here is the same idea with the gamma the other way up**: `0.72 * t**2.2`,
which keeps the pavement essentially untouched for the first third (3% ink at a quarter,
16% at half), then falls away to 72% ink at the far edge. Floor stays floor where it meets
the picture, and the room still stands in the dark.

The original script reads `ART/<key>.png` and every PNG in that folder has since been
converted to WebP, so it cannot be re-run. This reads the WebP, writes the WebP, and
changes nothing else about the pipeline: same geometry (`EXT_CAP`, `extension_height`),
same blur radius, same de-yellow afterwards, and the yellow count is taken off the decoded
bytes of the written file (rule 61).
"""
import argparse
import glob
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import deyellow_fast  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ART = os.path.join(ROOT, 'public/life/art')

INK = (0x15, 0x12, 0x0E)
BLUR = 18
# the far edge lands here, and the curve that gets it there
INK_MAX, GAMMA = 0.72, 2.2
# the band of the painting a strip is stretched from, as a fraction of its height
EDGE = 0.06


def curve(height: int, to_top: bool) -> np.ndarray:
    t = np.linspace(0.0, 1.0, height, dtype=np.float64)
    if to_top:
        t = t[::-1]
    return (INK_MAX * t ** GAMMA)[:, None, None]


def strip(paint: Image.Image, height: int, to_top: bool) -> Image.Image:
    w, h = paint.size
    band = paint.crop((0, 0, w, int(h * EDGE))) if to_top else paint.crop((0, h - int(h * EDGE), w, h))
    stretched = band.resize((w, height), Image.BICUBIC).filter(ImageFilter.GaussianBlur(BLUR))
    a = np.asarray(stretched, dtype=np.float64)
    ink = np.array(INK, dtype=np.float64)[None, None, :]
    m = curve(height, to_top)
    return Image.fromarray(np.round(a * (1 - m) + ink * m).clip(0, 255).astype(np.uint8))


def brightness(im: Image.Image) -> float:
    return float(np.asarray(im.convert('RGB').resize((120, 40)), dtype=np.float64).mean())


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--write', action='store_true')
    ap.add_argument('--only', nargs='*', help='limit to these backdrop keys')
    args = ap.parse_args()

    _, K = deyellow_fast.constants()
    rows, dirty = [], []
    for path in sorted(glob.glob(f'{ART}/*--ground.webp')):
        key = os.path.basename(path)[: -len('--ground.webp')]
        if args.only and key not in args.only:
            continue
        paint_path = f'{ART}/{key}.webp'
        if not os.path.exists(paint_path):
            continue
        paint = Image.open(paint_path).convert('RGB')
        foot = brightness(paint.crop((0, int(paint.height * 0.92), paint.width, paint.height)))
        head = brightness(paint.crop((0, 0, paint.width, int(paint.height * 0.08))))
        row = {'key': key, 'foot': foot, 'head': head}
        for side, to_top, ref in (('ground', False, foot), ('sky', True, head)):
            dest = f'{ART}/{key}--{side}.webp'
            if not os.path.exists(dest):
                continue
            was = brightness(Image.open(dest))
            made = strip(paint, Image.open(dest).height, to_top)
            arr = np.asarray(made)
            treated, _ = deyellow_fast.deyellow(arr, K)
            now = brightness(Image.fromarray(treated))
            if args.write:
                Image.fromarray(treated).save(dest, 'WEBP', lossless=True, quality=100, method=6)
                left = deyellow_fast.count_yellow(np.asarray(Image.open(dest)), K)
                if left:
                    dirty.append(f'{key}--{side}: {left}')
            row[side] = (was, now, ref)
        rows.append(row)

    print(f'{"room":24} {"foot":>6} {"ground was→now":>18} {"head":>6} {"sky was→now":>18}')
    for r in sorted(rows, key=lambda x: x['foot'] - x.get('ground', (0, 0, 0))[0]):
        g = r.get('ground'); s = r.get('sky')
        gs = f'{g[0]:6.1f}→{g[1]:6.1f}' if g else '        —        '
        ss = f'{s[0]:6.1f}→{s[1]:6.1f}' if s else '        —        '
        print(f'{r["key"]:24} {r["foot"]:6.1f} {gs:>18} {r["head"]:6.1f} {ss:>18}')

    close = sum(1 for r in rows if 'ground' in r and abs(r['ground'][1] - r['foot']) <= 25)
    print(f'\n{close} of {len(rows)} ground strips now sit within 25 levels of the paint they continue')
    if dirty:
        print('STILL YELLOW: ' + ', '.join(dirty))
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
