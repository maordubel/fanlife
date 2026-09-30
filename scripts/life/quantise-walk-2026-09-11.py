#!/usr/bin/env python3
"""
מחזור ההליכה של פוגי — שמונה פריימים שדילגו על הקוונטייזר.

**מה שהתגלה ב-11.9.2026.** כשבדקתי למה חדר השינה עולה 6.4 מגה מצאתי שהרקע הוא 2.2 מהם,
והילד — 4.2. שמונה פריימים, 550 קילובייט כל אחד, בצבע מלא: 76,000 עד 87,000 צבעים
בקובץ. כל שאר 366 הדמויות במשחק נושאות 140 עד 200. הם הגיעו במסירת הגרין־סקרין ונכתבו
ישר לתיקייה בלי לעבור את `build-art.py`, ומאז הם היו הקובץ הכבד ביותר במשחק — כבד יותר
מכל ציור של חדר.

הטיפול הוא בדיוק זה של כל דמות אחרת: 200 צבעים ב-FASTOCTREE, האלפא מוחזרת בנפרד (אוקטרי
ממצע, ושפה של שיער חייבת להישאר שפה), הסרת צהוב, ודחיסה מחדש חסרת אובדן. המידה נשארת
835×1264 — הילד על מסך טלפון הוא כ-950 פיקסלים, ולכן הפריים הזה הוא בדיוק מה שצריך.

    python3 scripts/life/quantise-walk-2026-09-11.py
"""
import importlib.util
import json
import os
import sys

import numpy as np
import oxipng
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.normpath(os.path.join(HERE, '..', '..', 'public', 'life', 'art'))
COLOURS = 200

spec = importlib.util.spec_from_file_location('build_art', os.path.join(HERE, 'build-art.py'))
build_art = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build_art)


def treat(key: str):
    path = os.path.join(ART, f'{key}.png')
    im = Image.open(path).convert('RGBA')
    before = os.path.getsize(path)
    alpha = im.getchannel('A')
    flat = Image.new('RGB', im.size, (0, 0, 0))
    flat.paste(im.convert('RGB'), mask=alpha)
    q = flat.quantize(colors=COLOURS, method=Image.Quantize.FASTOCTREE).convert('RGB')
    out = Image.merge('RGBA', (*q.split(), alpha))
    # הסרת צהוב על ערוצי הצבע בלבד; האלפא חוזרת אחריה, כי היא לא צבע
    clean, moved = build_art.deyellow(out)
    out = Image.merge('RGBA', (*clean.convert('RGB').split(), alpha))
    out.save(path, optimize=True)
    oxipng.optimize(path, level=4, strip=oxipng.StripChunks.safe())
    after = os.path.getsize(path)
    colours = len(np.unique(np.asarray(Image.open(path).convert('RGBA'))[..., :3].reshape(-1, 3), axis=0))
    print(f'{key:<10} {before/1024:8.1f} → {after/1024:7.1f} KB  ({(1-after/before)*100:4.1f}% ירדו)  צבעים {colours}  צהוב שהוסט {moved}')
    return key, after


def main() -> int:
    keys = [f'pogi-w{i}' for i in range(1, 9)]
    done = [treat(k) for k in keys]
    sheets_path = os.path.join(ART, 'sheets.json')
    sheets = json.loads(open(sheets_path, encoding='utf-8').read())
    for key, size in done:
        if key in sheets:
            sheets[key]['bytes'] = size
    open(sheets_path, 'w', encoding='utf-8').write(json.dumps(sheets, ensure_ascii=False, indent=1) + '\n')
    print(f'סה״כ אחרי: {sum(s for _, s in done)/1024/1024:.2f} MB')
    return 0


if __name__ == '__main__':
    sys.exit(main())
