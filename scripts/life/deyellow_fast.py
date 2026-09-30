#!/usr/bin/env python3
"""
אותו טיפול, מאה פעמים מהר יותר — a vectorised twin of `build-art.py`'s pixel loop.

  python3 scripts/life/deyellow_fast.py --prove DIR   # equality against the original

`build-art.py` walks every pixel in Python with a dict memo. That was fine for the
concept boards it was written for, and it is not fine for a 788x1400 close-up plate:
seven of them timed out at two minutes on the first attempt to ingest the 16.9.2026 art
delivery. This module is the same arithmetic in numpy.

**It is a twin, not a replacement, and the difference matters.** `build-art.py` stays the
definition of the treatment; nothing here is allowed to be "close enough". `prove()`
re-runs the original pixel loop over real delivered files and asserts the two outputs are
BYTE-IDENTICAL, moved-pixel counts included. It was run against
`plates/faceTeacher.png` (13 pixels moved), `plates/faceRachel90-nu.png` (126) and
`portraits/faceFreddy.png` (852, and 264 yellow before treatment) and came back identical
on all three. A rewrite of a colour rule that is only spot-checked is a rewrite that will
silently drift, and rule 8 is not a thing to drift on.

Three places the arithmetic had to be copied exactly rather than cleaned up:

  * **Hue branch order.** The original tests `mx == r`, then `mx == g`, then falls
    through to blue, so a grey pixel (r == g == b, d == 0) takes the `d == 0` early exit
    and a tie between two equal maxima goes to whichever the chain reaches first. The
    `np.select` here reproduces that order rather than the textbook formula.
  * **Rounding.** `hsv_to_rgb` uses Python's `round()`, which is banker's rounding.
    `np.round` is too. `int()` truncation would move a pixel by one and break the proof.
  * **Alpha.** `deyellow` converts to RGB, treats, and puts the original alpha back.
    The twin takes the RGB planes only and the caller re-attaches alpha, which keeps the
    transparent border out of the arithmetic — the mistake rule 61 exists because of.
"""
import argparse
import importlib.util
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))


def constants():
    """The treatment's numbers, read from `build-art.py` so they can never fork."""
    spec = importlib.util.spec_from_file_location('build_art', os.path.join(HERE, 'build-art.py'))
    ba = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(ba)
    return ba, {
        'SAT_MIN': ba.SAT_MIN, 'VAL_MIN': ba.VAL_MIN,
        'HUE_MIN': ba.HUE_MIN, 'HUE_MAX': ba.HUE_MAX,
        'TRUE_YELLOW_SAT': ba.TRUE_YELLOW_SAT, 'TY': ba.TRUE_YELLOW_HUE,
        'GREEN_SPLIT': ba.GREEN_SPLIT, 'SAFE_GREEN_HUE': ba.SAFE_GREEN_HUE,
        'SAFE_HUE': ba.SAFE_HUE, 'SAFE_SAT': ba.SAFE_SAT, 'SAFE_RAMP': ba.SAFE_RAMP,
        'SCAN_SAT': ba.SCAN_SAT, 'SCAN_VAL': ba.SCAN_VAL, 'SCAN_HUE': ba.SCAN_HUE,
    }


def rgb_to_hsv(arr):
    a = arr.astype(np.float64)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    nz = d != 0
    is_r = nz & (mx == r)
    is_g = nz & ~is_r & (mx == g)
    is_b = nz & ~is_r & ~is_g
    with np.errstate(invalid='ignore', divide='ignore'):
        h[is_r] = 60 * (((g[is_r] - b[is_r]) / d[is_r]) % 6)
        h[is_g] = 60 * ((b[is_g] - r[is_g]) / d[is_g] + 2)
        h[is_b] = 60 * ((r[is_b] - g[is_b]) / d[is_b] + 4)
        s = np.where(mx == 0, 0.0, d / np.where(mx == 0, 1, mx))
    return h, s, mx / 255.0


def hsv_to_rgb(h, s, v):
    c = v * s
    x = c * (1 - np.abs((h / 60) % 2 - 1))
    m = v - c
    z = np.zeros_like(c)
    i = np.clip((h // 60).astype(int), 0, 5)
    pick = [i == 0, i == 1, i == 2, i == 3, i == 4, i == 5]
    r = np.select(pick, [c, x, z, z, x, c])
    g = np.select(pick, [x, c, c, x, z, z])
    b = np.select(pick, [z, z, x, c, c, x])
    out = np.stack([(r + m) * 255, (g + m) * 255, (b + m) * 255], -1)
    return np.round(out).astype(np.int64).clip(0, 255).astype(np.uint8)


def deyellow(rgb, K):
    """RGB planes in, RGB planes out, plus how many pixels moved."""
    h, s, v = rgb_to_hsv(rgb)
    out = rgb.copy()
    band = (s >= K['SAT_MIN']) & (v >= K['VAL_MIN']) & (h >= K['HUE_MIN']) & (h <= K['HUE_MAX'])
    true_y = band & (s >= K['TRUE_YELLOW_SAT']) & (h >= K['TY'][0]) & (h <= K['TY'][1])
    grass = true_y & (h >= K['GREEN_SPLIT'])
    gold = true_y & ~grass
    soft = band & ~true_y & (s > K['SAFE_SAT'])
    ss = np.minimum(0.86, s * 0.9)
    if grass.any():
        out[grass] = hsv_to_rgb(np.full(int(grass.sum()), K['SAFE_GREEN_HUE']), ss[grass], v[grass])
    if gold.any():
        out[gold] = hsv_to_rgb(np.full(int(gold.sum()), K['SAFE_HUE']), ss[gold], v[gold])
    if soft.any():
        excess = s[soft] - K['SAFE_SAT']
        out[soft] = hsv_to_rgb(h[soft], s[soft] + (K['SAFE_SAT'] - s[soft]) * np.minimum(1.0, excess / K['SAFE_RAMP']), v[soft])
    return out, int((out != rgb).any(-1).sum())


def count_yellow(rgba, K):
    """Rule 61: alpha below 8 is not painted, so it is not counted."""
    rgb = rgba[..., :3]
    alpha = rgba[..., 3] if rgba.shape[-1] == 4 else np.full(rgb.shape[:2], 255, np.uint8)
    h, s, v = rgb_to_hsv(rgb)
    hit = (alpha >= 8) & (s >= K['SCAN_SAT']) & (v >= K['SCAN_VAL']) & (h >= K['SCAN_HUE'][0]) & (h <= K['SCAN_HUE'][1])
    return int(hit.sum())


def prove(paths):
    """Run both implementations over real files and refuse anything but byte equality."""
    from PIL import Image
    ba, K = constants()
    ok = True
    for path in paths:
        im = Image.open(path)
        im = im.convert('RGBA') if im.mode in ('RGBA', 'LA', 'P') else im.convert('RGB')
        ref, ref_moved = ba.deyellow(im)
        arr = np.array(im)
        if arr.shape[-1] == 4:
            got, got_moved = deyellow(arr[..., :3], K)
            got = np.dstack([got, arr[..., 3]])
        else:
            got, got_moved = deyellow(arr, K)
        same = np.array_equal(np.array(ref), got) and ref_moved == got_moved
        counts = (ba.count_yellow(im), count_yellow(arr, K))
        ok = ok and same and counts[0] == counts[1]
        print(f'{os.path.basename(path):34} identical={same}  moved={ref_moved}/{got_moved}  yellow={counts[0]}/{counts[1]}')
    return ok


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--prove', nargs='+', required=True, help='image files to prove equality on')
    args = ap.parse_args()
    sys.exit(0 if prove(args.prove) else 1)
