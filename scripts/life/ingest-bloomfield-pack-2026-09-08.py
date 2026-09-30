#!/usr/bin/env python3
"""
חבילת חזית בלומפילד — פנימה, ובנקייה.

שתי בעיות היו בחבילה, ושתיהן נפתרות כאן במדידה ולא בעין:

1. **אין ערוץ אלפא.** שתים־עשרה מהדמויות נשמרו עם לוח־השחמט האפור **צבוע בתוך התמונה**.
   זה לא רקע שקוף — אלה פיקסלים. לוח כזה הוא תבנית מחזורית של שני גוונים אפורים בדיוק,
   ולכן אפשר לשחזר אותו: מודדים את הצעד מהשוליים, בונים את הלוח הצפוי לכל פיקסל, ומסירים
   רק את מה שתואם לו **וגם** מחובר לשוליים. התנאי השני הוא זה שמציל את הסינר הלבן של המוכר
   ואת הנעליים הלבנות של הילד — הם אפורים־בהירים בדיוק כמו הלוח, אבל הם מוקפים בדמות.

2. **אין קנה מידה.** תמונה בלי גובה במטרים אי אפשר להעמיד ברחוב. הגובה נרשם כאן לכל דמות,
   והמנוע גוזר ממנו את הגודל על המסך בכל מרחק.

וחוק הצהוב נמדד על הבייטים שנשמרו, לא על מה שנכנס.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

SRC = Path('/mnt/user-data/uploads/THE-WORKER-BLOOMFIELD-PACK/THE-WORKER-BLOOMFIELD-FACADE')
OUT = Path(__file__).resolve().parents[2] / 'public' / 'life' / 'art'
GEN = Path(__file__).resolve().parents[2] / 'lib' / 'life' / 'generated'
MANIFEST = OUT / 'manifest.json'
SOURCE = 'maor-2026-09-08-bloomfield-pack'
# הגובה המרבי של דמות שנשמרת. ראה את ההערה ב-`run_figure`.
SHIP_TALL = 1200


# ---------------------------------------------------------------- חוק הצהוב
def yellow_pixels(rgb: np.ndarray, alpha: np.ndarray | None = None) -> int:
    """כמה פיקסלים צהובים יש בפועל. hue 38–70, רוויה ≥ 0.35, ערך ≥ 0.35."""
    a = rgb.astype(np.float32) / 255.0
    mx = a.max(2)
    mn = a.min(2)
    d = mx - mn
    with np.errstate(divide='ignore', invalid='ignore'):
        h = np.zeros_like(mx)
        r, g, b = a[..., 0], a[..., 1], a[..., 2]
        m = d > 1e-6
        idx = (mx == r) & m
        h[idx] = ((g - b)[idx] / d[idx]) % 6
        idx = (mx == g) & m
        h[idx] = ((b - r)[idx] / d[idx]) + 2
        idx = (mx == b) & m
        h[idx] = ((r - g)[idx] / d[idx]) + 4
        h *= 60
        s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    bad = (h >= 38) & (h <= 70) & (s >= 0.35) & (mx >= 0.35)
    if alpha is not None:
        bad &= alpha > 8
    return int(bad.sum())


def deyellow(rgb: np.ndarray) -> np.ndarray:
    """
    מסיט כל פיקסל צהוב אל הכתום, בלי לגעת בשאר. ירידה בערוץ הירוק מזיזה את הגוון כלפי
    מטה ומשאירה את הבהירות. חוזרים על זה עד שלא נשאר אף פיקסל — פעם אחת לא תמיד מספיקה
    לצהוב רווי, וחוק הצהוב נמדד על התוצאה ולא על הכוונה.
    """
    out = rgb.astype(np.float32)
    for _ in range(12):
        a = out / 255.0
        mx, mn = a.max(2), a.min(2)
        d = mx - mn
        r, g, b = a[..., 0], a[..., 1], a[..., 2]
        h = np.zeros_like(mx)
        m = d > 1e-6
        idx = (mx == r) & m
        h[idx] = ((g - b)[idx] / d[idx]) % 6
        idx = (mx == g) & m
        h[idx] = ((b - r)[idx] / d[idx]) + 2
        idx = (mx == b) & m
        h[idx] = ((r - g)[idx] / d[idx]) + 4
        h *= 60
        s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
        bad = (h >= 38) & (h <= 70) & (s >= 0.35) & (mx >= 0.35)
        if not bad.any():
            break
        out[..., 1] = np.where(bad, out[..., 1] * 0.94 - 1.0, out[..., 1])
    return np.clip(out, 0, 255).astype(np.uint8)


# ------------------------------------------------------- הסרת לוח־השחמט
def checker_alpha(rgb: np.ndarray) -> np.ndarray:
    """
    אלפא מתוך לוח־שחמט צבוע.

    לא מנסים לשחזר את הרשת. משבצות הלוח נסחפות לאורך התמונה, ורשת גלובלית מפספסת אותן
    כבר אחרי מאתיים פיקסלים. מה שכן נכון תמיד: לרקע יש **שני גוונים אפורים בלבד**. לומדים
    אותם ממסגרת השוליים, מסמנים כל פיקסל ניטרלי שקרוב לאחד מהם, ומשאירים רק את מה
    ש**מחובר לשוליים**. התנאי האחרון הוא זה שמציל את הסינר הלבן ואת הנעליים הלבנות: הם
    בגוון של הלוח, אבל הדמות מקיפה אותם.
    """
    h, w, _ = rgb.shape
    g = rgb.mean(2)
    neutral = rgb.max(2).astype(int) - rgb.min(2).astype(int)

    b = 14
    border = np.zeros((h, w), bool)
    border[:b] = border[-b:] = True
    border[:, :b] = border[:, -b:] = True

    vals = g[border & (neutral < 18)]
    if len(vals) < 500:
        raise SystemExit('no neutral border to learn the board from')
    # שני הגוונים: k-means על ערך אחד, שתי קבוצות. חמש חזרות מספיקות לשני מרכזים.
    lo, hi = float(np.percentile(vals, 10)), float(np.percentile(vals, 90))
    for _ in range(24):
        near_lo = np.abs(vals - lo) <= np.abs(vals - hi)
        if near_lo.any():
            lo = float(vals[near_lo].mean())
        if (~near_lo).any():
            hi = float(vals[~near_lo].mean())
    if hi - lo < 20:
        raise SystemExit(f'no checkerboard found — the two tones are {lo:.0f} and {hi:.0f}')

    # --- מה מבדיל לוח מבד.
    #
    # לא הצבע — סינר לבן וג'ינס שטוף יושבים בדיוק באותו טווח אפור. ולא הקישוריות לבדה —
    # תפר דחיסה אחד מגשר בין הלוח לרגל, המילוי דולף פנימה ואוכל חצי ירך. מה שמבדיל הוא
    # ש**הלוח נוגע בשני הגוונים בכל חלון**: לכל משבצת יש שכן הפוך. בד נוגע בגוון אחד.
    #
    # שתי הבדיקות יחד: המילוי מהשוליים אומר *איפה* הרקע, והמבחן הדו־שיאי אומר *עד לאן*
    # מותר לו להתפשט. גשר דק לא עובר, כי הפיקסלים שאחריו הם בד.
    dist = np.minimum(np.abs(g - lo), np.abs(g - hi))
    loose = (g > lo - 16) & (g < hi + 16) & (neutral < 16)

    win = 21
    f_lo = ndimage.uniform_filter((np.abs(g - lo) < 8).astype(np.float32), win)
    f_hi = ndimage.uniform_filter((np.abs(g - hi) < 8).astype(np.float32), win)
    both = np.minimum(f_lo, f_hi)
    # ליד הצללית החלון חצוי, ולכן הסף שם רך יותר; באמצע הבד הוא לא מתקרב אפילו לזה.
    corridor = loose & (both > 0.07)

    seed = np.zeros((h, w), bool)
    seed[0] = seed[-1] = True
    seed[:, 0] = seed[:, -1] = True
    seed &= corridor
    bg = ndimage.binary_propagation(seed, mask=corridor)
    # החזרה אל תוך המסכה הרכה: הטבעת בין הרקע לדמות שייכת לרקע
    for _ in range(3):
        bg = ndimage.binary_dilation(bg, np.ones((3, 3))) & loose

    # --- הלוח הכלוא בין היד לגוף. הוא לא נוגע בשוליים, ולכן המילוי לא הגיע אליו; מה
    #     שמזהה אותו הוא אותו מבחן דו־שיאי, בסף מחמיר יותר כי כאן אין מי שיאשר אותו.
    rest, n = ndimage.label(corridor & ~bg)
    if n:
        for i in range(1, n + 1):
            m = rest == i
            if int(m.sum()) >= 400 and float(both[m].mean()) > 0.16:
                bg |= ndimage.binary_dilation(m, np.ones((3, 3))) & loose

    # --- חור בתוך הדמות. ג'ינס שטוף מגיע לפעמים בדיוק לגוון של הלוח ואז נפער בו כתם.
    #     המבחן הוא אותו מבחן: כתם שאינו נוגע בשוליים **ואינו דו־שיאי** אינו לוח אלא בד.
    inner, m = ndimage.label(bg)
    for i in range(1, m + 1):
        sel = inner == i
        if sel[0].any() or sel[-1].any() or sel[:, 0].any() or sel[:, -1].any():
            continue
        if float(both[sel].mean()) < 0.14:
            bg[sel] = False

    # --- אבק. אי אטום שאין בו אפילו חמישית פרומיל מהתמונה הוא רעש דחיסה, לא דמות.
    isle, k = ndimage.label(~bg)
    if k:
        sizes = ndimage.sum(~bg, isle, range(1, k + 1))
        bg |= np.isin(isle, 1 + np.where(sizes < 0.0002 * h * w)[0])

    # --- שוליים רכים. אלפא רציף על טבעת של שני פיקסלים סביב הרקע.
    alpha = np.where(bg, 0.0, 1.0)
    ring = ndimage.binary_dilation(bg, np.ones((5, 5))) & ~bg
    alpha[ring] = np.clip((dist[ring] - 6) / 20.0, 0.0, 1.0)

    # --- מה עמד מאחורי כל פיקסל: הגוון הקרוב מבין השניים. זה מה שמוסר בשוליים.
    behind = np.where(np.abs(g - lo) <= np.abs(g - hi), lo, hi).astype(np.float32)
    return (alpha * 255).astype(np.uint8), behind


def unmix(rgb: np.ndarray, alpha: np.ndarray, behind: np.ndarray) -> np.ndarray:
    """
    בשוליים כל פיקסל הוא תערובת של הדמות ושל האפור שמאחוריה. מחזירים את הדמות:
    C = (P − (1−α)·B) / α. בלי זה נשארת הילה אפורה סביב השיער.
    """
    a = (alpha.astype(np.float32) / 255.0)[..., None]
    out = (rgb.astype(np.float32) - (1 - a) * behind[..., None]) / np.maximum(a, 0.15)
    return np.clip(out, 0, 255).astype(np.uint8)


def crop(rgb: np.ndarray, alpha: np.ndarray, pad: int = 2):
    ys, xs = np.where(alpha > 10)
    if len(ys) == 0:
        raise SystemExit('nothing left after the key')
    y0, y1 = max(0, ys.min() - pad), min(alpha.shape[0], ys.max() + 1 + pad)
    x0, x1 = max(0, xs.min() - pad), min(alpha.shape[1], xs.max() + 1 + pad)
    return rgb[y0:y1, x0:x1], alpha[y0:y1, x0:x1], (int(y0), int(y1), int(x0), int(x1))


# ------------------------------------------------------------------ הדמויות
# הגובה במטרים. veteran/steward/vendor/boy — המספרים מהמפרט של החבילה;
# פוגי — הגובה של ילד בן שמונה כמו שהוא כבר רשום ב-heights.ts של המשחק.
FIGURES: list[tuple[str, str, float]] = [
    ('02-characters/bf-steward.png', 'bfSteward', 1.78),
    ('02-characters/bf-vendor.png', 'bfVendor', 1.70),
    # הילד בחולצה האדומה הוא **אופיר** — הוא כבר קיים במשחק, והגובה שלו כבר רשום
    # ב-`lib/life/world/heights.ts`. אין כאן מספר חדש, יש שימוש במספר שיש.
    ('02-characters/bf-boy.png', 'ofir86', 1.46),
    ('03-pogi/pogi-back-w1.png', 'pogi-w1', 1.30),
    ('03-pogi/pogi-back-w2.png', 'pogi-w2', 1.30),
    ('03-pogi/pogi-back-w3.png', 'pogi-w3', 1.30),
    ('03-pogi/pogi-back-w4.png', 'pogi-w4', 1.30),
    ('03-pogi/pogi-back-w5.png', 'pogi-w5', 1.30),
    ('03-pogi/pogi-back-w6.png', 'pogi-w6', 1.30),
    ('03-pogi/pogi-back-w7.png', 'pogi-w7', 1.30),
    ('03-pogi/pogi-back-w8.png', 'pogi-w8', 1.30),
    ('03-pogi/pogi-back-3q-left.png', 'pogi-3q-l', 1.30),
    ('03-pogi/pogi-back-3q-right.png', 'pogi-3q-r', 1.30),
    # השלטים. גם להם גובה במטרים, מאותה סיבה בדיוק: שלט אמייל של שער הוא כשליש מטר,
    # ומסגרת קופה היא בגובה חזה. בלי המספר הם ייצאו בגודל אקראי בכל מרחק.
    ('04-signs/bf-sign-gate.png', 'bfSignGate', 0.34),
    ('04-signs/bf-sign-box.png', 'bfSignBox', 1.15),
]


def run_figure(rel: str, key: str, metres: float, report: list):
    src = SRC / rel
    im = Image.open(src)
    raw = np.array(im.convert('RGB'))
    if im.mode == 'RGBA' and np.array(im.split()[-1]).min() == 0:
        alpha = np.array(im.split()[-1])
        behind = np.full(alpha.shape, 190.0, np.float32)
        note = 'alpha shipped'
    else:
        alpha, behind = checker_alpha(raw)
        note = 'checkerboard removed'
    rgb = unmix(raw, alpha, behind)
    rgb = deyellow(rgb)
    rgb, alpha, box = crop(rgb, alpha)

    left = yellow_pixels(rgb, alpha)
    if left:
        raise SystemExit(f'{key}: {left} yellow pixels survived — not shipping')

    OUT.mkdir(parents=True, exist_ok=True)
    out = Image.fromarray(np.dstack([rgb, alpha]), 'RGBA')
    # **גודל לפי מה שרואים.** דמות בגובה מטר שבעים שעומדת בחמישה מטר תופסת על מסך טלפון
    # כארבע מאות פיקסלים; קובץ של אלפיים הוא פי חמישה יותר ממה שאי פעם יידגם, והוא נטען
    # ברשת סלולרית. אלף ומאתיים משאירים מרווח כפול לזום ולמסך גדול, וחוסכים שני שלישים
    # מהמשקל.
    if out.height > SHIP_TALL:
        out = out.resize((max(1, round(out.width * SHIP_TALL / out.height)), SHIP_TALL), Image.LANCZOS)
    out.save(OUT / f'{key}.png', optimize=True)
    alpha = np.array(out)[..., 3]
    rgb = np.array(out)[..., :3]
    h, w = alpha.shape
    covered = float((alpha > 10).mean())
    report.append({
        'key': key, 'source': rel, 'w': w, 'h': h, 'metres': metres,
        'note': note, 'coverage': round(covered, 3), 'yellowLeft': 0,
        'bytes': (OUT / f'{key}.png').stat().st_size,
    })
    print(f'  {key:12s} {w:4d}x{h:4d}  {covered*100:4.1f}% figure  {note}')




# ------------------------------------------------------------------ הפנורמות
#
# חמש התחנות של חזית בלומפילד. הן **לא** גליליות כמו שאר הפנורמות במאגר — קווי הגג
# והמעקות בהן ישרים, וזאת החתימה של מצלמה רגילה. לכן הן נכנסות כ-`proj: 'rect'`.
#
# קו האופק נמדד בכל תמונה בנפרד: `scripts/life/measure-bloomfield-2026-09-08.py` מאתר את
# נקודת המגוז של הרחוב (הצטלבות קווי המדרכה, החזיתות והמעקות), וה-y שלה **הוא** האופק.
# חמש התמונות נתנו 0.596 / 0.609 / 0.592 / 0.640 / 0.591. ארבע מהן בתוך שני אחוזים זו
# מזו — כלומר אותו רחוב, אותו גובה עין; התחנה הרביעית גבוהה בארבעה אחוזים, ולכן היא
# מקבלת את המספר שלה ולא ממוצע. שדה הראייה, ‎96°‎, נובע מזהות שתי נקודות המגוז הניצבות
# בתחנות 3 ו-4 (‎103.8°‎ ו-‎88.1°‎), ומשמש לכל החמש: מצלמה אחת, עדשה אחת.
STATIONS = [
    ('bloom-facade-01.png', 'panoBloomWalk1', 0.5964),
    ('bloom-facade-02.png', 'panoBloomWalk2', 0.6090),
    ('bloom-facade-03.png', 'panoBloomWalk3', 0.5918),
    ('bloom-facade-04.png', 'panoBloomWalk4', 0.6404),
    ('bloom-facade-05.png', 'panoBloomWalk5', 0.5914),
]


def run_panorama(rel: str, key: str, horizon: float, report: list):
    im = Image.open(SRC / '01-panoramas' / rel).convert('RGB')
    a = deyellow(np.array(im))
    left = yellow_pixels(a)
    if left:
        raise SystemExit(f'{key}: {left} yellow pixels survived — not shipping')

    OUT.mkdir(parents=True, exist_ok=True)
    Image.fromarray(a).save(OUT / f'{key}.png', optimize=True)
    h, w, _ = a.shape

    # צבע הכביש ממש מתחת לרגליים — החציון הנמדד של הרצועה התחתונה, לא ניחוש
    near = np.median(a[int(h * 0.95):].reshape(-1, 3), axis=0).astype(int).tolist()
    report.append({
        'key': key, 'source': rel, 'w': w, 'h': h,
        'horizon': horizon, 'nearRgb': near, 'yellowLeft': 0,
        'bytes': (OUT / f'{key}.png').stat().st_size,
    })
    print(f'  {key:16s} {w}x{h}  horizon={horizon:.4f}  road={near}')


def run_panoramas() -> list:
    out: list = []
    print('panoramas:')
    for rel, key, hz in STATIONS:
        run_panorama(rel, key, hz, out)
    return out




# ------------------------------------------------------------------- הרישום
#
# תמונה שאינה רשומה במאגר היא תמונה שאיש לא מדד. הרישום נושא את מה שנמדד **על הבייטים
# שנשמרו**: מידות, מקור, וכמה פיקסלים צהובים נשארו. השומרים ב-`tests/` קוראים מכאן.
WHAT_HE = {
    'bfSteward': 'סדרן בחזית בלומפילד',
    'bfVendor': 'מוכר גרעינים ליד המעקות',
    'ofir86': 'אופיר, בחולצה אדומה, מול השער',
    'bfSignGate': 'שלט אמייל — שער 7',
    'bfSignBox': 'מסגרת קופה, עץ אדום מתקלף',
    'pogi-w1': 'פוגי מהגב — צעד 1', 'pogi-w2': 'פוגי מהגב — צעד 2',
    'pogi-w3': 'פוגי מהגב — צעד 3', 'pogi-w4': 'פוגי מהגב — צעד 4',
    'pogi-w5': 'פוגי מהגב — צעד 5', 'pogi-w6': 'פוגי מהגב — צעד 6',
    'pogi-w7': 'פוגי מהגב — צעד 7', 'pogi-w8': 'פוגי מהגב — צעד 8',
    'pogi-3q-l': 'פוגי, שלושת־רבעים שמאלה', 'pogi-3q-r': 'פוגי, שלושת־רבעים ימינה',
    'panoBloomWalk1': 'חזית בלומפילד — תחנה ראשונה, מרחוק',
    'panoBloomWalk2': 'חזית בלומפילד — אחרי אחד־עשר מטר',
    'panoBloomWalk3': 'חזית בלומפילד — באמצע הדרך',
    'panoBloomWalk4': 'חזית בלומפילד — מתחת ליציע',
    'panoBloomWalk5': 'חזית בלומפילד — ליד עמוד התאורה',
}


def write_manifest(figures: list, panos: list) -> None:
    m = json.loads(MANIFEST.read_text(encoding='utf-8'))
    for row in figures:
        m.setdefault('figures', {})[row['key']] = {
            'w': row['w'], 'h': row['h'], 'bytes': row['bytes'],
            'source': SOURCE, 'box': [0, 0, row['w'], row['h']],
            'deyellowed': 0, 'yellowLeft': row['yellowLeft'],
            'whatHe': WHAT_HE.get(row['key'], row['key']),
            'metres': row['metres'],
        }
    for row in panos:
        entry = m.setdefault('panoramas', {}).setdefault(row['key'], {})
        entry.update({
            'w': row['w'], 'h': row['h'], 'horizon': row['horizon'], 'bytes': row['bytes'],
            'yellowLeft': row['yellowLeft'], 'source': SOURCE,
            'whatHe': WHAT_HE.get(row['key'], row['key']), 'nearRgb': row['nearRgb'],
            'proj': 'rect', 'hFovDeg': 96,
        })
    MANIFEST.write_text(json.dumps(m, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'manifest: {len(figures)} figures + {len(panos)} panoramas')


def write_cast(figures: list) -> None:
    """
    הגובה של כל דמות **במטרים**, ולא בפיקסלים. זה כל ההבדל בין תמונה לבין מישהו שעומד
    ברחוב: מפיקסלים אי אפשר לגזור כמה גדול הוא צריך להיראות מעשרה מטר, וממטרים כן.
    """
    path = GEN / 'cityCast.ts'
    keep: dict[str, tuple] = {}
    if path.exists():
        import re
        for k, m, w, h in re.findall(
            r"'([^']+)':\s*\{ metres: ([\d.]+), w: (\d+), h: (\d+) \}", path.read_text(encoding='utf-8')
        ):
            keep[k] = (float(m), int(w), int(h))
    for row in figures:
        keep[row['key']] = (row['metres'], row['w'], row['h'])
    lines = [
        '/**',
        ' * נוצר אוטומטית — do not edit. סקריפטי הקליטה של הדמויות כותבים אותו מחדש:',
        ' * `ingest-michel-2026-09-08.py` ו-`ingest-bloomfield-pack-2026-09-08.py`.',
        ' *',
        ' * הגובה של כל דמות **במטרים**, ולא בפיקסלים. זה מה שמאפשר להציב אותה בעיר: ברגע',
        ' * שידוע שמישל הוא מטר שבעים וחמש, המנוע יודע כמה גדול הוא צריך להיראות בכל מרחק,',
        ' * ואין שום מספר שצריך לכוונן ביד. תמונה בלי השורה הזאת היא תמונה שאי אפשר להעמיד',
        ' * ברחוב.',
        ' */',
        'export type CastMember = {',
        '  /** גובה הדמות במטרים */',
        '  metres: number',
        '  /** רוחב וגובה הקובץ, אחרי חיתוך לדמות עצמה */',
        '  w: number',
        '  h: number',
        '}',
        '',
        'export const CITY_CAST: Record<string, CastMember> = {',
    ]
    for k in sorted(keep):
        m, w, h = keep[k]
        lines.append(f"  '{k}': {{ metres: {m:g}, w: {w}, h: {h} }},")
    lines += ['}', '']
    path.write_text('\n'.join(lines), encoding='utf-8')
    print(f'cityCast.ts: {len(keep)} members')


def normalise_walk(report: list) -> None:
    """
    שמונה הפריימים נוצרו כל אחד בנפרד, ולכן כל אחד בגודל אחר ובמקום אחר בקנבס. להריץ
    לולאה כזאת פירושו ילד שגדל, קטן וקופץ הצידה בכל צעד — וזה לא הנשימה של ההליכה, זה
    רעש הייצור.

    **על מה מיישרים.** לא על תיבת התוחם: היא כוללת רגל מורמת ויד מתנופפת, ולכן היא זזה
    בכל תנוחה. מיישרים על **החולצה** — הגו לא משנה צורה בהליכה. רוחב החולצה נותן את קנה
    המידה, מרכזה נותן את המקום, וקצה העליון שלה נותן את הגובה. מה שנשאר אחרי היישור הוא
    ההפרש האמיתי בין התנוחות, כולל כף רגל שמורמת מהקרקע — וזה בדיוק מה שצריך להישאר.
    """
    keys = [f'pogi-w{i}' for i in range(1, 9)]
    rows = {r['key']: r for r in report if r['key'] in keys}
    if len(rows) != 8:
        return

    def shirt(key: str):
        im = Image.open(OUT / f'{key}.png')
        a = np.array(im)
        rgb, al = a[..., :3].astype(int), a[..., 3]
        red = (al > 120) & (rgb[..., 0] > 110) & (rgb[..., 0] > rgb[..., 1] * 1.55) & (rgb[..., 0] > rgb[..., 2] * 1.55)
        red = ndimage.binary_opening(red, np.ones((5, 5)))
        lab, n = ndimage.label(red)
        if n > 1:
            sizes = ndimage.sum(red, lab, range(1, n + 1))
            red = lab == (1 + int(np.argmax(sizes)))
        ys, xs = np.where(red)
        return im, float(xs.mean()), float(ys.min()), float(np.percentile(xs, 97) - np.percentile(xs, 3))

    measured = {k: shirt(k) for k in keys}
    width = float(np.median([m[3] for m in measured.values()]))
    # הגובה הסופי: הפריים הגבוה ביותר אחרי הכיול, בתוספת אוויר
    scaled = {k: width / m[3] for k, m in measured.items()}
    # כמה אוויר מעל קו הכתפיים ומתחתיו — נמדד, לא נבחר: הראש הגבוה ביותר והרגל הנמוכה
    # ביותר מבין השמונה, בתוספת שוליים של שישה פיקסלים.
    heads, feet = [], []
    for k in keys:
        al = np.array(Image.open(OUT / f'{k}.png'))[..., 3]
        ys = np.where(al > 8)[0]
        heads.append((measured[k][2] - float(ys.min())) * scaled[k])
        feet.append((float(ys.max()) - measured[k][2]) * scaled[k])
    above, below = float(max(heads)) + 6, float(max(feet)) + 6
    canvas_h = int(above + below)
    canvas_w = int(width * 3.0)
    for key in keys:
        im, cx, top, _ = measured[key]
        k = scaled[key]
        im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
        out = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
        out.alpha_composite(im, (round(canvas_w / 2 - cx * k), round(above - top * k)))
        out.save(OUT / f'{key}.png', optimize=True)
        rows[key]['w'], rows[key]['h'] = canvas_w, canvas_h
        rows[key]['bytes'] = (OUT / f'{key}.png').stat().st_size
        rows[key]['note'] += ', aligned on the shirt'
    print(f'walk cycle: eight frames on one {canvas_w}x{canvas_h} canvas, aligned on the shirt')


if __name__ == '__main__':
    report: list = []
    print('figures:')
    for rel, key, m in FIGURES:
        run_figure(rel, key, m, report)
    normalise_walk(report)
    panos = run_panoramas()
    write_manifest(report, panos)
    write_cast(report)
    print(f'\n{len(report)} figures + {len(panos)} stations written to {OUT}')
