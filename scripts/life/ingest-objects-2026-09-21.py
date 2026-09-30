#!/usr/bin/env python3
"""
ארבעה גיליונות חפצים שחיכו יום שלם — הקופסה, הטרנזיסטור, הטלפונים, המזוודה (21.9.2026).

    python3 scripts/life/ingest-objects-2026-09-21.py
    python3 scripts/life/to-webp-2026-09-13.py --index

מאור מסר ב-20.9 תשעה גיליונות ("אני מצרף עוד סמלים"). שניים נקלטו — הפעולות (`ICON`)
והמצבים (`EMBLEM`) — ושבעה נשארו בתיקיית ההעלאות. בינתיים הקופסה האדומה עמדה בחדר
כ**ארגז כלים צבוע אדום**, והטרנזיסטור כ**בום-בוקס של 78×54 פיקסלים מלוח קונספט**, ו-
`cut-objects-2026-09-21.py` כתב עליהם "אין ציור שלה" — כשהציור ישב בגיליון הראשון. מאור,
באותו ערב: *"תבדוק בכל החומרים שהעברתי לך ותבדוק שאנחנו לא זולגים באף דבר."*

**ארבעה נקלטים כאן**, כל אחד רשת שנמדדת (לא שמוקלדת) על מסך ירוק שטוח:

  · `keepsakes` — קופסת נעליים אדומה, צעיף סרוג, אלבום, מצלמה, תמונה, כרטיס, מחברת,
    דף מקופל;
  · `daily` — מזוודה, דרכון, זוג כרטיסים, מפתחות, תיק גב, אוזניות, ספל, יומן קיר, לוח
    כתיבה, ארנק, **קופסת פח אדומה** (הקופסה), כבל;
  · `terrace` — תוף, דרבוקה, מגפון, כדור, כדורסל, תיק ספורט, באנר ריק, גביע, גופייה;
  · `devices` — נוקיה, אייפון, טלפון של היום, **טרנזיסטור**, טלוויזיה, שלט, מחשב נייד,
    רשמקול, עיתון.

**ושלושה לא נקלטים, בכוונה, וזה כתוב כדי שלא ייחשב שכחה:**
  · כרטיסים ותוכניות של *"Riverton United F.C."* — מועדון שאינו קיים, באנגלית. שום חפץ
    בחיים האלה אינו של מועדון אחר מבדיון.
  · מזכרות *"GATE 7"* באנגלית (VHS, תג, בולים, "The Chronicle") — אותה סיבה, ועיתון
    באנגלית בקיוסק בדרום תל אביב הוא בדיוק מה שהוצא היום מהקיוסק.
  · מרצ'נדייז *"HAPOEL GATE 7"* — סמל המועדון מצויר בו ביד של מחולל, וכלל 25 אומר שסמל
    מועדון אינו דבר שמקרבים אליו: מדפיסים את היצירה של מאור או משאירים ריק.

הצינור הוא של `ingest-icons-2026-09-20.py`: מפתח לפי מרחק מהרקע, הורדת ירוק, **הקטנה
ואז ניקוי צהוב** (כלל 44), קידוד שנמדד על הבייטים ששמורים (כלל 61). `propRadio` ו-
`propRedBox` **נכתבים מחדש באותו שם**: כל חדר, כל סיום וכל שורת קופסה שכבר מצביעים
עליהם מקבלים את החפץ האמיתי בלי לגעת בשורה.
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'scripts', 'life'))

from importlib import import_module

icons = import_module('ingest-icons-2026-09-20')
key_flat, despill, deyellow, encode_measured = icons.key_flat, icons.despill, icons.deyellow, icons.encode_measured

SRC = os.path.join(ROOT, 'brand/source/life-objects-2026-09-20')
OUT = os.path.join(ROOT, 'public/life/art')
MAX_SIDE = 480
SOURCE = 'maor-2026-09-20-objects'

# שמאל→ימין, מעלה→מטה. השם הוא מה שהחפץ **הוא**, לא איפה הוא בשימוש היום.
SHEETS = {
    # `None` is an object that is measured (the grid has to count it) and NOT shipped: rule 48,
    # no art that nothing places. Each one is named in the comment, so the next use is a name.
    'keepsakes': [
        None, None,  # a red cardboard shoebox, closed and open — the script's box is TIN (below)
        'propScarfKnit',
        'propAlbum', None, None,  # camera · a black print
        None, None,  # a blank ticket · a red notebook
        'propPaperFolded',
    ],
    'daily': [
        'propSuitcase', 'propPassport', 'propTicketsPair', 'propKeys',
        'propBackpack', 'propHeadphones', 'propMug', 'propPlanner',
        None, None,  # a clipboard · a wallet
        # the red box: *"קופסת פח מתחת למיטה"*, *"המכסה חרק"* — a tin with a hinged lid. The
        # sheet draws two red boxes; the cardboard one above is a shoebox, this one is tin
        'propRedBox',
        'propCable',
    ],
    'terrace': [
        'propDrum', 'propDarbuka', None,  # a megaphone
        'propFootball', None, 'propSportsBag',  # a second basketball
        'propBannerBlank', None, 'propBib',  # a silver trophy — Y05's cup is plastic
    ],
    'devices': [
        None, 'propPhone2010', 'propPhone2020',  # a Nokia (the workshop paints its own)
        'propRadio', None, 'propRemote',  # a television (every room paints its own)
        'propLaptop', 'propRecorder', 'propNewspaper',
    ],
}

WHAT = {
    'propRedBox': 'הקופסה האדומה — קופסת פח עם ציר',
    'propRadio': 'הטרנזיסטור',
    'propPhone2000': 'טלפון נייד, שנות ה-2000',
    'propPhone2010': 'סמארטפון, שנות ה-2010',
    'propPhone2020': 'טלפון, שנות ה-2020',
}


def objects(sheet: Image.Image):
    """every object on the green, as boxes in reading order — measured, never typed"""
    keyed = despill(key_flat(sheet))
    alpha = np.asarray(keyed)[..., 3] > 60
    # join the parts of one object (a strap, a lid, the tip of a cable) before labelling
    joined = ndimage.binary_closing(alpha, structure=np.ones((9, 9)), iterations=2)
    lab, n = ndimage.label(joined)
    sizes = ndimage.sum(joined, lab, range(1, n + 1))
    boxes = []
    for i, sl in enumerate(ndimage.find_objects(lab), start=1):
        if sizes[i - 1] < 1500:
            continue
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        boxes.append((x0, y0, x1, y1, i))
    # rows by centre height: an object belongs to the row whose band holds its middle
    boxes.sort(key=lambda b: (b[1] + b[3]) / 2)
    rows, current = [], []
    for b in boxes:
        cy = (b[1] + b[3]) / 2
        if current and cy - (current[-1][1] + current[-1][3]) / 2 > sheet.height * 0.12:
            rows.append(current)
            current = []
        current.append(b)
    if current:
        rows.append(current)
    ordered = [b for row in rows for b in sorted(row, key=lambda b: b[0])]
    return keyed, lab, ordered


def main():
    written = []
    for sheet_name, names in SHEETS.items():
        path = os.path.join(SRC, f'{sheet_name}.png')
        sheet = Image.open(path).convert('RGB')
        keyed, lab, boxes = objects(sheet)
        print(f'{sheet_name}: {len(boxes)} חפצים נמדדו')
        if len(boxes) != len(names):
            print(f'FAIL — {sheet_name}: נמדדו {len(boxes)}, השמות הם {len(names)}. לא נכתב דבר מהגיליון הזה.')
            return 1
        arr = np.asarray(keyed).copy()
        for name, (x0, y0, x1, y1, i) in zip(names, boxes):
            if name is None:
                continue
            pad = 4
            X0, Y0, X1, Y1 = max(0, x0 - pad), max(0, y0 - pad), min(sheet.width, x1 + pad), min(sheet.height, y1 + pad)
            cell = arr[Y0:Y1, X0:X1].copy()
            # only this object: whatever else reaches into the box belongs to a neighbour
            mine = ndimage.binary_dilation(lab[Y0:Y1, X0:X1] == i, iterations=3)
            cell[..., 3] = np.where(mine, cell[..., 3], 0)
            im = Image.fromarray(cell, 'RGBA')
            box = im.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
            if box:
                im = im.crop(box)
            scale = min(1.0, MAX_SIDE / max(im.size))
            if scale < 1:
                im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
            clean = deyellow(im)  # after the resize (rule 44)
            stats = encode_measured(clean, os.path.join(OUT, f'{name}.webp'))
            written.append((name, stats))
            print(f"  {name:18} {stats['w']}×{stats['h']}  {stats['bytes']:>7,} bytes  צהוב {stats['yellowPx']}  [{stats['mode']}]")

    bad = [n for n, s in written if s['yellowPx']]
    if bad:
        print('FAIL — נשאר צהוב ב: ' + ', '.join(bad))
        return 1

    manifest_path = os.path.join(OUT, 'manifest.json')
    manifest = json.load(open(manifest_path, encoding='utf-8'))
    props = manifest.setdefault('props', {})
    for name, s in written:
        row = {'w': s['w'], 'h': s['h'], 'bytes': s['bytes'], 'yellowLeft': s['yellowPx'], 'source': SOURCE}
        if name in WHAT:
            row['whatHe'] = WHAT[name]
        props[name] = row
    with open(manifest_path, 'w', encoding='utf-8') as fh:
        fh.write(json.dumps(manifest, ensure_ascii=False, indent=1) + '\n')
    print(f'\nנכתבו {len(written)} חפצים · אפס צהוב · manifest.props עודכן')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
