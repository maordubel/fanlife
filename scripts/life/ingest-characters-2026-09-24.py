#!/usr/bin/env python3
"""
הדמויות של 2000–2026 — 45 גופים ועשרה דיוקנים שנמסרו ב-22.9.2026 ולא נקלטו (24.9.2026).

המסירה: `THE-WORKER-CHARACTERS-2000-2026-55` — פוגי בן 32/40/47, קובי בן 62/72, אופיר, עמית
וקרן בני 40, אפי בן 44, כל אחד בחמש תנוחות (`front`, `3q`, `side`, `back`, `walk`) על מסך ירוק,
ועשרה דיוקנים על רקע קרם. ועוד רפרנסים קנוניים שמאור אישר ב-23.9.2026 (`/tmp/in88/refs`):
חרמש — האיש הקירח, בגופייה וג'ינס על ירוק (חזית, שלושה-רבעים) ובתלבושת כדורסל אדומה על לבן.

**השמות הם השמות שהקוד כבר מכיר.** `front` הוא המפתח החשוף (`pogi40`, כמו `hero90`), והשאר
`-3q` / `-side` / `-back` / `-walk`. חרמש נכתב **על השם הישן** (`hermesh`) — כלל של מאור:
תמיד לדרוס את הקובץ הישן באותו שם, כדי שהמערכת לא תוכל לאסוף את האמנות הישנה.

השלבים, לכל גוף:
  1. **מפתח ירוק כיחס ולא כמרחק** — `g − max(r, b)`; ירוק שמוביל על שני הערוצים האחרים הוא
     הבד. כתף רכה (לא סף) בין 28 ל-70, כדי ששיער מתולתל לא ייחתך לסטנסיל. הירוק במסירה
     אינו קוד RGB אחד (README), ולכן היחס ולא הערך.
  2. **רכיב אחד** — מה שלא מחובר לגוף הגדול (שארית צל, כתם על הבד) הולך.
  3. **despill** — ירוק לא עולה על המקסימום של האדום והכחול. אין בגדים ירוקים באף גוף כאן
     (נבדק בגיליון מגע), ולכן זה בטוח על כל הפיקסלים.
  4. **ציון לחדר** — 5% פחות חשיפה ו-8% מהרוויה לכיוון הבהירות: אור סטודיו נקרא כמדבקה
     על חדר מצולם (`art-drop-ingest` §3).
  5. חיתוך לתוכן, הקטנה לגובה 640 (כמו `michel99`) באלפא מוכפל, PNG ל-`public/life/art`.
     הממיר (`to-webp-2026-09-13.py`) מקודד, **מפענח וסופר צהוב על הבייטים** (כלל 61).

חרמש בכדורסל צולם על לבן: המפתח שם הוא מרחק מהלבן של הפינות + רכיב אחד + שחיקה של שפה,
כי אין מסך שאפשר לשאול אותו "אתה ירוק?".

הדיוקנים (`face*`): ריבוע סביב הראש, **מהגוף שעומד על הרצפה** (כלל 67/88) — `make-faces` /
`cast-faces-2026-09-21.py`, אותה שיטה בדיוק. דיוקני המסירה עצמם נשמרים כמקור השוואה בלבד:
הם אותו אדם באותם בגדים, אבל לוח שנחתך מהגוף הוא הוכחה שהפנים בתיבה הן הפנים בחדר, ולוח
נפרד הוא רק טענה. רחל בת 60 היא היוצאת מן הכלל, כי לה לא נמסר גוף (README): `faceRachel60`
נחתך מהדיוקן שנמסר, ו-`life:identity` רושם אותו כ"פנים בלי גוף" עם הסיבה.

    python3 scripts/life/ingest-characters-2026-09-24.py [<drop>] [<refs>]
    python3 scripts/life/ingest-characters-2026-09-24.py --barry   # faceBarry only
    python3 scripts/life/to-webp-2026-09-13.py      # מקודד, מודד, וכותב את המניפסטים
"""
from __future__ import annotations

import json
import os
import sys

import cv2
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.normpath(os.path.join(HERE, '..', '..', 'public', 'life', 'art'))
DROP = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else '/tmp/art/THE-WORKER-CHARACTERS-2000-2026-55'
REFS = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith('--') else '/tmp/in88/refs'
HEIGHT = 640
CREAM = (0xED, 0xE6, 0xD8)
PLATE = 320

SETS = ['pogi32', 'pogi40', 'pogi47', 'kobi62', 'kobi72', 'ofir40', 'amit40', 'efi44', 'keren40']
POSES = {'front': '', '3q': '-3q', 'side': '-side', 'back': '-back', 'walk': '-walk'}

WHAT = {
    'pogi32': 'פוגי בן 32 — 2010–2013',
    'pogi40': 'פוגי בן 40, עם צעיף — 2016–2021',
    'pogi47': 'פוגי בן 47 — 2023–2026',
    'kobi62': 'קובי בן 62 — 2010–2015',
    'kobi72': 'קובי בן 72 — 2017–2026',
    'ofir40': 'אופיר בן 40',
    'amit40': 'עמית בן 40, בלי משקפיים',  # (27.9.2026) הקנון: לעמית אין משקפיים — והגוף שנמסר אכן בלי
    'efi44': 'אפי בן 44',
    'keren40': 'קרן בת 40',
}
POSE_HE = {'': 'חזית', '-3q': 'שלושה־רבעים', '-side': 'פרופיל ימינה', '-back': 'גב', '-walk': 'צעד, ימינה'}


# **סימן מסחרי על הנעל.** README: "סימנים דקורטיביים שהמודל יצר על נעליים וכפתורים אינם
# רכיב משחק ... יש להסירם". בגיליון מגע של כל 45 הגופים נמצאה רק "N" אחת, על נעלי הספורט של
# קרן ושל פוגי בן 32 — בכל התנוחות. הקופסאות נמדדו בעין על המקור (1:1), והאות נמחקת
# ב-inpaint מהזמש שסביבה: רק פיקסלים בהירים וחסרי רוויה בתוך הקופסה, כך שהתפרים נשארים.
LOGO_BOXES: dict[str, list[tuple[int, int, int, int]]] = {
    'keren40-front': [(318, 1502, 368, 1550), (528, 1484, 560, 1524)],
    'keren40-3q': [(392, 1452, 446, 1492), (514, 1496, 562, 1540)],
    'keren40-side': [(444, 1504, 506, 1548)],
    'keren40-walk': [(176, 1450, 236, 1498), (706, 1466, 770, 1510)],
    'keren40-back': [(338, 1494, 366, 1530), (618, 1500, 650, 1534)],
    'pogi32-front': [(342, 1504, 392, 1554), (592, 1510, 632, 1554)],
    'pogi32-3q': [(322, 1506, 372, 1566), (578, 1456, 638, 1506)],
    'pogi32-side': [(412, 1500, 478, 1554)],
    'pogi32-walk': [(140, 1436, 208, 1490), (726, 1426, 798, 1482)],
    'pogi32-back': [(262, 1524, 292, 1560), (638, 1514, 670, 1558)],
}


def unmark(rgb: np.ndarray, name: str) -> np.ndarray:
    boxes = LOGO_BOXES.get(name)
    if not boxes:
        return rgb
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    mask = np.zeros(rgb.shape[:2], np.uint8)
    for x0, y0, x1, y1 in boxes:
        v = hsv[y0:y1, x0:x1, 2].astype(np.float32)
        s = hsv[y0:y1, x0:x1, 1].astype(np.float32)
        g = rgb[y0:y1, x0:x1].astype(np.float32)
        green = g[..., 1] - np.maximum(g[..., 0], g[..., 2]) > 25
        bright = (v > np.median(v) + 28) & (s < 70) & ~green
        mask[y0:y1, x0:x1] = bright.astype(np.uint8) * 255
    mask = cv2.dilate(mask, np.ones((3, 3), np.uint8), iterations=2)
    return cv2.inpaint(rgb, mask, 6, cv2.INPAINT_TELEA)


def key_green(rgb: np.ndarray) -> np.ndarray:
    a = rgb.astype(np.float32)
    lead = a[..., 1] - np.maximum(a[..., 0], a[..., 2])
    alpha = np.clip((70.0 - lead) / 42.0, 0, 1)
    return alpha


def key_chroma(rgb: np.ndarray, lo: float = 12.0, hi: float = 22.0) -> np.ndarray:
    """
    the photographed references: a muted studio green (and a white sweep) with a lit floor
    and a gradient. Chroma distance from the corners' median in YCrCb, never brightness —
    the michel/barry method of 8.9.2026 (`ingest-michel-2026-09-08.py`)
    """
    ycc = cv2.cvtColor(rgb, cv2.COLOR_RGB2YCrCb).astype(np.float32)
    c = np.concatenate([ycc[:80, :80].reshape(-1, 3), ycc[:80, -80:].reshape(-1, 3), ycc[-80:, :80].reshape(-1, 3), ycc[-80:, -80:].reshape(-1, 3)])
    key = np.median(c, axis=0)
    d = np.linalg.norm(ycc[..., 1:] - key[1:], axis=2)
    return np.clip((d - lo) / (hi - lo), 0, 1)


def one_body(alpha: np.ndarray) -> np.ndarray:
    solid = alpha > 0.5
    solid = ndimage.binary_opening(solid, iterations=2)
    lab, n = ndimage.label(solid)
    if n == 0:
        return alpha
    sizes = ndimage.sum(solid, lab, range(1, n + 1))
    keep = lab == (int(np.argmax(sizes)) + 1)
    # small enclosed holes are the subject's own highlights (a bald head under a softbox
    # reads as the white sweep behind it); large ones are background seen between arm and body
    holes, m = ndimage.label(ndimage.binary_fill_holes(keep) & ~keep)
    if m:
        area = ndimage.sum(np.ones_like(alpha), holes, range(1, m + 1))
        small = np.isin(holes, [i + 1 for i, a in enumerate(area) if a < keep.sum() * 0.004])
        alpha = np.where(small, 1.0, alpha)
        keep = keep | small
    # the soft shoulder of the edge survives, islands do not
    near = ndimage.binary_dilation(keep, iterations=4)
    return np.where(near, alpha, 0.0)


def despill(rgb: np.ndarray) -> np.ndarray:
    a = rgb.astype(np.float32)
    cap = np.maximum(a[..., 0], a[..., 2])
    a[..., 1] = np.minimum(a[..., 1], cap)
    return a


def grade(a: np.ndarray) -> np.ndarray:
    lum = a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114
    out = a + (lum[..., None] - a) * 0.08
    return out * 0.95


def finish(rgb: np.ndarray, alpha: np.ndarray, erode_white: bool = False, height: int | None = HEIGHT) -> Image.Image:
    if erode_white:
        # the white ground leaves a pale fringe: pull the edge in by a pixel and soften it
        hard = ndimage.binary_erosion(alpha > 0.5, iterations=2)
        alpha = np.asarray(Image.fromarray((hard * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255
    col = grade(rgb)
    ys, xs = np.where(alpha > 0.03)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    col, alpha = col[y0:y1, x0:x1], alpha[y0:y1, x0:x1]
    # premultiply, resize, unpremultiply — a green halo never comes back through the filter
    pre = np.dstack([col * alpha[..., None], alpha * 255]).clip(0, 255).astype(np.uint8)
    im = Image.fromarray(pre, 'RGBA')
    if height:
        w = max(1, round(im.width * height / im.height))
        im = im.resize((w, height), Image.LANCZOS)
    arr = np.asarray(im).astype(np.float32)
    al = arr[..., 3:4] / 255.0
    rgb2 = np.where(al > 0.004, arr[..., :3] / np.maximum(al, 0.004), 0)
    out = np.dstack([rgb2.clip(0, 255), arr[..., 3]]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def cut_green(path: str, height: int | None = HEIGHT) -> Image.Image:
    rgb = unmark(np.asarray(Image.open(path).convert('RGB')), os.path.basename(path)[:-4])
    alpha = one_body(key_green(rgb))
    return finish(despill(rgb), alpha, height=height)


def cut_ref(path: str, white: bool, height: int | None = HEIGHT) -> Image.Image:
    rgb = np.asarray(Image.open(path).convert('RGB'))
    alpha = one_body(key_chroma(rgb))
    if white:
        # a highlight on the shoulder bites the silhouette from the outside: close it
        closed = ndimage.binary_closing(alpha > 0.5, structure=np.ones((3, 3)), iterations=8)
        alpha = np.maximum(alpha, closed.astype(np.float32))
    return finish(despill(rgb) if not white else rgb.astype(np.float32), alpha, erode_white=True, height=height)


def head_box(alpha: np.ndarray, until: float = 0.2) -> tuple[int, int, int, int]:
    """the square of `cast-faces-2026-09-21.py`, unchanged — one method for every plate"""
    h, w = alpha.shape
    ys, xs = np.where(alpha[: int(h * until)] > 40)
    y0, y1 = int(ys.min()), int(ys.max())
    head_h = y1 - y0
    side = int(head_h * 1.55)
    upper = alpha[y0 : y0 + int(head_h * 0.66)]
    uys, uxs = np.where(upper > 40)
    cx = int((uxs.min() + uxs.max()) / 2) if len(uxs) else w // 2
    cy = y0 + int(head_h * 0.5)
    left = cx - side // 2
    top = cy - int(side * 0.52)
    return left, top, left + side, top + side


def plate_from_body(im: Image.Image) -> Image.Image:
    alpha = np.array(im.split()[-1])
    l, t, r, b = head_box(alpha, 0.14)
    canvas = Image.new('RGBA', (r - l, b - t), (*CREAM, 255))
    canvas.paste(im, (-l, -t), im)
    out = canvas.resize((PLATE, PLATE), Image.LANCZOS)
    return out.filter(ImageFilter.UnsharpMask(radius=2, percent=50, threshold=2)).convert('RGB')


def plate_from_portrait(path: str) -> Image.Image:
    """a 3:4 portrait on cream → the square the box uses: head and shoulders, same framing"""
    im = Image.open(path).convert('RGB')
    w, h = im.size
    side = int(w * 0.86)
    left = (w - side) // 2
    top = int(h * 0.02)
    crop = im.crop((left, top, left + side, top + side))
    return crop.resize((PLATE, PLATE), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=40, threshold=2))


def reface_barry(portraits: dict) -> None:
    """
    `faceBarry` was cut from `barry96` — a heavy, curly man who is not Barry (Maor's canonical
    reference of 23.9.2026 is `barry-3q-green`, the man of `barryToday`). Re-cut from
    `barryToday` (the front with both hands down: in `barryRadio` the transistor is at his
    ear, inside the square), under the same key, so every era's map keeps its name.
    """
    im = Image.open(os.path.join(ART, 'barryToday.webp')).convert('RGBA')
    out = plate_from_body(im)
    dest = os.path.join(ART, 'faceBarry.png')
    old = os.path.join(ART, 'faceBarry.webp')
    if os.path.exists(old):
        os.remove(old)
    out.save(dest, optimize=True)
    portraits['faceBarry'] = {'w': PLATE, 'h': PLATE, 'bytes': os.path.getsize(dest), 'yellowLeft': 0, 'source': 'cut from barryToday'}
    print('faceBarry        ← barryToday')


def main() -> int:
    if '--barry' in sys.argv:
        manifest_path = os.path.join(ART, 'manifest.json')
        manifest = json.load(open(manifest_path, encoding='utf-8'))
        reface_barry(manifest.setdefault('portraits', {}))
        json.dump(manifest, open(manifest_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        open(manifest_path, 'a', encoding='utf-8').write('\n')
        return 0
    manifest_path = os.path.join(ART, 'manifest.json')
    manifest = json.load(open(manifest_path, encoding='utf-8'))
    figures = manifest.setdefault('figures', {})
    portraits = manifest.setdefault('portraits', {})

    jobs: list[tuple[str, str, str, str]] = []  # (key, path, kind, whatHe)
    for s in SETS:
        for pose, suffix in POSES.items():
            jobs.append((f'{s}{suffix}', os.path.join(DROP, f'{s}-{pose}.png'), 'green', f'{WHAT[s]} · {POSE_HE[suffix]}'))
    jobs += [
        ('hermesh', os.path.join(REFS, 'hermesh-front-green.jpg'), 'studio', 'חרמש — גופייה אדומה וג׳ינס, חזית'),
        ('hermesh-3q', os.path.join(REFS, 'hermesh-3q-green.jpg'), 'studio', 'חרמש — גופייה אדומה וג׳ינס, שלושה־רבעים'),
        ('hermesh-ball', os.path.join(REFS, 'hermesh-front-basketball-white.jpg'), 'white', 'חרמש — תלבושת כדורסל אדומה, חזית'),
    ]
    cut: dict[str, Image.Image] = {}
    for key, path, kind, what in jobs:
        im = cut_green(path) if kind == 'green' else cut_ref(path, kind == 'white')
        dest = os.path.join(ART, f'{key}.png')
        old = os.path.join(ART, f'{key}.webp')
        if os.path.exists(old):
            os.remove(old)
        im.save(dest, optimize=True)
        cut[key] = im
        figures[key] = {
            'w': im.width, 'h': im.height, 'bytes': os.path.getsize(dest), 'yellowLeft': 0,
            'whatHe': what,
            'source': 'maor-2026-09-23-reference' if key.startswith('hermesh') else 'maor-2026-09-22-characters-2000-2026',
        }
        print(f'{key:16s} {im.width}×{im.height}')

    # the face in the box, from the body on the floor
    faces = {
        'facePogi32': 'pogi32', 'facePogi40': 'pogi40', 'facePogi47': 'pogi47',
        'faceKobi62': 'kobi62', 'faceKobi72': 'kobi72',
        'faceOfir40': 'ofir40', 'faceAmit40': 'amit40', 'faceEfi44': 'efi44', 'faceKeren40': 'keren40',
        'faceHermesh': 'hermesh',
    }
    for face, body in faces.items():
        # cut from the full-resolution key of the same file, not from the 640 figure: a head
        # of ninety pixels blown up to 320 is the softness rule 67 already turned down once
        src = dict((k, (p, kind)) for k, p, kind, _ in jobs)[body]
        full = cut_green(src[0], None) if src[1] == 'green' else cut_ref(src[0], src[1] == 'white', None)
        out = plate_from_body(full)
        dest = os.path.join(ART, f'{face}.png')
        old = os.path.join(ART, f'{face}.webp')
        if os.path.exists(old):
            os.remove(old)
        out.save(dest, optimize=True)
        portraits[face] = {'w': PLATE, 'h': PLATE, 'bytes': os.path.getsize(dest), 'yellowLeft': 0, 'source': f'cut from {body}'}
        print(f'{face:16s} ← {body}')
    # Rachel at sixty: a portrait and no body (README: "לא התבקש גוף")
    out = plate_from_portrait(os.path.join(DROP, 'faceRachel60.png'))
    dest = os.path.join(ART, 'faceRachel60.png')
    out.save(dest, optimize=True)
    portraits['faceRachel60'] = {'w': PLATE, 'h': PLATE, 'bytes': os.path.getsize(dest), 'yellowLeft': 0, 'source': 'portrait-only · maor-2026-09-22-characters-2000-2026/faceRachel60'}
    print('faceRachel60     ← portrait (no body delivered)')
    reface_barry(portraits)

    json.dump(manifest, open(manifest_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    open(manifest_path, 'a', encoding='utf-8').write('\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())
