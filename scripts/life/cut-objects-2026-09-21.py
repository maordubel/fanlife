#!/usr/bin/env python3
"""
שני חפצים שהסיפור מדבר עליהם והמסך לא הראה נכון — 21.9.2026.

  python3 scripts/life/cut-objects-2026-09-21.py && python3 scripts/life/to-webp-2026-09-13.py --index

**הטרנזיסטור (`propRadio`).** הוא נחתך ב-3.9.2026 מלוח הקונספט `stageAenv` — מלבן של
78×54 פיקסלים שהוגדל פי 3 — והרקע של הלוח נשאר בתוכו: פס קרם לרוחב הראש, קרם בתוך
לולאת הידית, ושוליים בהירים. על השולחן במטבח זה נראה כמו מלבן חיוור שמרחף מעל
הרדיו. מאור: *"שמיקום הטרנסיטור במסך יהיה מדוייק"*. הניקוי כאן הוא מהקובץ שכבר בתיקייה
(המקור הוא אותו לוח, ואין ממנו רזולוציה טובה יותר): מילוי מהשוליים דרך כל פיקסל קרם,
שלושה מעברים של הורדת שוליים בהירים, מחיקת כתמים קטנים, מחיקת הפס העליון, וחיתוך
לגוף עצמו — כך שהתחתית של הקובץ היא התחתית של הרדיו, ו-`prop.at` אומר איפה הוא עומד
ולא איפה נגמר רקע שכוח. הציור הנכון מבוקש ב-ART-PROMPTS §18א.

**הקופסה האדומה (`propRedBox`).** *"קופסת פח ישנה ... עם ציר שחורק"* — היא בתסריט מ-1986,
וכל סיום של פרק אומר *"שמת את זה בקופסה האדומה"*, אבל בחדר עמד צעיף. אין ציור שלה. עד
שיגיע (ART-PROMPTS §18ב) היא ארגז הפח מגיליון `props-ground` של ספטמבר, צבוע אדום פח:
אותו צייר, אותו אור, אותה שחיקה — רק הגוון זז, והערך והרוויה של החלודה נשמרים.
"""
import importlib.util
import os
from collections import deque

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'public/life/art')
SHEET = os.path.join(ROOT, 'brand/source/life-2026-09/props-ground.png')

spec = importlib.util.spec_from_file_location('ing', os.path.join(HERE, 'ingest-2026-09.py'))
ing = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ing)
ba = ing.ba


def cream(p, lo=175, spread=40):
    r, g, b, a = p
    if a < 40:
        return True
    return max(r, g, b) >= lo and (max(r, g, b) - min(r, g, b)) <= spread


def clean_radio(path):
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    px = im.load()
    seen = set()
    q = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
    while q:
        x, y = q.popleft()
        if not (0 <= x < w and 0 <= y < h) or (x, y) in seen or not cream(px[x, y]):
            continue
        seen.add((x, y))
        q.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
    for x, y in seen:
        px[x, y] = px[x, y][:3] + (0,)
    for _ in range(3):
        kill = []
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a and max(r, g, b) >= 140 and max(r, g, b) - min(r, g, b) <= 45:
                    if any(not (0 <= u < w and 0 <= v < h) or px[u, v][3] == 0 for u, v in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))):
                        kill.append((x, y))
        for x, y in kill:
            px[x, y] = px[x, y][:3] + (0,)
    # כתמים קטנים, ופס הגבול של הלוח מעל הידית
    seen = set()
    for y in range(h):
        for x in range(w):
            if px[x, y][3] == 0 or (x, y) in seen:
                continue
            comp, q = [], deque([(x, y)])
            seen.add((x, y))
            while q:
                u, v = q.popleft()
                comp.append((u, v))
                for a, b in ((u + 1, v), (u - 1, v), (u, v + 1), (u, v - 1)):
                    if 0 <= a < w and 0 <= b < h and (a, b) not in seen and px[a, b][3] > 0:
                        seen.add((a, b))
                        q.append((a, b))
            thin = max(v for _, v in comp) - min(v for _, v in comp) <= 4
            if len(comp) < 60 or thin:
                for u, v in comp:
                    px[u, v] = (0, 0, 0, 0)
    return im.crop(im.getbbox())


def key_sheet_green(im):
    """
    מפתח לפי גוון ורוויה — `key_flat` (מרחק מצבע הרקע) הוריד את הארגז עצמו, כי פח
    כחלחל-אפור קרוב במרחק RGB לירוק כהה. כאן הרקע הוא מה שהוא: גוון 95–155 ברוויה
    של 0.30 ומעלה (הגיליון עומד על 125/0.40), עם מעבר רך מ-0.22, והצל שהגיליון הטיל
    יורד איתו.
    """
    rgb = im.convert('RGB')
    w, h = rgb.size
    px = rgb.load()
    out = rgb.convert('RGBA')
    op = out.load()
    for y in range(h):
        for x in range(w):
            hh, s, v = ba.rgb_to_hsv(*px[x, y])
            if 95 <= hh <= 155 and s >= 0.22:
                a = 0 if s >= 0.30 else round(255 * (0.30 - s) / 0.08)
                op[x, y] = px[x, y] + (a,)
    return out


def red_tin(im):
    """ארגז הפח, בגוון של פח אדום — הערך נשמר, הגוון זז, הרוויה עולה עד גבול."""
    im = im.convert('RGBA')
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if not a:
                continue
            hh, s, v = ba.rgb_to_hsv(r, g, b)
            # חלודה (כתום-חום) נשארת חלודה; הפח עצמו (אפור-כחלחל) נצבע
            if 10 <= hh <= 40 and s > 0.35:
                continue
            nr, ng, nb = ba.hsv_to_rgb(4.0, min(0.80, 0.55 + s * 0.8), min(1.0, v * 0.95))
            px[x, y] = (nr, ng, nb, a)
    return im


def main():
    radio = clean_radio(os.path.join(OUT, 'propRadio.webp'))
    radio.save(os.path.join(OUT, 'propRadio.webp'), 'WEBP', lossless=True)
    print('propRadio', radio.size)

    sheet = Image.open(SHEET).convert('RGB')
    W, H = sheet.size
    box = (0.668, 0.728, 0.772, 0.845)
    crop = sheet.crop((int(box[0] * W), int(box[1] * H), int(box[2] * W), int(box[3] * H)))
    keyed = key_sheet_green(crop)
    tin, _moved = ba.deyellow(red_tin(keyed))
    tin = ba.defringe(tin)
    tin = tin.crop(tin.getbbox())
    tin.save(os.path.join(OUT, 'propRedBox.webp'), 'WEBP', lossless=True)
    print('propRedBox', tin.size, 'yellow', ba.count_yellow(tin))


if __name__ == '__main__':
    main()
