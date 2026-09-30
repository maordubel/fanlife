#!/usr/bin/env python3
"""
קו האופק ושדה הראייה של חמש תחנות חזית בלומפילד — נמדדים מהתמונות, לא מוצהרים.

**קו האופק.** כל הקווים המקבילים ברחוב — אבני השפה, קו הגג של היציע, המעקות, החזיתות
משמאל — נפגשים בתמונה בנקודה אחת. הנקודה הזאת יושבת בגובה העין של הצלם, ולכן ה-y שלה
**הוא** קו האופק. מוצאים אותה ב-RANSAC על מקטעי קו, ולא בעין.

**שדה הראייה.** שתי משפחות של קווים שניצבות זו לזו במציאות נותנות שתי נקודות מגוז,
ואורך המוקד נובע מהן בזהות ‎f² = −(v₁−p)·(v₂−p)‎. זאת לא הערכה — זאת גיאומטריה. המשפחה
השנייה כאן היא הצלעות של היציע, שרצות לרוחב הרחוב, ולכן המגוז שלה רחוק מימין.

מה שהמדידה החזירה, 08.09.2026 — והיא דטרמיניסטית, כי היא סורקת את כל זוגות הקווים
ולא מגרילה מהם:

    תחנה   אופק (שבר מהגובה)   שדה ראייה
    1      0.5964              —
    2      0.5784              —
    3      0.5918              103.8°
    4      0.6404               88.1°
    5      0.5914              —

ארבעה אופקים בתוך שני אחוזים זה מזה, והרביעי גבוה בארבעה. שדה הראייה נלקח כממוצע שתי
המדידות התקפות, ‎96°‎, ומשמש לכל חמש התחנות: מצלמה אחת, עדשה אחת.
"""
from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np

SRC = Path('/mnt/user-data/uploads/THE-WORKER-BLOOMFIELD-PACK/THE-WORKER-BLOOMFIELD-FACADE/01-panoramas')


def segments(img: np.ndarray, min_len: float = 35.0) -> np.ndarray:
    """מקטעי קו ארוכים, בלי האנכיים (שאין בהם מידע — הם נשארים אנכיים) ובלי האופקיים
    הגמורים (שהמגוז שלהם באינסוף)."""
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    lsd = cv2.createLineSegmentDetector(cv2.LSD_REFINE_ADV)
    found, _, _, _ = lsd.detect(g)
    l = found.reshape(-1, 4)
    l = l[np.linalg.norm(l[:, 2:] - l[:, :2], axis=1) > min_len]
    ang = (np.degrees(np.arctan2(l[:, 3] - l[:, 1], l[:, 2] - l[:, 0])) + 180) % 180
    keep = ((ang < 52) | (ang > 128)) & (np.abs(np.sin(np.radians(ang))) > 0.012)
    return l[keep]


def lines(l: np.ndarray) -> np.ndarray:
    a = np.c_[l[:, 0], l[:, 1], np.ones(len(l))]
    b = np.c_[l[:, 2], l[:, 3], np.ones(len(l))]
    L = np.cross(a, b)
    return L / np.linalg.norm(L[:, :2], axis=1, keepdims=True)


def vanishing(L: np.ndarray, seg: np.ndarray, w: int, h: int, window=None, tol_deg=0.9):
    """
    **כל** זוגות הקווים, לא דגימה. מאה־ומשהו מקטעים הם כמה אלפי זוגות בלבד, ולכן אין
    שום סיבה להגריל — והתוצאה יוצאת זהה בכל הרצה, מה שאי אפשר לומר על RANSAC.

    השארית היא זוויתית ולא אלגברית: כמה מעלות חסרות למקטע כדי להצביע על הנקודה. כך
    מקטע קצר ליד הנקודה לא מקבל משקל של מקטע ארוך שמכוון אליה מרחוק.
    """
    n = len(L)
    mid = (seg[:, :2] + seg[:, 2:]) / 2
    dirn = seg[:, 2:] - seg[:, :2]
    length = np.linalg.norm(dirn, axis=1)
    dirn = dirn / length[:, None]
    tol = np.radians(tol_deg)

    def score(v):
        to = v[None, :2] - mid
        d = np.linalg.norm(to, axis=1)
        to = to / np.maximum(d, 1e-6)[:, None]
        cos = np.abs((to * dirn).sum(1))
        err = np.arccos(np.clip(cos, -1, 1))
        m = err < tol
        return float((length[m]).sum()), m

    best, mask, weight = None, None, -1.0
    for i in range(n):
        for j in range(i + 1, n):
            v = np.cross(L[i], L[j])
            if abs(v[2]) < 1e-9:
                continue
            v = v / v[2]
            if window is not None:
                x0, x1, y0, y1 = window
                if not (x0 <= v[0] <= x1 and y0 <= v[1] <= y1):
                    continue
            elif abs(v[0]) > 8 * w or not (0.3 * h < v[1] < 0.9 * h):
                continue
            wgt, m = score(v)
            if wgt > weight:
                weight, best, mask = wgt, v[:2], m
    if best is None:
        return None, None, 0.0
    # ליטוש: ריבועים פחותים על כל ה-inliers, במשקל אורך
    A = L[mask][:, :2] * length[mask][:, None]
    b = -L[mask][:, 2] * length[mask]
    x = np.linalg.lstsq(A, b, rcond=None)[0]
    return x, mask, weight


def main() -> int:
    print(f'{"station":>8}  {"horizon":>8}  {"street VP":>18}  {"cross VP":>18}  {"hFov":>7}')
    horizons, fovs = [], []
    for i in range(1, 6):
        img = cv2.imread(str(SRC / f'bloom-facade-0{i}.png'))
        h, w = img.shape[:2]
        seg = segments(img)
        L = lines(seg)
        v1, m1, c1 = vanishing(L, seg, w, h)
        v2, _, c2 = vanishing(L[~m1], seg[~m1], w, h, window=(1.7 * w, 30 * w, 0.35 * h, 0.85 * h))
        horizons.append(v1[1] / h)
        fov = ''
        if v2 is not None and abs(v2[1] - v1[1]) < 0.04 * h and c2 > 220:
            p = np.array([w / 2, (v1[1] + v2[1]) / 2])
            d = float(np.dot(v1 - p, v2 - p))
            if d < 0:
                f = np.sqrt(-d)
                deg = 2 * np.degrees(np.arctan(w / 2 / f))
                fovs.append(deg)
                fov = f'{deg:.1f}°'
        print(f'{i:>8}  {v1[1]/h:>8.4f}  {v1[0]:8.1f},{v1[1]:7.1f}  '
              f'{v2[0]:9.1f},{v2[1]:7.1f}  {fov:>7}')
    print()
    print(f'horizon  mean={np.mean(horizons):.4f}  spread={np.ptp(horizons):.4f}')
    if fovs:
        print(f'hFov     mean={np.mean(fovs):.1f}°  from {len(fovs)} station(s)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
