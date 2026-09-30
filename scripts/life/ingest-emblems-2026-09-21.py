#!/usr/bin/env python3
"""
שנים־עשר סמלי מערכת — לא פעולות, אלא מה שהחיים האלה מודדים (21.9.2026).

    python3 scripts/life/ingest-emblems-2026-09-21.py

מאור מסר גיליון שני, ומה שיש בו הוא **מחלקה אחרת** מזו של 20.9. הסמלים של אתמול הם
פעולות — דבר, הסתכל, קח — והם יושבים על כפתור. אלה שנים־עשר **מצבים**: ארנק, ברק,
מסכה, לב עם צלב, מגן עם צעיף, לחיצת יד, שני לבבות, הורה וילד, ספר, מגפון, גלובוס
ותיק עבודה. הם לא נלחצים; הם אומרים מה המשחק סופר.

לכן `EMBLEM` היא מחלקה נפרדת מ-`ICON` ב-`runtime/art.ts`, ולא הרחבה שלה. שתי מחלקות
כי יש שתי שאלות: *"מה קורה אם אלחץ"* מול *"מה יש לי"*, ומפתח שעונה על שתיהן ייקרא
בטעות בשתי המשמעויות (כלל 59 בכיוון ההפוך — שם אחד לשני מושגים הוא אותו פגם).

**שתי הבדלות טכניות מהגיליון הקודם, ושתיהן נמדדו ולא שוערו:**

1. **אין מסך ירוק.** הקובץ מגיע RGBA עם אלפא אמיתית (34% מהפיקסלים אטומים לגמרי),
   ולכן אין `key_flat` ואין `despill` — קילוף רקע שאינו קיים היה אוכל את השוליים
   הכהים של הסמלים עצמם.
2. **הרשת אינה נקראת מ-`any()`.** ההטלה הבינארית מיזגה את הארנק והברק לעמודה אחת,
   כי בין שניהם יש פחות מהרווח שהוגדר ולשניהם יש שוליים רכים. הספירה היא **כמה דיו
   בעמודה** (`alpha > 128`, יותר מסף), וזה מפריד 4×3 נקי. כמו קודם: רשת שלא נמדדה
   כ-12 **מפילה את הסקריפט** במקום לחתוך שנים־עשר ריבועים במקום הלא נכון (כלל 73).
"""
import json
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'scripts', 'life'))

from importlib import import_module

icons = import_module('ingest-icons-2026-09-20')
deyellow, encode_measured, runs = icons.deyellow, icons.encode_measured, icons.runs

OUT = os.path.join(ROOT, 'public/life/art')
SIZE = 256

# שמאל→ימין, מעלה→מטה. השם הוא מה שהסמל **מצייר**, לא מה שהוא מודד היום: מפתח שנקרא
# על שם המדד ייאלץ להשתנות ביום שבו מישהו יציג אותו ליד מדד אחר (כלל 45, בצורתו לנכסים).
NAMES = [
    'emWallet', 'emEnergy', 'emMask', 'emHealth',
    'emScarf', 'emHands', 'emHearts', 'emChild',
    'emBook', 'emMegaphone', 'emGlobe', 'emCase',
]


def measured_grid(alpha: np.ndarray, threshold: int = 4, gap: int = 4):
    """עמודה היא מתיחה של x שיש בה יותר מ-`threshold` פיקסלי דיו, ושורה אותו דבר ב-y."""
    ink = alpha > 128
    return runs(ink.sum(axis=0) > threshold, gap), runs(ink.sum(axis=1) > threshold, gap)


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'brand/source/life-emblems-2026-09-21.png')
    if not os.path.exists(src):
        print(f'FAIL — אין קובץ מקור: {src}')
        return 2

    sheet = Image.open(src).convert('RGBA')
    alpha = np.asarray(sheet)[..., 3]
    opaque = float((alpha > 200).mean())
    if opaque < 0.05:
        print(f'FAIL — {opaque:.1%} בלבד אטום. זה לא גיליון עם אלפא, ואין כאן מפתח מסך ירוק.')
        return 1

    cols, rows = measured_grid(alpha)
    print(f'רשת שנמדדה: {len(cols)} עמודות × {len(rows)} שורות · אלפא אטומה {opaque:.1%}')
    if len(cols) * len(rows) != len(NAMES):
        print(f'FAIL — הרשת שנמדדה ({len(cols)}×{len(rows)}) אינה {len(NAMES)} סמלים. לא נחתך דבר.')
        return 1

    os.makedirs(OUT, exist_ok=True)
    written, n = [], 0
    for (y0, y1) in rows:
        for (x0, x1) in cols:
            cell = sheet.crop((x0, y0, x1 + 1, y1 + 1))
            box = cell.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
            if box:
                cell = cell.crop(box)
            # ריבוע, ואז הקטנה — סמל שנמתח אינו סמל. הרקע שקוף, אז הריפוד אינו נראה.
            side = max(cell.size)
            square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
            square.paste(cell, ((side - cell.width) // 2, (side - cell.height) // 2))
            small = square.resize((SIZE, SIZE), Image.LANCZOS)
            # ...והניקוי **אחרי** ההקטנה, כי LANCZOS ממצע שוליים לתוך הפס (כלל 44)
            clean = deyellow(small)
            name = NAMES[n]
            stats = encode_measured(clean, os.path.join(OUT, f'{name}.webp'))
            written.append((name, stats))
            print(f"  {name:14} {stats['w']}×{stats['h']}  {stats['bytes']:>7,} bytes  "
                  f"צהוב {stats['yellowPx']}  [{stats['mode']}]")
            n += 1

    bad = [name for name, s in written if s['yellowPx'] > 0]
    if bad:
        print(f'FAIL — נשאר צהוב ב: {", ".join(bad)}')
        return 1

    # רישום ב-`sheets.json` — **בתוספת טקסטואלית בלבד**, וזה לא קפדנות.
    #
    # `json.load` + `json.dump` על הקובץ הזה כותב מחדש 3,193 שורות: הזחה אחרת, סדר
    # אחר, ובגרסה של `index-sheets.py` גם **מחיקת `source` מכל 474 השורות הקיימות**
    # (נתפס ב-20.9.2026). שורה קיימת שלא השתנתה צריכה להישאר בייט-זהה, אחרת כל דלתא
    # נושאת את כל התיקייה ואי-אפשר לראות בה מה באמת זז (כלל 51).
    path = os.path.join(OUT, 'sheets.json')
    with open(path, encoding='utf-8') as fh:
        text = fh.read()
    rows = []
    for name, s in written:
        if f'"{name}"' in text:
            print(f'FAIL — {name} כבר רשום ב-sheets.json. לא נכתב דבר.')
            return 1
        rows.append(
            f' "{name}": {{\n'
            f'  "w": {s["w"]},\n'
            f'  "h": {s["h"]},\n'
            f'  "bytes": {s["bytes"]},\n'
            f'  "yellowLeft": {s["yellowPx"]},\n'
            f'  "source": "life-emblems-2026-09-21"\n'
            f' }}'
        )
    cut = text.rstrip().rfind('\n}')
    text = text[:cut] + ',\n' + ',\n'.join(rows) + '\n}\n'
    json.loads(text)  # אם התוספת שברה JSON — נופלים כאן, לא בדפדפן של מישהו
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(text)

    print(f'\nנכתבו {len(written)} סמלים · אפס צהוב על כל אחד, נמדד על הבייטים ששמורים')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
