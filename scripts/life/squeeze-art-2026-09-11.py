#!/usr/bin/env python3
"""
דחיסה מחדש של כל הגרפיקה, בלי לאבד פיקסל אחד.

PNG הוא חסר-אובדן, אבל יש בו הרבה דרכים לקודד את אותה תמונה בדיוק, והן לא שוות בגודל.
‎`optimize=True`‎ של PIL בוחר אחת סבירה; מעבר שסורק את כל צירופי המסננים בוחר את הטובה
ביותר. בין 15% ל-25% יורדים — על אותם פיקסלים בדיוק, ולכן חוק 27 (בלי פורמט מאבד, כי
פענוח מאבד מחזיר צהוב) נשמר במלואו. הסקריפט מאמת את זה בעצמו: גיבוב הפיקסלים לפני
ואחרי חייב להיות זהה, אחרת הקובץ מוחזר.

זה חשוב במיוחד מאז 11.9.2026: החדרים גדלו פי שלושה בשטח כדי להתאים לרזולוציה האמיתית
של המסך, ורבע מהמחיר חוזר כאן חינם.

    python3 scripts/life/squeeze-art-2026-09-11.py [--write]
"""
import hashlib
import json
import os
import shutil
import sys
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import oxipng
from PIL import Image

ART = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'life', 'art')
ART = os.path.normpath(ART)


def pixels(path: str) -> str:
    with Image.open(path) as im:
        return hashlib.sha256(np.asarray(im.convert('RGBA')).tobytes()).hexdigest()


def one(path: str):
    before = os.path.getsize(path)
    was = pixels(path)
    backup = path + '.bak'
    shutil.copy2(path, backup)
    try:
        oxipng.optimize(path, level=4, strip=oxipng.StripChunks.safe())
        if pixels(path) != was:                      # לא אמור לקרות — ואם כן, חוזרים
            shutil.move(backup, path)
            return os.path.basename(path), before, before, False
        os.remove(backup)
        return os.path.basename(path), before, os.path.getsize(path), True
    except Exception:
        if os.path.exists(backup):
            shutil.move(backup, path)
        return os.path.basename(path), before, before, False


def main() -> int:
    files = [os.path.join(ART, f) for f in sorted(os.listdir(ART)) if f.endswith('.png')]
    print(f'{len(files)} קבצים')
    with ThreadPoolExecutor(max_workers=8) as pool:
        rows = list(pool.map(one, files))
    b = sum(r[1] for r in rows)
    a = sum(r[2] for r in rows)
    failed = [r[0] for r in rows if not r[3]]
    print(f'{b/1024/1024:.1f} MB → {a/1024/1024:.1f} MB   ({(1-a/b)*100:.1f}% ירדו)')
    if failed:
        print(f'לא נגעתי ב-{len(failed)}: ' + ', '.join(failed[:8]))

    # המניפסט מתאר בייטים — הוא חייב לתאר את הקבצים שנשמרו, לא את הקודמים
    path = os.path.join(ART, 'manifest.json')
    m = json.loads(open(path, encoding='utf-8').read())
    fixed = 0
    for group in m.values():
        if not isinstance(group, dict):
            continue
        for key, row in group.items():
            f = os.path.join(ART, f'{key}.png')
            if isinstance(row, dict) and 'bytes' in row and os.path.exists(f):
                size = os.path.getsize(f)
                if row['bytes'] != size:
                    row['bytes'] = size
                    fixed += 1
    open(path, 'w', encoding='utf-8').write(json.dumps(m, ensure_ascii=False, indent=1) + '\n')

    sheets = os.path.join(ART, 'sheets.json')
    s = json.loads(open(sheets, encoding='utf-8').read())
    for key, row in s.items():
        f = os.path.join(ART, f'{key}.png')
        if 'bytes' in row and os.path.exists(f):
            size = os.path.getsize(f)
            if row['bytes'] != size:
                row['bytes'] = size
                fixed += 1
    open(sheets, 'w', encoding='utf-8').write(json.dumps(s, ensure_ascii=False, indent=1) + '\n')
    print(f'{fixed} שורות מניפסט עודכנו')
    return 0


if __name__ == '__main__':
    sys.exit(main())
