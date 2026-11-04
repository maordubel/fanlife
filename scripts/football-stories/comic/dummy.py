"""Stand-in panels for tests and local runs: gradients and shapes in ink, named like the owner's files.

They let CI and this sandbox exercise every stage without the owner's art (which never enters the repository).
They are drawn here, in code, and are obviously not the art.

    python3 scripts/football-stories/comic/dummy.py --out /tmp/dummy-panels [--size 1792x1008]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from comic.manifest import entries, load_manifest  # noqa: E402

INK = (21, 19, 15)
PALETTES = [((27, 154, 214), (244, 236, 216)), ((35, 60, 143), (215, 25, 32)), ((244, 236, 216), (27, 154, 214)),
            ((22, 32, 63), (242, 106, 27))]


def panel(w: int, h: int, seed: int) -> Image.Image:
    r = np.random.default_rng(seed)
    top, bot = PALETTES[seed % len(PALETTES)]
    ys = np.linspace(0, 1, h)[:, None, None]
    grad = (np.array(top) * (1 - ys) + np.array(bot) * ys) * np.ones((1, w, 1))
    im = Image.fromarray(grad.astype(np.uint8), 'RGB')
    d = ImageDraw.Draw(im)
    # a horizon / floor
    hy = int(h * r.uniform(.55, .7))
    d.rectangle([0, hy, w, h], fill=tuple(int(c * .7) for c in bot))
    d.line([(0, hy), (w, hy)], fill=INK, width=6)
    # background blocks (a stand, a wall)
    for _ in range(5):
        x0 = int(r.uniform(0, w * .85))
        bw, bh = int(r.uniform(w * .06, w * .18)), int(r.uniform(h * .15, h * .4))
        d.rectangle([x0, hy - bh, x0 + bw, hy], fill=tuple(int(c * .85) for c in top), outline=INK, width=5)
    # halftone dots in the sky
    for y in range(0, hy, 18):
        for x in range(0, w, 18):
            rr = 3 * (1 - y / hy)
            if rr > .6:
                d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=tuple(int(c * .8) for c in top))
    # the subject: a figure-ish stack of ellipses in the middle ground
    cx, base = int(w * r.uniform(.38, .62)), int(h * .86)
    body = [cx - w * .07, base - h * .5, cx + w * .07, base - h * .12]
    d.ellipse(body, fill=(215, 25, 32), outline=INK, width=8)
    d.ellipse([cx - w * .045, base - h * .66, cx + w * .045, base - h * .5], fill=(232, 162, 124), outline=INK, width=8)
    d.rectangle([cx - w * .05, base - h * .14, cx + w * .05, base], fill=INK)
    # a foreground object at the bottom edge
    fx = int(w * r.uniform(.05, .3)) if r.random() < .5 else int(w * r.uniform(.7, .9))
    d.polygon([(fx - w * .09, h), (fx, h - h * .3), (fx + w * .09, h)], fill=(27, 154, 214), outline=INK, width=8)
    return im


def write_all(out: Path, size=(1792, 1008), file_key: str | None = None) -> list[Path]:
    out.mkdir(parents=True, exist_ok=True)
    man = load_manifest()
    paths = []
    for i, e in enumerate(entries(man, file_key)):
        p = out / e['file']
        panel(size[0], size[1], i + 1).save(p, quality=90)
        paths.append(p)
    return paths


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--size', default='1792x1008')
    ap.add_argument('--file', default=None)
    a = ap.parse_args()
    w, h = (int(v) for v in a.size.split('x'))
    print(len(write_all(a.out, (w, h), a.file)), 'dummy panels →', a.out)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
