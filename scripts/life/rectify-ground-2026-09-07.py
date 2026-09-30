"""
המרצפות מתחת לרגליים — יישור הרצפה מהפנורמה למרצף שטוח, מלמעלה.

  python3 scripts/life/rectify-ground-2026-09-07.py

**הבעיה, בדיוק.** ההיטל ההפוך (`lib/life/city/pano.ts`) קורא לכל נקודה על הכביש את הפיקסל
שצילם אותה. זה מדויק — עד שמגיעים לקצה התחתון של הפנורמה. שם הקרן משיקה כמעט לרצפה,
וחמישה פיקסלים בתמונה נמתחים על פני עשרה מטר בעולם. התוצאה נראית כמו תעלה: פסים אנכיים
בטבעת אחת, ומעליה מדרכה תקינה. זה לא באג בקוד — זאת פשוט המידע שאין בתמונה בזווית הזאת.

**הפתרון.** באזור שבו הצילום כן טוב — בין שבעה לשלושה־עשר מטר, שם הקרן פוגשת את הרצפה
בזווית סבירה — הרצפה **מיושרת** למבט מלמעלה. המיפוי ידוע במדויק (`r = eye/tan|ε|` ו-`θ`
מהעמודה), ולכן זו לא שחזור אלא **שינוי מערכת קואורדינטות**: אותם פיקסלים, מסודרים כמו
שמצלמה מעל הרחוב הייתה מצלמת אותם. מרצף כזה אפשר לרצף במרחב העולם, בקנה המידה האמיתי,
והפרספקטיבה נבנית מחדש נכון בכל מרחק — כולל מתחת לרגליים.

מה שנשמר הוא חלון נקי מכל פנורמה: קטע כביש או מדרכה בלי אנשים, בלי עמודים, בלי אופניים.
החלון נבחר לכל תמונה בנפרד ורשום כאן, כי "בלי אנשים" זה דבר שרואים ולא מחשבים.
"""
import json
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(HERE, '..', '..', 'public', 'life', 'art')

# key → (hFov°, קו האופק, גובה עין, טווח מרחק במטרים, חצי־זווית°, רוחב/עומק המרצף במטרים)
# הטווחים נבחרו בעין על התמונות: כביש נקי מול פינת תמר וקולנוע, אריחי הטיילת בין הספסלים.
JOBS = {
    'panoTamar':     dict(hfov=128, horizon=0.735, eye=1.7, r=(7.35, 9.30), half=16),
    'panoCinema':    dict(hfov=130, horizon=0.735, eye=1.7, r=(8.2, 12.0), half=20),
    'panoPromenade': dict(hfov=132, horizon=0.720, eye=1.7, r=(7.6, 10.6), half=16),
    # שדרות ירושלים: הרצועה המרוצפת בין שני מסלולי החשמלית, ישר קדימה, בלי עצים ובלי עמודים
    'panoJaffa':     dict(hfov=128, horizon=0.700, eye=1.7, r=(6.4, 10.4), half=14),
    # אוסישקין: הכביש שלפני הכניסה, בין אבן השפה לבין המכוניות
    'panoUssOutside': dict(hfov=124, horizon=0.745, eye=1.7, r=(7.9, 10.9), half=15),
    # בלומפילד: בטון החצר מתחת ליציע, ומדרכת הרחוב לאורך החזית — שניהם נקיים ישר קדימה
    'panoBloomGate':   dict(hfov=120, horizon=0.615, eye=1.7, r=(5.2, 8.4), half=14),
    'panoBloomFacade': dict(hfov=150, horizon=0.575, eye=1.7, r=(3.8, 6.8), half=15),
    # חמש תחנות ההליכה לאורך החזית. תצלומים רגילים, לא פנורמות — ולכן `proj='rect'`.
    # החלון בכולן הוא הכביש ישר קדימה, בין אבן השפה למעקות: אין בו אנשים ואין בו עמודים.
    'panoBloomWalk1': dict(hfov=96, horizon=0.5964, eye=1.7, r=(4.8, 7.2), half=13, proj='rect'),
    'panoBloomWalk2': dict(hfov=96, horizon=0.6090, eye=1.7, r=(4.7, 7.1), half=13, proj='rect'),
    'panoBloomWalk3': dict(hfov=96, horizon=0.5918, eye=1.7, r=(4.8, 7.2), half=13, proj='rect'),
    'panoBloomWalk4': dict(hfov=96, horizon=0.6404, eye=1.7, r=(5.4, 7.8), half=13, proj='rect'),
    'panoBloomWalk5': dict(hfov=96, horizon=0.5914, eye=1.7, r=(4.8, 7.2), half=13, proj='rect'),
    # החדרים. גובה העין נמדד מהרצפה עצמה: המרצפות, כשהן מיושרות, חייבות לצאת ריבועיות,
    # וזה קורה סביב 1.1 מטר — מצלמה נמוכה, כמו שהחדרים האלה באמת צולמו.
    'panoRoomBed':     dict(hfov=140, horizon=0.500, eye=1.10, r=(2.6, 4.2), half=16),
    'panoRoomKitchen': dict(hfov=140, horizon=0.500, eye=1.10, r=(2.6, 4.2), half=16),
    'panoRoomLiving':  dict(hfov=140, horizon=0.500, eye=1.10, r=(2.6, 4.2), half=16),
    'panoRoomGrocery': dict(hfov=140, horizon=0.500, eye=1.10, r=(2.4, 3.8), half=16),
}

# 96 פיקסלים למטר: מעל זה רק מגדילים קובץ, מתחת לזה רואים את המרצף מטשטש מתחת לנעל
# **כמה פיקסלים למטר.** תשעים ושש הספיקו כשהמצלמה מפולסת והרצפה הקרובה תופסת רצועה
# דקה בתחתית; ברגע שהמצלמה מוטה מטה, המטר שמתחת לרגליים נמתח על שליש מסך והמרצף יוצא
# מרוח. מאה תשעים הם בערך מה שהתמונה באמת מחזיקה בקצה הקרוב שלה, ולא יותר — להגדיל
# מעבר לזה זה להמציא חדות שאין.
PX_PER_M = 190


def rectify(key: str, spec: dict) -> tuple[Image.Image, tuple[float, float]]:
    src = np.asarray(Image.open(os.path.join(ART, f'{key}.png')).convert('RGB')).astype(np.float32)
    h, w, _ = src.shape
    hfov = np.deg2rad(spec['hfov'])
    aspect = w / h
    # הרוחב נגזר ולא נבחר: המלבן חייב להיכנס כולו לתוך הטריז שהחלון מגדיר, אחרת הפינות
    # נופלות מחוץ לתמונה ומתמלאות בצבע ממוצע — וזה נראה כמו כתם, לא כמו רצפה.
    r0, r1 = spec['r']
    wide = round(2 * r0 * np.tan(np.deg2rad(spec['half'])) * 0.94, 2)
    deep = round(r1 - r0, 2)
    out_w, out_h = int(wide * PX_PER_M), int(deep * PX_PER_M)

    # מרצף במרחב העולם: x לרוחב, z לעומק, ממורכז על החלון שנבחר
    zs = np.linspace(-r1, -r0, out_h)          # קדימה הוא z שלילי
    xs = np.linspace(-wide / 2, wide / 2, out_w)
    X, Z = np.meshgrid(xs, zs)
    r = np.hypot(X, Z)
    theta = np.arctan2(X, -Z)

    # שתי ההטלות. תצלום רגיל ממפה את `tan θ` ולא את `θ`, והסקאלה האנכית בו נמתחת
    # ב-`1/cos θ`; להתעלם מזה זה למרוח את המדרכה בקצוות המרצף.
    rect = spec.get('proj') == 'rect'
    fN = aspect / 2 / np.tan(hfov / 2) if rect else aspect / hfov
    u = 0.5 + fN * np.tan(theta) / aspect if rect else 0.5 + theta / hfov
    stretch = 1 / np.cos(theta) if rect else 1.0
    py = spec['horizon'] + fN * stretch * (spec['eye'] / np.maximum(r, 1e-3))
    inside = (u >= 0) & (u <= 1) & (py >= 0) & (py <= 1) & (np.abs(np.rad2deg(theta)) <= spec['half'])

    px = np.clip(u * (w - 1), 0, w - 1)
    pyx = np.clip(py * (h - 1), 0, h - 1)
    # דגימה דו־ליניארית, כדי שהמרצף לא ייצא מדורג
    x0, y0 = np.floor(px).astype(int), np.floor(pyx).astype(int)
    x1, y1 = np.minimum(x0 + 1, w - 1), np.minimum(y0 + 1, h - 1)
    fx, fy = (px - x0)[..., None], (pyx - y0)[..., None]
    tile = (
        src[y0, x0] * (1 - fx) * (1 - fy)
        + src[y0, x1] * fx * (1 - fy)
        + src[y1, x0] * (1 - fx) * fy
        + src[y1, x1] * fx * fy
    )
    # אם החלון חורג ממה שהתמונה מכילה, זאת טעות בבחירת החלון ולא משהו שצריך לכסות בצבע.
    coverage = inside.mean()
    if coverage < 0.97:
        raise SystemExit(f'{key}: only {coverage * 100:.0f}% of the window is inside the picture — move r0 outwards')
    # מה שמחוץ לחלון מקבל את החציון של מה שבתוכו — קצוות המרצף לא אמורים להמציא כלום
    if inside.any():
        median = np.median(tile[inside].reshape(-1, 3), axis=0)
        tile[~inside] = median

    # **התאמת בהירות אל התפר.** החלון נלקח מטווח מרחק אחד, והתפר עם התמונה נמצא בטווח אחר;
    # אם הכביש שם בצל והחלון בשמש, נפתחת רצועה כהה עם קו חד בדיוק במקום שאמור להיות מעבר.
    # לכן המרצף מוכפל בגורם אחד, כך שהממוצע שלו שווה לממוצע הרצפה **בטבעת התפר עצמה**. זאת
    # התאמה של חשיפה בין שני קטעים של אותה תמונה — לא צביעה, ולא הזזה של גוונים.
    edge_r = spec['eye'] * fN / (1 - spec['horizon'])
    ring = ring_mean(src, spec, aspect, hfov, edge_r * 1.15)
    have = tile[inside].reshape(-1, 3).mean(axis=0) if inside.any() else tile.reshape(-1, 3).mean(axis=0)
    if ring is not None and have.min() > 1:
        tile = tile * (ring / have)
    return Image.fromarray(np.clip(tile, 0, 255).astype(np.uint8)), (wide, deep)


def ring_mean(src, spec, aspect, hfov, r):
    """הממוצע של הרצפה בטבעת אחת סביב הצופה, נקרא מהפנורמה עצמה."""
    h, w, _ = src.shape
    theta = np.linspace(-np.deg2rad(spec['half']), np.deg2rad(spec['half']), 240)
    rect = spec.get('proj') == 'rect'
    fN = aspect / 2 / np.tan(hfov / 2) if rect else aspect / hfov
    u = 0.5 + fN * np.tan(theta) / aspect if rect else 0.5 + theta / hfov
    py = spec['horizon'] + fN * (spec['eye'] / r)
    if py < 0 or py > 1:
        return None
    xs = np.clip((u * (w - 1)).astype(int), 0, w - 1)
    y = int(np.clip(py * (h - 1), 0, h - 1))
    return src[y, xs].mean(axis=0)


def main() -> None:
    manifest_path = os.path.join(ART, 'manifest.json')
    manifest = json.load(open(manifest_path, encoding='utf-8'))
    panoramas = manifest.setdefault('panoramas', {})
    for key, spec in JOBS.items():
        if not os.path.exists(os.path.join(ART, f'{key}.png')):
            print(f'{key}: source missing')
            continue
        tile, (wide, deep) = rectify(key, spec)
        # מראה־ריצוף בזמן ריצה, ולכן הקצוות לא חייבים להיות תואמים — אבל כן חייב להיות
        # לוח של 256 צבעים כמו כל שאר הארכיון
        flat = tile.convert('P', palette=Image.ADAPTIVE, colors=256, dither=Image.FLOYDSTEINBERG)
        out = os.path.join(ART, f'{key}--tile.png')
        flat.save(out, 'PNG', optimize=True)
        row = panoramas.setdefault(key, {})
        row['tile'] = {'key': f'{key}--tile', 'wide': wide, 'deep': deep, 'bytes': os.path.getsize(out)}
        print(f'{key}: {tile.size[0]}×{tile.size[1]} = {wide}×{deep} m ({os.path.getsize(out) // 1024} KB)')
    json.dump(manifest, open(manifest_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('manifest updated')


if __name__ == '__main__':
    main()
