#!/usr/bin/env python3
"""
בתיה — מהצילום, לא מגוף תחליפי (27.9.2026).

מאור: *"בתיה: יש צילום שלה בתיקייה, ובמשחק היא עומדת על גוף תחליפי. לחתוך אותה מהצילום?
כן."* עד היום היא עמדה על `adultB6` (`castFigures.ts`, `standIn: true`) עם `faceStandB6`.
המקור: `גרפיקה מאושרת/בתיה.jpg` — 1184×3554, אישה בת ~60 בגוף מלא על רקע כמעט לבן:
תלתלים בלונדיניים, צמידים, תיק צד.

השלבים — אותה שיטה של `ingest-characters-2026-09-24.py` (חרמש בכדורסל, על לבן), ומשם
מיובאים `one_body`, `finish` ו-`plate_from_body` כדי שלא תהיה שיטה שנייה:
  1. **מפתח לפי מרחק מהלבן** — הרקע הוא 253–255 בשלושת הערוצים, אין מסך צבע לשאול. כתף
     רכה בין 10 ל-42 (מרחק אוקלידי מ-255), כדי שתלתל בהיר לא ייחתך לסטנסיל.
  2. **רכיב אחד** + שחיקת שפה של פיקסל (`finish(erode_white=True)`): הלבן משאיר הילה בהירה.
  3. **de-yellow לפי כלל 44**: פס הצבע 30–80 ב-S ≥ 0.18;
     רק צהוב אמיתי (38–70, S ≥ 0.55) מסתובב ל-26°, כל השאר שומר גוון ויורד ל-S 0.26. השיער
     הבלונדיני והצמידים מברונזה חוצים את הפס; העור (גוון ~15–25°) מתחת לו ולא נוגעים בו.
     רץ **אחרי** ההקטנה, כי LANCZOS ממציא צהוב בין שני שכנים חוקיים (כלל 48, `freddy` בכלל 67).
  4. ציון לחדר (5% חשיפה, 8% רוויה — `grade` המשותף), גובה 640 כמו `kobi72`.
  5. `faceBatya` — ריבוע הראש **מהגוף הזה** ברזולוציה מלאה (כלל 67/88), מונמך בחמישית:
     השיער שלה הוא שליש מהראש, והריבוע המשותף מסגר תלתלים וחתך את הסנטר.
     ו-de-fringe (כלל 40) — שפה חצי-שקופה לוקחת את צבע השכן האטום, בלי הילה לבנה.
  6. הממיר (`to-webp-2026-09-13.py`) מקודד, מפענח וסופר צהוב על הבייטים (כלל 61).

    python3 scripts/life/ingest-batya-2026-09-27.py
    python3 scripts/life/to-webp-2026-09-13.py && python3 scripts/life/to-webp-2026-09-13.py --index
"""
from __future__ import annotations

import importlib.util
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('chars', os.path.join(HERE, 'ingest-characters-2026-09-24.py'))
chars = importlib.util.module_from_spec(spec)
sys.argv, _argv = sys.argv[:1], sys.argv
spec.loader.exec_module(chars)  # type: ignore[union-attr]
sys.argv = _argv

ART = chars.ART
SRC = sys.argv[1] if len(sys.argv) > 1 else '/mnt/user-data/uploads/גרפיקה מאושרת/בתיה.jpg'


def key_white(rgb: np.ndarray, lo: float = 10.0, hi: float = 42.0) -> np.ndarray:
    d = np.linalg.norm(255.0 - rgb.astype(np.float32), axis=2)
    return np.clip((d - lo) / (hi - lo), 0, 1)


def hsv(a: np.ndarray):
    r, g, b = (a[..., i] / 255.0 for i in range(3))
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    i = (mx == r) & m
    h[i] = ((g - b)[i] / d[i]) % 6
    i = (mx == g) & m
    h[i] = ((b - r)[i] / d[i]) + 2
    i = (mx == b) & m
    h[i] = ((r - g)[i] / d[i]) + 4
    return h * 60, np.where(mx > 0, d / np.maximum(mx, 1e-6), 0), mx


def to_rgb(h, s, v):
    h = (h / 60.0) % 6
    i = np.floor(h).astype(int)
    f = h - i
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    out = np.zeros(h.shape + (3,), np.float32)
    for k, (r, g, b) in enumerate([(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]):
        m = i == k
        out[m] = np.stack([r[m], g[m], b[m]], -1)
    return out * 255


def deyellow(im: Image.Image) -> tuple[Image.Image, int]:
    """rule 44's three bands, vectorised: paint 30–80 @ S≥0.18; true yellow 38–70 @ S≥0.55 rotates"""
    a = np.asarray(im).astype(np.float32)
    h, s, v = hsv(a[..., :3])
    paint = (h >= 30) & (h <= 80) & (s >= 0.18) & (a[..., 3] > 0)
    true = paint & (h >= 38) & (h <= 70) & (s >= 0.55)
    nh = np.where(true, 26.0, h)
    ns = np.where(paint & ~true, np.minimum(s, 0.26), s)
    rgb = np.where(paint[..., None], to_rgb(nh, ns, v), a[..., :3])
    return Image.fromarray(np.dstack([rgb.clip(0, 255), a[..., 3]]).astype(np.uint8), 'RGBA'), int(paint.sum())


def defringe(im: Image.Image) -> Image.Image:
    """every partly-transparent pixel takes the colour of its nearest opaque one (rule 40):
    the white sweep otherwise leaves a pale outline on a dark room"""
    a = np.asarray(im).copy()
    solid = a[..., 3] >= 250
    _, (iy, ix) = ndimage.distance_transform_edt(~solid, return_indices=True)
    edge = (a[..., 3] > 0) & ~solid
    a[edge, :3] = a[iy[edge], ix[edge], :3]
    return Image.fromarray(a, 'RGBA')


def cut(height: int | None) -> Image.Image:
    rgb = np.asarray(Image.open(SRC).convert('RGB'))
    alpha = chars.one_body(key_white(rgb))
    return defringe(chars.finish(rgb.astype(np.float32), alpha, erode_white=True, height=height))


def plate(full: Image.Image) -> Image.Image:
    """`plate_from_body`'s square, lowered: her hair is a third of her head, and the shared box
    (centred on the top 14% of the silhouette) framed the curls and cut the chin off"""
    alpha = np.array(full.split()[-1])
    l, t, r, b = chars.head_box(alpha, 0.14)
    side = r - l
    t, b = t + int(side * 0.2), b + int(side * 0.2)
    canvas = Image.new('RGBA', (side, side), (*chars.CREAM, 255))
    canvas.paste(full, (-l, -t), full)
    out = canvas.resize((chars.PLATE, chars.PLATE), Image.LANCZOS)
    return out.filter(ImageFilter.UnsharpMask(radius=2, percent=50, threshold=2))


def save(im: Image.Image, key: str) -> str:
    dest = os.path.join(ART, f'{key}.png')
    old = os.path.join(ART, f'{key}.webp')
    if os.path.exists(old):
        os.remove(old)
    im.save(dest, optimize=True)
    return dest


def main() -> int:
    manifest_path = os.path.join(ART, 'manifest.json')
    manifest = json.load(open(manifest_path, encoding='utf-8'))
    body, touched = deyellow(cut(chars.HEIGHT))
    dest = save(body, 'batya')
    manifest['figures']['batya'] = {
        'w': body.width, 'h': body.height, 'bytes': os.path.getsize(dest), 'yellowLeft': 0,
        'whatHe': 'בתיה — השכנה הוותיקה מבלומפילד, חזית (2000–2026)',
        'source': 'maor-2026-09-27-approved-photo/בתיה.jpg',
    }
    print(f'batya            {body.width}×{body.height} · de-yellow touched {touched}px')
    full, _ = deyellow(cut(None))
    plate_rgba, touched = deyellow(plate(full))
    dest = save(plate_rgba.convert('RGB'), 'faceBatya')
    manifest['portraits']['faceBatya'] = {'w': chars.PLATE, 'h': chars.PLATE, 'bytes': os.path.getsize(dest), 'yellowLeft': 0, 'source': 'cut from batya'}
    print(f'faceBatya        ← batya · de-yellow touched {touched}px')
    json.dump(manifest, open(manifest_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    open(manifest_path, 'a', encoding='utf-8').write('\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())
