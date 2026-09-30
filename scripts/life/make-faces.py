#!/usr/bin/env python3
"""
פנים מהגוף — a portrait plate for every speaker who had none, cut from their own figure.

`faceFan` was one blurred crop of a 30-pixel concept sprite standing in for twenty-five
people: the usher, Shachor, Soko, Asaf, Freddy, Liron, Michel, Melamed, the commander.
Every one of them has a full figure at 430px in the September sheets. This cuts the head
off that figure — square, a little air above the hair, shoulders in — and prints it on
the same cream ground as `facePogi`, so a balloon shows the person who is talking.

    python3 scripts/life/make-faces.py
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ART = Path('public/life/art')
CREAM = (0xED, 0xE6, 0xD8)
SIZE = 320

# portrait key → (figure file, how far down the figure the head ends, as a fraction)
FACES: dict[str, tuple[str, float]] = {
    'faceShachor': ('shachor', 0.2),
    'faceSoko': ('soko', 0.2),
    'faceAsaf': ('asaf', 0.2),
    # Freddy and Melamed only exist as a 2.4× upscale of a small sheet; a head cut from that
    # is posterised mush. Until their sheets arrive they borrow a clean adult (GRAPHICS-REQUESTS §6).
    'faceFreddy': ('adultA2', 0.2),
    'faceMelamed': ('adultB4', 0.2),
    'faceHermesh': ('hermesh', 0.2),
    'faceYosef': ('yosef', 0.2),
    'faceUsher': ('usher', 0.2),
    'faceVendor': ('hallVendor', 0.2),
    'faceLiron': ('adultB2', 0.2),
    'faceMichel': ('adultA6', 0.2),
    'faceLimor': ('adultB5', 0.2),
    'faceDudu': ('adultA4', 0.2),
    'faceBarry': ('adultA7', 0.2),
    'faceAliza': ('adultB6', 0.2),
    'faceYaron': ('soldier', 0.2),
    'faceCommander': ('adultA1', 0.2),
    'faceBoss': ('adultB1', 0.2),
    'faceDriver': ('adultA5', 0.2),
    'faceSupporter': ('adultA1', 0.2),
    'faceSupporterB': ('adultB1', 0.2),
    'faceWoman': ('adultB3', 0.2),
    'faceYoung': ('youngB4', 0.2),
    'faceOfir90': ('ofir90', 0.2),
    'faceAmit90': ('amit90', 0.2),
}


def head_box(alpha: np.ndarray, until: float) -> tuple[int, int, int, int]:
    """the square around the head: the ink's bounding box in the top `until` of the figure"""
    h, w = alpha.shape
    top_rows = alpha[: int(h * until)]
    ys, xs = np.where(top_rows > 40)
    if len(ys) == 0:
        return 0, 0, w, min(h, w)
    y0, y1 = int(ys.min()), int(ys.max())
    x0, x1 = int(xs.min()), int(xs.max())
    # the head itself is the top; the shoulders widen the box — take the width of the
    # upper two thirds of the found ink for the centre, and make the square from the height
    head_h = y1 - y0
    side = int(head_h * 1.55)
    upper = alpha[y0 : y0 + int(head_h * 0.66)]
    uys, uxs = np.where(upper > 40)
    cx = int((uxs.min() + uxs.max()) / 2) if len(uxs) else int((x0 + x1) / 2)
    cy = y0 + int(head_h * 0.5)
    left = cx - side // 2
    top = cy - int(side * 0.52)
    return left, top, left + side, top + side


def plate(figure: str, until: float) -> Image.Image:
    im = Image.open(ART / f'{figure}.png').convert('RGBA')
    alpha = np.array(im.split()[-1])
    l, t, r, b = head_box(alpha, until)
    canvas = Image.new('RGBA', (r - l, b - t), (*CREAM, 255))
    canvas.paste(im, (-l, -t), im)
    out = canvas.resize((SIZE, SIZE), Image.LANCZOS)
    # a whisper of sharpening after a big upscale — a face, not a blur
    out = out.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
    return out.convert('RGB')


def main() -> None:
    manifest = json.loads((ART / 'manifest.json').read_text(encoding='utf-8'))
    rows = manifest.setdefault('portraits', {})
    for key, (figure, until) in FACES.items():
        out = plate(figure, until)
        path = ART / f'{key}.png'
        out.save(path, optimize=True)
        rows[key] = {'w': SIZE, 'h': SIZE, 'bytes': os.path.getsize(path), 'yellowLeft': 0, 'source': f'cut from {figure}'}
        print(f'{key:16s} ← {figure}')
    (ART / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding='utf-8')


if __name__ == '__main__':
    main()
