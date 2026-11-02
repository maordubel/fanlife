"""Cut a figure out of a flat paper or white background, or clean the edge of one that already has alpha.

    python3 scripts/football-stories/cutout.py <in> <out.png> [--max 1400]

The background is the colour of the border; everything connected to the border within a small distance of it is
removed (so a white shirt INSIDE the figure stays), a painted checkerboard counts as background, the edge is eroded
one pixel and feathered, and the result is trimmed to the figure.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage


def cut(src: Path, max_side: int = 1400, tol: float = 34.0) -> Image.Image:
    im = Image.open(src)
    if im.mode == 'RGBA' and np.asarray(im.getchannel('A')).min() < 200:
        a = np.asarray(im.getchannel('A')).astype('float32')
        rgb = np.asarray(im.convert('RGB'))
        keep = a > 40
    else:
        rgb = np.asarray(im.convert('RGB'))
        h, w, _ = rgb.shape
        border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]]).astype('float32')
        # two background tones: a plain sheet has one, a painted checkerboard has two
        lum = border.mean(1)
        cols = [np.median(border[lum >= np.median(lum)], 0), np.median(border[lum < np.median(lum)], 0)]
        f = rgb.astype('float32')
        near = np.zeros((h, w), bool)
        for c in cols:
            near |= np.abs(f - c).max(2) < tol
        lab, _ = ndimage.label(near)
        edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        bg = np.isin(lab, list(edge))
        keep = ~bg
        keep = ndimage.binary_opening(keep, iterations=1)
        # drop specks: keep components larger than 0.2% of the biggest
        lab2, n = ndimage.label(keep)
        if n > 1:
            sizes = ndimage.sum(keep, lab2, range(1, n + 1))
            keep = np.isin(lab2, [i + 1 for i, s in enumerate(sizes) if s >= sizes.max() * 0.002])
        a = keep.astype('float32') * 255
    keep = ndimage.binary_erosion(keep, iterations=1)
    alpha = Image.fromarray((keep * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.8))
    out = Image.fromarray(rgb).convert('RGBA')
    out.putalpha(alpha)
    box = out.getchannel('A').point(lambda p: 255 if p > 8 else 0).getbbox()
    if box:
        out = out.crop(box)
    s = min(1.0, max_side / max(out.size))
    if s < 1:
        out = out.resize((round(out.width * s), round(out.height * s)), Image.LANCZOS)
    return out


if __name__ == '__main__':
    args = sys.argv[1:]
    mx = int(args[args.index('--max') + 1]) if '--max' in args else 1400
    cut(Path(args[0]), mx).save(args[1], optimize=True)
