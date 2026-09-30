"""
Three crest artworks from the approved folder, 27.9.2026 — as Maor ruled them.

  python3 scripts/brand/crests-2026-09-27.py

· "סמל שנות ה80" (cream, 2.5% yellow): "נא תהפוך אותו לשחור ולבן ותשמש בו בשחור ולבן לפי
  הצורך" → worker-80s-ink.png (for light cloth) and worker-80s-white.png (for red/ink cloth).
  The cream is dropped entirely; the alpha is the artwork.
· "סמל עם כתר אדום 2" / "סמל עם כתר אדום": "שתיהם נכונות, עם הכיתוב השחור השתמשו בשתיהם" →
  keter-ball-black.png (the flat mark) and keter-ball-patch.png (the sewn patch, its own oval
  ground — the one to put on a red shirt). keter-ball.png (red lettering) stays on disk.
Each output is trimmed to its alpha, scaled to 420px on its long side, saved as a lossless
PNG (rule 27) and measured for yellow; a non-zero count fails the script.
"""
import os
import sys

import numpy as np
from PIL import Image

SRC = os.environ.get('WORKER_OK', '/mnt/user-data/uploads/גרפיקה מאושרת')
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'brand', 'crests')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'life'))


def yellow(im):
    a = np.asarray(im.convert('RGBA')).astype(float)
    rgb = a[..., :3] / 255
    mx = rgb.max(2); mn = rgb.min(2); d = mx - mn
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]; dd = np.maximum(d, 1e-6)
    h = np.where(mx == r, ((g - b) / dd) % 6, np.where(mx == g, (b - r) / dd + 2, (r - g) / dd + 4)) * 60
    return int(((h >= 38) & (h <= 70) & (s >= .35) & (mx >= .35) & (a[..., 3] > 0)).sum())


def fit(im):
    im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())
    k = 420 / max(im.size)
    return im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)


def clean(im):
    """the handful of edge pixels where red meets white and the scan ran warm: out of the band,
    to the badge's brown at the same value (rule 44)"""
    import colorsys
    a = np.asarray(im.convert('RGBA')).copy()
    for y, x in zip(*np.nonzero(a[..., 3] > 0)):
        r, g, b = a[y, x, :3] / 255
        h, s_, v = colorsys.rgb_to_hsv(r, g, b)
        if 30 <= h * 360 <= 80 and s_ >= 0.18:
            rr, gg, bb = colorsys.hsv_to_rgb(24 / 360, min(s_, 0.5), v)
            a[y, x, :3] = (round(rr * 255), round(gg * 255), round(bb * 255))
    return Image.fromarray(a, 'RGBA')


def save(im, name):
    # lossless RGBA (rule 27 forbids LOSSY; an octree palette with alpha invented colours at
    # the anti-aliased edge and was measured doing it). The count below is the proof.
    path = os.path.join(OUT, f'{name}.png')
    im.save(path, optimize=True)
    y = yellow(Image.open(path))
    print(f'{name}: {Image.open(path).size} yellow {y}')
    if y:
        raise SystemExit(f'{name} carries yellow')


def mono(src, rgb):
    im = Image.open(src).convert('RGBA')
    a = np.asarray(im).astype(np.uint8).copy()
    a[..., 0], a[..., 1], a[..., 2] = rgb
    out = np.asarray(fit(Image.fromarray(a, 'RGBA'))).copy()
    # resampling un-premultiplies near-clear edge pixels into stray colours; the mark has ONE
    out[..., 0], out[..., 1], out[..., 2] = rgb
    return Image.fromarray(out, 'RGBA')


def main():
    eighties = os.path.join(SRC, 'סמל שנות ה80.png')
    save(mono(eighties, (0x14, 0x12, 0x10)), 'worker-80s-ink')
    save(mono(eighties, (0xF7, 0xF4, 0xEE)), 'worker-80s-white')
    save(clean(fit(Image.open(os.path.join(SRC, 'סמל עם כתר אדום 2.png')).convert('RGBA'))), 'keter-ball-black')
    save(clean(fit(Image.open(os.path.join(SRC, 'סמל עם כתר אדום.png')).convert('RGBA'))), 'keter-ball-patch')


if __name__ == '__main__':
    main()
