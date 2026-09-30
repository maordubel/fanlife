#!/usr/bin/env python3
"""
העור של רפי — תיקון נזק של de-yellow (21.9.2026).

רפי מהקיוסק הגיע ב-4.9.2026 בחבילה של שלושה-עשר פוזות ושישה לוחות פנים, והמעבר של
כלל 44 עבר על העור שלו: פיקסל זהוב (גוון 30–38) הורד ל-S 0.26 — אפור — ופיקסל צהוב
באמת סובב ל-26° — כתום. יחד זה עור של כתמים: אפור ופסי כתום על הזרועות, על הצוואר ועל
הפנים. בצילום של הקיוסק ב-2000 זה מה שעמד מול הדלפק.

**התיקון.** עור בגוון 21° ורוויה 0.2–0.38 הוא לא צהוב (הפס הקנוני הוא 38–70), ולכן
מותר לצבוע אותו חזרה. הזרעים הם הכתמים הכתומים עצמם — הם מסמנים בדיוק איפה היה עור —
ומהם גדלים, פיקסל אחרי פיקסל ועד שבעה, רק דרך מועמדים: חמים ברוויה בינונית, או אפורים
בבהירות של עור (0.34–0.68) — לא הקרם של החולצה (בהיר יותר) ולא המכנסיים (כהים יותר).
גרסה ראשונה גדלה דרך רכיבים קשירים וצבעה את החולצה בוורוד. הבהירות נשמרת, כך שהצללים
של הפנים נשארים; הגוון והרוויה אחידים.

    python3 scripts/life/repair-skin-2026-09-21.py
    python3 scripts/life/to-webp-2026-09-13.py && python3 scripts/life/to-webp-2026-09-13.py --index
"""
from __future__ import annotations

import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ART = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'life', 'art'))
KEYS = [k[:-5] for k in sorted(os.listdir(ART)) if k.endswith('.webp') and (k.startswith('oldMan') or k.startswith('faceOldMan'))]


def hsv(a: np.ndarray):
    r, g, b = (a[..., i] / 255.0 for i in range(3))
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    i = (mx == r) & m
    h[i] = ((g - b)[i] / d[i]) % 6
    i = (mx == g) & m
    h[i] = ((b - r)[i] / d[i]) + 2
    i = (mx == b) & m
    h[i] = ((r - g)[i] / d[i]) + 4
    return h * 60, np.where(mx > 0, d / np.maximum(mx, 1e-6), 0), mx


def rgb(h, s, v):
    h = (h / 60.0) % 6
    i = np.floor(h).astype(int)
    f = h - i
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    return np.stack([np.choose(i % 6, [v, q, p, p, t, v]), np.choose(i % 6, [t, v, v, q, p, p]), np.choose(i % 6, [p, p, t, v, v, q])], -1)


def repair(arr: np.ndarray) -> tuple[np.ndarray, int]:
    im = arr.astype(np.float32)
    h, s, v = hsv(im)
    solid = im[..., 3] > 40
    seeds = solid & (h >= 8) & (h <= 36) & (s >= 0.22) & (v > 0.3)
    cand = solid & ((((h <= 40) & (s >= 0.15) & (v > 0.3) & (v < 0.85))) | ((s < 0.2) & (v > 0.34) & (v < 0.68)))
    skin = seeds.copy()
    for _ in range(7):
        skin = ndimage.binary_dilation(skin) & cand
    skin = ndimage.binary_closing(skin, iterations=2) & cand
    vv = ndimage.uniform_filter(v, 3) * 0.5 + v * 0.5
    sat = np.clip(0.26 + 0.12 * (0.75 - v), 0.2, 0.38)
    paint = rgb(np.full_like(h, 21.0), sat, vv) * 255
    out = im.copy()
    out[..., :3] = np.where(skin[..., None], paint, im[..., :3])
    return out.clip(0, 255).astype(np.uint8), int(skin.sum())


def main() -> int:
    for key in KEYS:
        path = os.path.join(ART, f'{key}.webp')
        arr = np.array(Image.open(path).convert('RGBA'))
        out, n = repair(arr)
        Image.fromarray(out, 'RGBA').save(os.path.join(ART, f'{key}.png'))
        os.remove(path)
        print(f'{key:20s} {n} פיקסלי עור')
    return 0


if __name__ == '__main__':
    sys.exit(main())
