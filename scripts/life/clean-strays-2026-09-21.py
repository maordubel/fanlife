"""
שאריות של השכן — ניקוי חלקי דמויות אחרות מתוך גזירות (21.9.2026).

בצילום של הבית של 2021 עמד ליד הרגל של קובי כתם שחור. הוא לא היה בציור ולא בחדר:
הוא היה **בקובץ** — `kobi90-stand` נגזר מגיליון, והראש של הדמות שמתחתיו בגיליון
נכנס לפינת המסגרת. אותה צורה בדיוק נמצאה בשמונים ושתיים גזירות: כפות רגליים של
הדמות שמעל (`pogi90-b*`, `pogiIDF-b*`), ראשים ושוליים של צעיף מהשורה שמתחת, כף
יד של השכן מהצד, ו-`teacher-lean` שהכיל **שתי מורות** — הנשענת וההולכת.

**מה נחשב שארית:** רכיב אלפא שאינו הגוף הגדול, **נוגע בשפת המסגרת**, ורחוק ממנו
ביותר משישה פיקסלים. זה מה שמבדיל ראש של שכן מכדור שהילד בועט בו (`efi-kick`,
`hero80-ball`), מכדורסל באוויר (`hooperRed-shoot`) ומהתוף של מלמד (`melamed-lean`) —
שלושתם רכיבים נפרדים שהם חלק מהתמונה, והם ברשימה `KEEP` בשמם, אחרי שנבדקו בעין
(גיליון שבו כל שארית צבועה באדום). מה שנראה בגיליון כמו הכוס של פרדי בשפה הימנית
היה כף היד של השכן, והכוס שלו בידו השמאלית — לכן אין לו יוצא מן הכלל.

**ואחרי הניקוי — חיתוך מלמטה ומהצדדים.** שארית בתחתית המסגרת היא גם שקר על הגובה
(כלל 73): הרגליים לא היו בשורה האחרונה, ולכן הדמות ריחפה מעל הרצפה בגובה הראש של
השכן — `kobi90-back` ב-5%, `elimelech-point` ב-7%, `hero90-ball` ב-12%. החיתוך מחזיר
את הרגליים לשורה התחתונה. **את החלק העליון לא חותכים:** תנוחת ישיבה או כריעה נמדדת
מול המשבצת של הגיליון (`heights.ts` ממפה את גובה המסגרת לגובה האדם), ולחתוך את האוויר
מעל כורע היה מצייר אותו בגובה של עומד.

הכתיבה היא PNG בתיקייה, והממיר היחיד (`to-webp-2026-09-13.py`, כלל 61) הוא מי
שהופך אותו חזרה ל-WebP, סופר צהוב על הפענוח ומעדכן את המניפסטים (`--index`).

    python3 scripts/life/clean-strays-2026-09-21.py          # מנקה, כותב PNG
    python3 scripts/life/to-webp-2026-09-13.py               # ממיר
    python3 scripts/life/to-webp-2026-09-13.py --index       # מודד ומעדכן
    python3 scripts/life/clean-strays-2026-09-21.py --check  # יוצא 1 אם נשארה שארית
"""
from __future__ import annotations

import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ART = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'life', 'art'))
SKIP_PREFIX = ('prop', 'overlay', 'street', 'em', 'pen-', 'face', 'soldierKit')
# props are skipped as a class (a string of pennants IS several pieces) and cleaned by name,
# each one looked at: a strip of a second scarf, the corner of a neighbour, a white box
PROPS = {'propScarfRed', 'propPennant', 'propPack90', 'propScarf80', 'propBall80', 'propMatchbox', 'propBadges'}
KEEP = {'efi-kick', 'hero80-ball', 'hooperRed-shoot', 'melamed-lean'}
MIN_AREA = 80
MIN_GAP = 6


def strays(arr: np.ndarray, key: str) -> list[int]:
    a = arr[..., 3] > 40
    H, W = a.shape
    lab, n = ndimage.label(a)
    if n < 2:
        return []
    sizes = ndimage.sum(a, lab, range(1, n + 1))
    main = int(np.argmax(sizes)) + 1
    gap = ndimage.distance_transform_edt(lab != main)
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab), start=1):
        if i == main or sizes[i - 1] < (40 if key in PROPS else MIN_AREA):
            continue
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        edge = y0 == 0 or x0 == 0 or y1 == H or x1 == W
        if edge and gap[lab == i].min() > MIN_GAP:
            out.append(i)
    return out, lab


def main() -> int:
    dry = '--dry' in sys.argv or '--check' in sys.argv
    done = []
    for f in sorted(os.listdir(ART)):
        if not f.endswith('.webp'):
            continue
        key = f[:-5]
        if (key.startswith(SKIP_PREFIX) and key not in PROPS) or key in KEEP:
            continue
        path = os.path.join(ART, f)
        with Image.open(path) as im:
            if im.mode != 'RGBA' or im.size[0] * im.size[1] > 1_500_000:
                continue
            arr = np.array(im)
        # the pennant carries an unkeyed white corner from its sheet: flat white that touches
        # the frame edge is paper behind it, not the pennant (which is cream and shaded)
        if key == 'propPennant':
            white = (arr[..., :3].min(axis=2) > 236) & (arr[..., 3] > 40)
            lab_w, _ = ndimage.label(white)
            edge_ids = set(np.unique(np.concatenate([lab_w[0], lab_w[-1], lab_w[:, 0], lab_w[:, -1]]))) - {0}
            if edge_ids:
                arr[np.isin(lab_w, list(edge_ids)), 3] = 0
                done.append(f'{key}: white corner keyed')
        found = strays(arr, key)
        if not found or not found[0]:
            if key == 'propPennant' and not dry and any(d.startswith(key) for d in done):
                Image.fromarray(arr, 'RGBA').save(os.path.join(ART, f'{key}.png'))
                os.remove(path)
            continue
        ids, lab = found
        # a stray and the soft edge around it: grow by two pixels, never into the body
        kill = ndimage.binary_dilation(np.isin(lab, ids), iterations=2) & (lab != (int(np.argmax(ndimage.sum(arr[..., 3] > 40, lab, range(1, lab.max() + 1)))) + 1))
        arr[kill, 3] = 0
        ys, xs = np.nonzero(arr[..., 3] > 0)
        # the top of the frame stays: a seated or crouched pose is sized off the canvas of its
        # sheet cell (`heights.ts` maps the frame height to the person), and cutting the room
        # above a crouching man would draw him standing-tall. The bottom and the sides go.
        box = (int(xs.min()), 0, int(xs.max()) + 1, int(ys.max()) + 1)
        before = (arr.shape[1], arr.shape[0])
        out = Image.fromarray(arr, 'RGBA').crop(box)
        done.append(f'{key} {before[0]}×{before[1]}→{out.size[0]}×{out.size[1]} (−{len(ids)})')
        if not dry:
            out.save(os.path.join(ART, f'{key}.png'))
            os.remove(path)
    print('\n'.join(done))
    if '--check' in sys.argv:
        print('אין שאריות' if not done else f'✗ {len(done)} גזירות עם שאריות של שכן')
        return 1 if done else 0
    print(f'{len(done)} גזירות נוקו' + (' (יבש)' if dry else ''))
    return 0


if __name__ == '__main__':
    sys.exit(main())
