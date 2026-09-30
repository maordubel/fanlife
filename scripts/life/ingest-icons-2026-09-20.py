#!/usr/bin/env python3
"""
שנים־עשר סמלי אינטראקציה — מהמסך הירוק לפעולה שיש לה שם (20.9.2026).

    python3 scripts/life/ingest-icons-2026-09-20.py

מאור מסר גיליון של שנים־עשר סמלים עגולים על ירוק, ושורה אחת שהיא ההנחיה כולה:
*"כדאי להצמיד לכל סמל תווית עברית קצרה, כדי שהפעולה תהיה ברורה מיד."* הסקריפט חותך
אותם; התווית חיה ב-`messages/he.life.json` כמו כל מילה במשחק (כלל 10).

**הרשת נמדדת ולא מוקלדת.** ארבע עמודות על שלוש שורות זה מה שהעין רואה, אבל
`384×341` הוא ניחוש: אחרי הקיהוי נמדדת האלפא בהטלה אופקית ואנכית, והגבולות נלקחים
מהרווחים שנמצאו. גיליון שיגיע מחר עם סמל נוסף ייחתך נכון בלי לגעת בשורה — וגיליון
שהרשת שלו לא נקראה **נופל** במקום לחתוך שנים־עשר ריבועים במקום הלא נכון (כלל 73:
כלי שלא יכול להיכשל אינו כלי).

הסדר הוא הסדר שמאור כתב, משמאל לימין ומלמעלה למטה, והוא נשמר כאן במפורש כדי שהחיתוך
והשמות לא יוכלו להיפרד.
"""
import io
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'scripts', 'life'))

OUT = os.path.join(ROOT, 'public/life/art')

# שמאל→ימין, מעלה→מטה, במילים של מאור (20.9.2026)
NAMES = [
    'iconTalk', 'iconLook', 'iconTake', 'iconWalk',
    'iconMap', 'iconTasks', 'iconBag', 'iconPhone',
    'iconTime', 'iconCheckpoint', 'iconSaved', 'iconSettings',
]


def yellow_mask(rgb: np.ndarray) -> np.ndarray:
    """הפס הקנוני של `lib/isYellow.ts` — hue 38–70, S ≥ 0.35, V ≥ 0.35."""
    a = rgb.astype(np.float32) / 255.0
    mx, mn = a.max(2), a.min(2)
    d = mx - mn
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    h = np.zeros_like(mx)
    m = d > 1e-6
    i = (mx == r) & m
    h[i] = ((g - b)[i] / d[i]) % 6
    i = (mx == g) & m
    h[i] = ((b - r)[i] / d[i]) + 2
    i = (mx == b) & m
    h[i] = ((r - g)[i] / d[i]) + 4
    h *= 60
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    return (h >= 38) & (h <= 70) & (s >= 0.35) & (mx >= 0.35)


def key_flat(im, near=58, far=104):
    """מפתח לפי הרקע עצמו — the same distance keyer `ingest-2026-09.py` uses, vectorised."""
    rgb = np.asarray(im.convert('RGB')).astype(np.float32)
    h, w, _ = rgb.shape
    corners = np.array([rgb[1, 1], rgb[1, w - 2], rgb[h - 2, 1], rgb[h - 2, w - 2]])
    bg = np.median(corners, axis=0)
    d = np.sqrt(((rgb - bg) ** 2).sum(axis=2))
    alpha = np.clip((d - near) / max(1, far - near), 0, 1) * 255
    out = np.dstack([rgb.astype(np.uint8), alpha.astype(np.uint8)])
    return Image.fromarray(out, 'RGBA')


def despill(im):
    """הורדת הירוק — where green leads both other channels, pull it back to their level."""
    a = np.asarray(im).astype(np.int16)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    cap = np.maximum(r, b)
    over = (g > cap) & (al > 0)
    g = np.where(over, cap, g)
    return Image.fromarray(np.dstack([r, g, b, al]).astype(np.uint8), 'RGBA')


def deyellow(im):
    """
    מנקים בפס רחב יותר מהפס שסופרים בו — כלל 44 וכלל 61, באותו היגיון.

    הסמלים שחורים, שמנת ואדומים; הצהוב כאן אינו צבע שמישהו צייר אלא **שוליים**: פיקסל
    אחד שבו אדום נפגש בשמנת נוחת בתוך הפס, וההקטנה ל-256 מייצרת עוד כאלה. לכן הניקוי
    רץ **אחרי** ההקטנה (כלל 44) ועל פס רחב מזה שנספר (hue 34–74 ב-S 0.30 מול 38–70
    ב-0.35), כדי שיישאר מרווח לקידוד ולדפדפן.

    הטיפול הוא סיבוב גוון ל-26° — היחס שהתג עצמו קיבל — כי סמל הוא חפץ מצויר ולא מקום,
    וכלל 61 שומר את ההכהיה הרכה לרקעים.
    """
    a = np.asarray(im).astype(np.float32)
    rgb, al = a[..., :3] / 255.0, a[..., 3]
    mx, mn = rgb.max(2), rgb.min(2)
    d = mx - mn
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.zeros_like(mx)
    m = d > 1e-6
    i = (mx == r) & m
    h[i] = ((g - b)[i] / d[i]) % 6
    i = (mx == g) & m
    h[i] = ((b - r)[i] / d[i]) + 2
    i = (mx == b) & m
    h[i] = ((r - g)[i] / d[i]) + 4
    h *= 60
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    hit = (h >= 34) & (h <= 74) & (s >= 0.30) & (mx >= 0.30) & (al > 0)
    if not hit.any():
        return im
    # rotate the hue to 26 at the same saturation and value — the badge's own treatment
    v, sat = mx, s
    hh = np.where(hit, 26.0, h) / 60.0
    ii = np.floor(hh).astype(np.int32) % 6
    f = hh - np.floor(hh)
    p_, q_, t_ = v * (1 - sat), v * (1 - sat * f), v * (1 - sat * (1 - f))
    out = np.zeros_like(rgb)
    for k, (rr, gg, bb) in enumerate([(v, t_, p_), (q_, v, p_), (p_, v, t_), (p_, q_, v), (t_, p_, v), (v, p_, q_)]):
        sel = ii == k
        out[..., 0] = np.where(sel, rr, out[..., 0])
        out[..., 1] = np.where(sel, gg, out[..., 1])
        out[..., 2] = np.where(sel, bb, out[..., 2])
    fixed = np.where(hit[..., None], out, rgb)
    return Image.fromarray(np.dstack([(fixed * 255).astype(np.uint8), al.astype(np.uint8)]), 'RGBA')


def runs(mask, gap):
    """Contiguous stretches of True, merging anything closer together than `gap`."""
    idx = np.flatnonzero(mask)
    if idx.size == 0:
        return []
    out = [[int(idx[0]), int(idx[0])]]
    for i in idx[1:]:
        if i - out[-1][1] <= gap:
            out[-1][1] = int(i)
        else:
            out.append([int(i), int(i)])
    return out


def encode_measured(im, path):
    """
    מקודדים, **מפענחים את הבייטים ששמורים**, וסופרים עליהם — וזה מה שמתיר פורמט מאבד.

    כלל 61 בדיוק כלשונו: הפחד שכלל 27 נכתב עליו הוא ש**פענוח ממציא צהוב**, וזה נכון.
    התשובה היא למדוד את הפענוח ולא להימנע מהפורמט — ולכן אם נשאר צהוב אחרי קידוד
    מאבד, הקובץ נשמר **חסר אובדן**, שבו הפענוח מדויק והמספר חייב להיות אפס.
    """
    def roll(lossless):
        buf = io.BytesIO()
        if lossless:
            im.save(buf, 'WEBP', lossless=True, quality=100, method=6)
        else:
            im.save(buf, 'WEBP', quality=92, method=6)
        data = buf.getvalue()
        with Image.open(io.BytesIO(data)) as back:
            arr = np.asarray(back.convert('RGBA'))
        # **רק מה שרואים** — `to-webp-2026-09-13.visible_yellow`, מילה במילה: פיקסל שקוף
        # לגמרי נושא ערכי צבע (שאריות המסך הירוק) שלא יהיו על המסך לעולם. לספור אותם
        # פירושו לרדוף אחרי צהוב שאינו קיים, ולהסתיר את מה שכן.
        visible = yellow_mask(arr[..., :3]) & (arr[..., 3] > 8)
        return data, arr, int(visible.sum())

    data, arr, y = roll(False)
    mode = 'lossy'
    if y > 0:
        data, arr, y = roll(True)
        mode = 'lossless'
    with open(path, 'wb') as fh:
        fh.write(data)
    return {'bytes': len(data), 'w': arr.shape[1], 'h': arr.shape[0], 'yellowPx': y, 'mode': mode}


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'brand/source/life-icons-2026-09-20.png')
    if not os.path.exists(src):
        print(f'FAIL — אין קובץ מקור: {src}')
        return 2

    sheet = Image.open(src)
    keyed = despill(key_flat(sheet))
    alpha = np.asarray(keyed)[..., 3] > 40

    # the grid, measured: a column is a stretch of x that has ink in it, a row the same in y
    cols = runs(alpha.any(axis=0), gap=12)
    rows = runs(alpha.any(axis=1), gap=12)
    print(f'רשת שנמדדה: {len(cols)} עמודות × {len(rows)} שורות')
    if len(cols) * len(rows) != len(NAMES):
        print(f'FAIL — הרשת שנמדדה ({len(cols)}×{len(rows)}) אינה {len(NAMES)} סמלים. לא נחתך דבר.')
        return 1

    os.makedirs(OUT, exist_ok=True)
    written = []
    n = 0
    for (y0, y1) in rows:
        for (x0, x1) in cols:
            cell = keyed.crop((x0, y0, x1 + 1, y1 + 1))
            # trim to the icon's own ink, so every file is the disc and nothing else
            box = cell.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
            if box:
                cell = cell.crop(box)
            # ההקטנה קודם, הניקוי אחריה (כלל 44): LANCZOS ממצע שני פיקסלים חוקיים
            # ונוחת בתוך הפס, ולכן ניקוי לפני ההקטנה מנקה את הקובץ הלא-נכון.
            cell = deyellow(cell.resize((256, 256), Image.LANCZOS))
            key = NAMES[n]
            info = encode_measured(cell, os.path.join(OUT, f'{key}.webp'))
            written.append((key, info))
            n += 1

    print('')
    for key, info in written:
        flag = '' if info['yellowPx'] == 0 else f"  ← {info['yellowPx']} פיקסלים בפס"
        tag = '' if info['mode'] == 'lossy' else '  (חסר אובדן)'
        print(f"  {key:16} {info['w']}×{info['h']}  {info['bytes']:>6} bytes{tag}{flag}")
    bad = [k for k, i in written if i['yellowPx'] > 0]
    print('')
    if bad:
        print(f'FAIL — צהוב בפס הקנוני ב-{len(bad)}: {", ".join(bad)}')
        return 1
    print(f'PASS — {len(written)} סמלים, אפס צהוב, נמדד על הבייטים שנשמרו')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
