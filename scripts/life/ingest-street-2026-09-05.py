#!/usr/bin/env python3
"""
עומק, זהות, זיכרון — the street dressing and kiosk goods Maor sent on 5.9.2026.

    python3 scripts/life/ingest-street-2026-09-05.py

Sixteen images arrived with one instruction: put bottles in the kiosk and in the bottle
job so it feels real, dress the kiosk so it can change by decade, add more strangers to
the street, and do it at the same standard as everything else.

Eleven of the sixteen are used. The other five are named here with the reason, because a
rejection nobody wrote down is a rejection that gets re-sent:

  · three Coca-Cola bottles, a Lucky Strike advert and an Old Gold advert — real
    trademarks. A period kiosk needs bottles and cigarette packets, not somebody's
    wordmark, and the unbranded glass in the same batch does the job better.
  · two of the four old men (`034c02c0`, `58cea6a6`) carry a pngtree watermark tiled
    across the FIGURE, not just the background. Nothing cleans that.

Every source has its transparency baked into a checkerboard, so the background is keyed
here: grey-and-white checker connected to the border becomes alpha, the figure is trimmed
to what is left, and — the rule that cost this project a delta — the canvas is trimmed to
the alpha bounds, because the engine sizes a body by the HEIGHT OF ITS FILE.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)

import importlib.util

def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

ig = _load('ig', os.path.join(HERE, 'ingest-2026-09.py'))

SRC = os.environ.get('WORKER_UPLOADS', '/root/.claude/uploads/1031bb6e-b609-5caf-8b3a-4b2f7101c0c4')
OUT = os.path.join(ROOT, 'public/life/art')

# key → (source stem, group, what it is, how it is treated)
JOBS = [
    # ---- the bottles, which are the reason the job exists -------------------------
    # Both bottles come off the AMBER source, not the clear one. The clear bottle in the
    # batch is transparent in the photograph — its inside is the checkerboard — so keying
    # it leaves an outline and nothing else. An empty bottle is the full one with the
    # drink taken out of it, which is also what an empty bottle is.
    ('propBottle', 'd366f93d', 'props', 'בקבוק זכוכית ריק — הפיקדון', 'glass-empty'),
    ('propBottleFull', 'd366f93d', 'props', 'בקבוק מלא על המדף', 'glass-full'),
    # ---- kiosk dressing, changeable by decade -------------------------------------
    ('propNewsRack', 'fd23f825', 'props', 'סטנד העיתונים ליד הדלפק', 'plain'),
    ('propCart', '58c25475', 'props', 'עגלת עץ — שנות ה־80 ברחוב', 'plain'),
    ('layerShopfront', 'd286c3f4', 'layers', 'חזית חנות נטושה מעבר לכביש', 'plain'),
    # ---- strangers ----------------------------------------------------------------
    ('manCap', '00e81e09', 'figures', 'זקן עם כובע קסקט, עומד', 'figure'),
    ('manBack', 'b12585d3', 'figures', 'זקן מאחור, ידיים מאחורי הגב', 'figure'),
    ('girlTeen', 'c382c3d8', 'figures', 'נערה, ג׳ינס ומגפיים', 'figure'),
    ('boySkate', 'ec0b647f', 'figures', 'נער על סקייטבורד', 'figure'),
]

REJECTED = {
    'ca5bedcd': 'Coca-Cola — סימן מסחרי',
    '09fc3385': 'Coca-Cola — סימן מסחרי',
    '41068c74': 'Coca-Cola — סימן מסחרי',
    '2ca70d48': 'Lucky Strike — סימן מסחרי',
    '613d813a': 'Old Gold — סימן מסחרי',
    '034c02c0': 'סימן מים של pngtree על הדמות עצמה',
    '58cea6a6': 'סימן מים של pngtree על הדמות עצמה',
}


def key_checker(im):
    """
    Alpha from a baked-in checkerboard (or a flat white studio background).

    A checker pixel is grey (channels within a few points of each other) and bright. That
    also describes a white shirt, so brightness alone is not enough: only the region
    CONNECTED TO THE BORDER is background. A flood fill from the edges does that in one
    pass without a library, walking the grey mask with a stack.
    """
    a = np.array(im.convert('RGB')).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    spread = a.max(axis=2) - a.min(axis=2)
    grey = (spread < 16) & (a.max(axis=2) > 186)
    h, w = grey.shape

    seen = np.zeros_like(grey, dtype=bool)
    stack = []
    for x in range(w):
        for y in (0, h - 1):
            if grey[y, x]:
                stack.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if grey[y, x]:
                stack.append((y, x))
    while stack:
        y, x = stack.pop()
        if seen[y, x] or not grey[y, x]:
            continue
        seen[y, x] = True
        if y > 0: stack.append((y - 1, x))
        if y < h - 1: stack.append((y + 1, x))
        if x > 0: stack.append((y, x - 1))
        if x < w - 1: stack.append((y, x + 1))

    alpha = Image.fromarray(np.where(seen, 0, 255).astype(np.uint8))
    # one pixel of feather, so a cut-out does not read as a sticker
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.8)).point(lambda v: 0 if v < 96 else v)
    out = im.convert('RGBA')
    out.putalpha(alpha)
    return out


def trim(im):
    """The proportion rule: a figure is as tall as its file, so the file ends at the figure."""
    box = im.getbbox()
    return im.crop(box) if box else im


def as_glass(im, empty):
    """
    An amber bottle becomes green glass.

    Two reasons, and they agree. Rule 8: no yellow ships, and a lit amber bottle is the
    middle of the band. And the deposit bottles a child picked up off a Tel Aviv pavement
    in 1985 were green — Tempo, Crystal, the beer the men left on the wall. So the hue is
    pulled round to bottle green, and an EMPTY one is lightened and desaturated further
    so the two read apart at forty pixels tall, which is the size they are drawn at.
    """
    a = np.array(im.convert('RGBA')).astype(float)
    rgb, alpha = a[..., :3], a[..., 3:]
    lum = rgb @ np.array([0.30, 0.59, 0.11])
    tint = np.array([0.52, 0.78, 0.56]) if empty else np.array([0.20, 0.44, 0.24])
    lift = 0.55 if empty else 0.16
    out = lum[..., None] * tint[None, None, :] * (1 + lift)
    if empty:
        # an empty bottle is mostly light: flatten the contrast so it reads as glass with
        # nothing behind it rather than as a bottle of something pale
        out = out.mean() * 0.42 + out * 0.58
    # keep some of the original modelling so the glass still has highlights
    out = (0.86 if empty else 0.72) * out + (0.14 if empty else 0.28) * rgb
    return Image.fromarray(np.clip(np.concatenate([out, alpha], axis=2), 0, 255).astype(np.uint8))


def main():
    manifest_path = os.path.join(OUT, 'manifest.json')
    manifest = json.load(open(manifest_path, encoding='utf8'))
    for key, stem, group, whatHe, treat in JOBS:
        path = os.path.join(SRC, f'{stem}-image.png')
        if not os.path.exists(path):
            print(f'  missing {stem} → {key}')
            continue
        im = trim(key_checker(Image.open(path)))
        if treat == 'glass-empty':
            im = as_glass(im, True)
        elif treat == 'glass-full':
            im = as_glass(im, False)
        max_h = 430 if treat == 'figure' else (520 if group == 'layers' else 360)
        row = ig.write(im, key, max_h=max_h, method=Image.MEDIANCUT)
        row['source'] = 'maor-2026-09-05-street'
        row['whatHe'] = whatHe
        manifest.setdefault(group, {})[key] = row
        print(f'  {key:16s} {im.width:4d}x{im.height:<4d} → {row.get("bytes", 0) / 1024:5.0f}KB  {whatHe}')
    json.dump(manifest, open(manifest_path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print(f'\n{len(JOBS)} in, {len(REJECTED)} rejected:')
    for stem, why in REJECTED.items():
        print(f'  {stem}  {why}')


if __name__ == '__main__':
    main()
