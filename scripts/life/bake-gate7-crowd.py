#!/usr/bin/env python3
"""
היציע מתמלא — a packed terrace, baked once, out of the crowd sheets the game already has.

A full stand is about nine hundred people. Nine hundred sprites is not a crowd, it is a
frame-rate bug, so the rows the child can never reach are composited into ONE image here
and the rows he walks among stay live sprites in `scenes.ts`. The seam is the walk band:
everything above it is paint, everything inside it moves.

    python3 scripts/life/bake-gate7-crowd.py

Reads `public/life/art/stand.png` for the canvas size only and writes
`public/life/art/standCrowd.png` — transparent below the seam, so it lays straight over
the terrace with no registration to get wrong.

Rows are the tread lines measured off the painting (docs/life/GATE7-GEOMETRY.md). Scale
falls with depth on the same ramp the live rows use, so a man on the eighth step is the
same size whether he is paint or sprite. Variety comes from twenty-eight sheets, a flip,
a deterministic x wobble and a per-figure exposure — never from random(), because a
terrace that reshuffles itself every time the script runs is a diff nobody can read.
"""
import json
import os

from PIL import Image, ImageEnhance

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ART = os.path.join(ROOT, 'public/life/art')

SHEETS = [f'adult{a}{i}' for a in 'AB' for i in range(1, 8)] + [f'young{a}{i}' for a in 'AB' for i in range(1, 8)]

# the tread lines, front to back, from the painting
TREADS = [0.615, 0.597, 0.586, 0.575, 0.562, 0.551, 0.540, 0.526, 0.511, 0.503, 0.492,
          0.478, 0.468, 0.454, 0.439, 0.428, 0.418, 0.400, 0.383, 0.362, 0.344, 0.326, 0.303]

FRONT_H = 0.125          # an adult on the front step, as a fraction of the frame height
NEAR, FAR = 0.747, 0.285  # the ramp the live rows are cut on


HAPOEL = (1.02, 0.28, 0.29)   # a luminance multiplier, not a paint: folds survive it


def scale_at(y):
    return 0.55 + 0.45 * (y - FAR) / (NEAR - FAR)


def redden(rgb):
    """Push the shirt band of one figure to red, keeping its own light and shade."""
    import numpy as np
    a = np.asarray(rgb).astype(float)
    h = a.shape[0]
    top, bottom = int(h * 0.20), int(h * 0.52)
    band = a[top:bottom]
    lum = band.mean(axis=2, keepdims=True)
    tinted = np.clip(lum * np.array(HAPOEL), 0, 255)
    a[top:bottom] = band * 0.22 + tinted * 0.78
    return Image.fromarray(a.astype('uint8'), 'RGB')


def main():
    base = Image.open(os.path.join(ART, 'stand.png')).convert('RGBA')
    W, H = base.size
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    cache = {}
    n = 0
    # back to front, so the nearer row laps over the one behind it
    for r, y in enumerate(reversed(TREADS)):
        h = FRONT_H * scale_at(y)
        px_h = h * H
        step = px_h * 0.335 * 0.60          # shoulder overlap
        count = int(W / step) + 2
        for k in range(count):
            key = SHEETS[(r * 5 + k * 9 + (r * k) % 3) % len(SHEETS)]
            flip = (r + k) % 2 == 0
            # exposure: five levels, so the mass has depth without a colour cast
            shade = 0.86 + ((r * 13 + k * 7) % 5) * 0.045
            # A third of the terrace in red. The sheets are 1986 street clothes — jeans,
            # stripes, a windbreaker — which is what people actually wore, and a stand of
            # them reads blue-grey. So a third of the figures get their SHIRT pushed to
            # Hapoel red, luminance kept, which is the scarf-and-shirt colour a terrace
            # has without dressing eight thousand people in a replica kit that did not
            # exist yet.
            red = (r * 13 + k * 11) % 10 < 3
            ck = (key, round(px_h), flip, round(shade, 3), red)
            if ck not in cache:
                sheet = Image.open(os.path.join(ART, f'{key}.png')).convert('RGBA')
                w = max(1, int(round(px_h * sheet.size[0] / sheet.size[1])))
                fig = sheet.resize((w, max(1, int(round(px_h)))), Image.LANCZOS)
                if flip:
                    fig = fig.transpose(Image.FLIP_LEFT_RIGHT)
                rgb = ImageEnhance.Brightness(fig.convert('RGB')).enhance(shade)
                if red:
                    rgb = redden(rgb)
                fig = Image.merge('RGBA', (*rgb.split(), fig.split()[3]))
                cache[ck] = fig
            fig = cache[ck]
            wob = (((r * 71 + k * 37) % 13) / 13 - 0.5) * step * 0.7
            lift = (((r * 29 + k * 53) % 7) - 3) / 3 * px_h * 0.03
            x = int(round(k * step + wob - fig.size[0] / 2))
            ytop = int(round(y * H + lift - fig.size[1]))
            out.alpha_composite(fig, (max(-fig.size[0], x), ytop))
            n += 1
    out.save(os.path.join(ART, 'standCrowd.png'))
    kb = os.path.getsize(os.path.join(ART, 'standCrowd.png')) / 1024
    print(f'standCrowd  {W}x{H}  {n} figures  {kb:.0f}KB')
    path = os.path.join(ART, 'manifest.json')
    manifest = json.load(open(path, encoding='utf8'))
    manifest.setdefault('layers', {})['standCrowd'] = {
        'w': W, 'h': H, 'bytes': os.path.getsize(os.path.join(ART, 'standCrowd.png')),
        'yellowLeft': 0, 'source': 'baked-from-crowd-sheets',
    }
    json.dump(manifest, open(path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
