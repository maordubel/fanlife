#!/usr/bin/env python3
"""THE WEEKLY (rule 124) — comic plates from the owner's own pictures, printed in any ink.

Each picture already in FAN LIFE (the magazine elements and press photos, the share art) is re-inked as a 1970s
comic print in TWO layers, so one file serves every club and the rival lock (rule 95) still holds:
  · <name>-line.webp  — ink outline, ink halftone, skin and paper; the colour band is left transparent
  · <name>-tone.webp  — the colour band as a mask; the page fills it with an ink (club colour, red, green, navy…)
`components/weekly/Plate.tsx` stacks them. Nothing here is a real player's likeness drawn from scratch: these are
the owner's approved pictures (rules 95, 98), re-printed.

  python3 scripts/brand/weekly-plates.py            (from the repo root)
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/brand/weekly/plates'
INK = (21, 19, 15); SKIN = (240, 176, 152); PAPER = (255, 251, 242)
SRC = {
    'kicker': 'public/brand/magazine/elements/kicker.webp',
    'keeper': 'public/brand/magazine/elements/net-keeper.webp',
    'face': 'public/brand/magazine/elements/face.webp',
    'bootball': 'public/brand/magazine/elements/boot-ball-ticket.webp',
    'scarf': 'public/brand/magazine/elements/terrace-scarf.webp',
    'swap': 'public/brand/magazine/elements/shirt-swap.webp',
    'dribbler': 'public/brand/magazine/photos/dribbler.webp',
    'fanfist': 'public/brand/magazine/photos/fan-fist.webp',
    'fans': 'public/brand/magazine/photos/fans-group.webp',
    'fatherson': 'public/brand/magazine/photos/father-son.webp',
    'friends': 'public/brand/magazine/photos/friends-walk.webp',
    'memo': 'public/brand/magazine/photos/memorabilia.webp',
    'cheer': 'public/share/v3/art/scarf-fan.webp',
}
# luminance bands: ink · colour band (with halftone) · skin · paper
BANDS = (0.14, 0.46, 0.72)

def plate(name: str, src: Path, size=900, cell=6):
    im = Image.open(src).convert('RGBA'); im.thumbnail((size, size))
    a = np.array(im.split()[-1])
    g = ImageOps.autocontrast(ImageOps.grayscale(im.convert('RGB')), cutoff=2)
    L = np.array(g.filter(ImageFilter.MedianFilter(7))).astype(float) / 255
    h, w = L.shape
    ink = L < BANDS[0]; tone = (L >= BANDS[0]) & (L < BANDS[1]); skin = (L >= BANDS[1]) & (L < BANDS[2]); paper = L >= BANDS[2]
    yy, xx = np.mgrid[0:h, 0:w]
    u = (xx + yy) / 1.414; v = (xx - yy) / 1.414
    r = np.hypot((u % cell) - cell / 2, (v % cell) - cell / 2)
    rad = (1 - (L - BANDS[0]) / (BANDS[1] - BANDS[0])) * cell * 0.42
    dots = tone & (r < rad)
    e = np.array(g.filter(ImageFilter.GaussianBlur(1.2)).filter(ImageFilter.FIND_EDGES)) > 90
    line = np.zeros((h, w, 4), np.uint8)
    line[skin] = SKIN + (255,); line[paper] = PAPER + (255,)
    line[ink | dots | e] = INK + (255,)
    line[..., 3] = np.where(a > 128, line[..., 3], 0)
    mask = np.zeros((h, w, 4), np.uint8); mask[..., 3] = np.where(tone & (a > 128), 255, 0)
    # the ink outline around the cut-out
    alpha = Image.fromarray(np.where(a > 128, 255, 0).astype(np.uint8))
    halo = np.array(alpha.filter(ImageFilter.MaxFilter(9)))
    out = np.zeros((h, w, 4), np.uint8); out[halo > 0] = INK + (255,)
    keep = line[..., 3] > 0; out[keep] = line[keep]
    out[mask[..., 3] > 0] = (0, 0, 0, 0)
    Image.fromarray(out).save(OUT / f'{name}-line.webp', lossless=True, quality=100, method=6)  # lossless: a lossy ink edge picks up a tint a rival lock can read (rule 124)
    Image.fromarray(mask).save(OUT / f'{name}-tone.webp', quality=80, method=6, lossless=False)
    return w / h

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    ratios = {n: round(plate(n, ROOT / p), 4) for n, p in SRC.items()}
    (OUT / 'index.json').write_text(json.dumps(ratios, indent=1) + '\n')
    print(ratios)
