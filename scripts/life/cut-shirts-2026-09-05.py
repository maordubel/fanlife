#!/usr/bin/env python3
"""
החולצות — ten real Hapoel shirts, cut off their photographs and made into game objects.

    python3 scripts/life/cut-shirts-2026-09-05.py

Maor photographed the shirts he wants collectable: the pinstriped adidas VISA of the
eighties, the two Diadora kits of the nineties, King, Shikun Ovdim, the basketball vest,
the Nike crt, the 1985 centenary VISA and the Red Devil. Product photos, so the work is
a cut-out and a clean-up rather than a painting:

  1. the ground is flooded from the four corners with a colour distance, which handles a
     white studio backdrop, a tiled floor and a wooden one alike;
  2. the mask is closed and feathered by a pixel, so a collar does not come out serrated;
  3. the shirt is trimmed to its own bounding box and set on a fixed 1024-tall canvas, so
     twelve shirts hang at one scale in a shop and nobody has to tune each card;
  4. and it goes through the same de-yellow every cut-out in this game goes through —
     which matters for exactly one of them, since a VISA band is gold and rule 8 fails a
     build on a yellow pixel. The band comes out the copper it was on a sun-bleached 1986
     terrace, and it still reads as VISA.
"""
import importlib.util
import json
import os

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'public/life/art')
SRC = os.environ.get('WORKER_SHIRTS', '/root/.claude/uploads/1031bb6e-b609-5caf-8b3a-4b2f7101c0c4')


def _load(name, filename):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, filename))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


ig = _load('ig', 'ingest-2026-09.py')

# file → (key, tolerance for the ground flood)
SHIRTS = [
    ('eff76362-image.png', 'shirtVisa86', 42),
    ('f3a6844b-image.png', 'shirtVisa85', 60),
    ('034def1a-image.png', 'shirtDiadoraRed', 40),
    ('3066066a-image.png', 'shirtDiadoraWhite', 30),
    ('4b7318e8-image.png', 'shirtKing', 36),
    ('714b0418-image.png', 'shirtShikun', 36),
    ('f043b483-image.png', 'shirtCrt', 36),
    ('354b248a-image.png', 'shirtRedDevil', 62),
    ('13b16819-image.png', 'shirtBasket90', 40),
]
CANVAS = 1024


def cut(path, tol):
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(int)
    h, w = a.shape[:2]
    # the ground: a flood from every corner, in colour distance rather than by threshold,
    # so a white studio sweep and a brown floor are the same problem
    ground = np.zeros((h, w), bool)
    stack = [(0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1)]
    seeds = [a[y, x] for y, x in stack]
    seen = np.zeros((h, w), bool)
    for sy, sx in stack:
        seen[sy, sx] = True
    todo = list(stack)
    while todo:
        y, x = todo.pop()
        ground[y, x] = True
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx]:
                px = a[ny, nx]
                if min(np.abs(px - s).sum() for s in seeds) < tol * 3:
                    seen[ny, nx] = True
                    todo.append((ny, nx))
    alpha = Image.fromarray(((~ground) * 255).astype('uint8'), 'L')
    # close the pinholes a flood leaves inside a bright collar, then soften the edge
    alpha = alpha.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.8))
    out = im.convert('RGBA')
    out.putalpha(alpha)
    box = out.getbbox()
    out = out.crop(box)
    # one canvas for all of them: a shop where every shirt hangs at the same size
    scale = (CANVAS * 0.94) / max(out.size)
    out = out.resize((max(1, round(out.size[0] * scale)), max(1, round(out.size[1] * scale))), Image.LANCZOS)
    card = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))
    card.alpha_composite(out, ((CANVAS - out.size[0]) // 2, (CANVAS - out.size[1]) // 2))
    return card


def main():
    path = os.path.join(OUT, 'manifest.json')
    manifest = json.load(open(path, encoding='utf8'))
    for filename, key, tol in SHIRTS:
        src = os.path.join(SRC, filename)
        if not os.path.exists(src):
            print('  missing', filename)
            continue
        row = ig.write(cut(src, tol), key)
        row['source'] = 'shirts-2026-09-05'
        manifest.setdefault('shirts', {})[key] = row
    json.dump(manifest, open(path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print(f'{len(SHIRTS)} shirts cut')


if __name__ == '__main__':
    main()
