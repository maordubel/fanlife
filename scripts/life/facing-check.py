#!/usr/bin/env python3
"""
בדיקת כיוון — does every profile in the folder still face right?

    python3 scripts/life/facing-check.py

The convention (`WorldScene.ART_FACES = 1`) was wrong for a day and the game walked
backwards for that day, so it is no longer left to memory. For every `-side`, `-walk`,
`-march` and `-w1…w8` file this measures the head: skin is at the front of a profile and
hair is at the back, so if the skin centroid sits to the RIGHT of the hair centroid the
figure faces right. Exits non-zero on a disagreement, and prints the file so a new sheet
is mirrored on ingest rather than at runtime.

It is a heuristic and it says so: three-quarter poses and backs of heads are reported as
UNSURE rather than as failures, because there the measurement has nothing to measure.

**ומ-13.9.2026 ועד 16.9.2026 הוא בדק אפס קבצים.** כלל 61 העביר את `public/life/art` כולה
ל-WebP; הסקריפט המשיך לחפש `*.png` בתיקייה שאין בה אף PNG, מצא כלום, הדפיס
`0 face right · 0 unsure · 0 face LEFT` ויצא באפס — ירוק, שלושה ימים, על שום דבר. כלל 48
כבר ניסח את זה: *"A harness that cannot fail is not a harness"*. שלוש שורות היו שגויות
(הגלוב, הסיומת ברג"א, ו-`[:-4]` שחתך `.web` במקום `.webp`) והתיקון מחזיר 77 קבצי פרופיל.
"""
import glob
import os
import re
import sys

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ART = os.path.join(ROOT, 'public/life/art')
PROFILE = re.compile(r'-(side|walk\d*|march|w\d)\.webp$')


def facing(path):
    """+ve means the face is forward of the middle of the head, i.e. the figure faces right.

    Skin against the head's own silhouette, not against hair: hair reads the same as a
    dark collar and a dark collar is not a direction. Measured over the top 14% of the
    figure — above the shoulders, where a profile is only face and hair — and checked by
    eye against twenty-four files on 5.9.2026 before it was allowed to fail a build.
    """
    a = np.array(Image.open(path).convert('RGBA'))
    alpha = a[..., 3] > 40
    if alpha.sum() < 400:
        return None
    ys, xs = np.where(alpha)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    top = a[y0:y0 + max(6, int((y1 - y0 + 1) * 0.14)), x0:x1 + 1]
    m = top[..., 3] > 40
    if m.sum() < 80:
        return None
    r, g, b = (top[..., i].astype(int) for i in range(3))
    v = np.maximum(np.maximum(r, g), b)
    skin = m & (v > 95) & (r > g) & (g >= b) & ((r - b) > 14) & ((r - b) < 140)
    if skin.sum() < 40:
        return None
    w = top.shape[1]
    grid = np.arange(w)[None, :].repeat(top.shape[0], 0)
    lead = grid[skin].mean() / w - grid[m].mean() / w
    if abs(lead) < 0.015:
        return None          # a front view, a back of a head, or a hood: nothing to say
    return 'right' if lead > 0 else 'left'


# The illustrated child the photographic one replaced in September. Nothing loads these,
# they face left, and mirroring dead art only makes the next audit longer.
DEAD = {f'kid-walk{i}' for i in range(1, 9)}

# **מבטי גב ששמם נשמע צדדי.** ההיוריסטיקה מודדת עור מול שיער בפרופיל; לגב של ראש אין
# חזית, ולכן כל תשובה שהיא נותנת עליו היא רעש. שני המקרים כאן אינם שגויים על הדיסק:
#
#   * `ofir90-walk` — the delivery drew Ofir walking away and named the file like a side
#     pose. Nothing turns it, and a rename would break the manifest for no gain.
#   * `pogi-w1…w8` — the eight-frame cycle. Looked at on 16.9.2026: no face, no badge,
#     the shirt plain across the shoulders, `pogi-back` matching them pose for pose. They
#     are the child walking INTO the picture, and since 16.9.2026 that is the heading
#     `WorldScene` plays them on (`KID_WALK_AWAY` / `WALK_AWAY` in `runtime/art.ts`).
#     Before that they were mis-registered as the side-on walk, which is what put `pogi-w6`
#     in this script's WRONG column and `pogi-w8` in its UNSURE one — **the script was
#     agreeing that something was out of place without being able to say what.** It is not
#     the instrument that diagnoses a back view; it is the instrument that protects a
#     profile, so a back view belongs on this list rather than in its verdict.
BACKS = {'ofir90-walk', *(f'pogi-w{i}' for i in range(1, 9))}


def main():
    wrong, unsure, ok = [], [], 0
    for path in sorted(glob.glob(os.path.join(ART, '*.webp'))):
        if not PROFILE.search(os.path.basename(path)):
            continue
        name = os.path.basename(path)[:-5]
        if name in DEAD or name in BACKS:
            continue
        who = facing(path)
        if who is None:
            unsure.append(name)
        elif who == 'right':
            ok += 1
        else:
            wrong.append(name)
    print(f'{ok} face right · {len(unsure)} unsure · {len(wrong)} face LEFT')
    for name in unsure:
        print(f'  unsure  {name}')
    for name in wrong:
        print(f'  WRONG   {name}  — mirror it on ingest, not at runtime')
    return 1 if wrong else 0


if __name__ == '__main__':
    sys.exit(main())
