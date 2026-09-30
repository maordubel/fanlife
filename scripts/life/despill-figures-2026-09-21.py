#!/usr/bin/env python3
"""
ירוק מתחת לישיבה — despill לגזירות מהמסך הירוק (21.9.2026).

כשקובי יושב בכורסה ב-1991 ובסלון של 2019, מתחת לירכיים שלו נשאר כתם ירוק: השרפרף
שעליו הצטלם מול המסך הירוק. המפתח הוריד את הרקע, אבל מה שבצל — השרפרף, הצל שלו על
הרצפה, השוליים של המכנסיים — קיבל ירוק ממוחזר (spill) ונשאר חצי-שקוף וירקרק. על ציור
של סלון זה נראה כמו כרית ירוקה מתחת לאבא.

הסקריפט מוריד את הירוק רק בגזירות שנקלטו ממסך ירוק ושאין בהן ירוק אמיתי — ובשמן
(`FIGURES`), אחרי שנבדקו בעין. מלמד (מכנסי זית), `youngA4` ו-`adultB4` (חולצות טורקיז)
והחיילים (מדי זית) אינם ברשימה, בכוונה.

    python3 scripts/life/despill-figures-2026-09-21.py
    python3 scripts/life/to-webp-2026-09-13.py && python3 scripts/life/to-webp-2026-09-13.py --index
"""
import os
import sys

import numpy as np
from PIL import Image

ART = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'life', 'art'))
FIGURES = [
    'kobi90', 'kobi90-stand', 'kobi90-arms', 'kobi90-side', 'kobi90-bag', 'kobi90-cheer', 'kobi90-lean',
    'kobi90-sitA', 'kobi90-sitB', 'kobi90-paper', 'kobi90-point',
    'amit90', 'amit90-3q', 'amit90-point', 'amit90-cross', 'ofir90-point', 'ofir90-smoke',
    'pogi-side', 'pogi-3q', 'keren90-sit',
]


def despill(arr: np.ndarray) -> tuple[np.ndarray, int]:
    a = arr.astype(np.float32)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    cap = np.maximum(r, b)
    over = (g > cap + 4) & (al > 0)
    # the green goes back to the level of the other two channels
    g2 = np.where(over, cap + (g - cap) * 0.15, g)
    # and what is strongly green AND half transparent is the seat or its shadow: it goes
    strong = over & (g - cap > 22) & (al < 235)
    al2 = np.where(strong, al * 0.25, al)
    out = np.dstack([r, g2, b, al2]).clip(0, 255).astype(np.uint8)
    return out, int(over.sum())


def main() -> int:
    for key in FIGURES:
        path = os.path.join(ART, f'{key}.webp')
        if not os.path.exists(path):
            print(f'  — {key}: אין קובץ')
            continue
        arr = np.array(Image.open(path).convert('RGBA'))
        out, n = despill(arr)
        Image.fromarray(out, 'RGBA').save(os.path.join(ART, f'{key}.png'))
        os.remove(path)
        print(f'  {key:16s} {n} פיקסלים')
    return 0


if __name__ == '__main__':
    sys.exit(main())
