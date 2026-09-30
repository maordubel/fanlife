#!/usr/bin/env python3
"""
מסירת הדמויות של 13.9.2026 — 25 דמויות מוגדלות, מסך ירוק.

**מה שונה מכל קליטה קודמת.** הדמויות האלה לא חדשות: כל אחת מחליפה קובץ שכבר במשחק,
ושהקוד כבר יודע איפה הוא עומד ובאיזה גובה. לכן החיתוך הוא לא שאלה של טעם — הוא חייב
לצאת **באותו יחס גובה-רוחב** כמו הקובץ שהוא מחליף. הסצנה מציבה את הדמות לפי כפות הרגליים
ולפי שבר גובה; אם החיתוך רחב יותר ביחס, אותו אדם נעשה שמן על המסך בלי שאף מספר בקוד השתנה.
הסקריפט מודד את זה ומדווח, ולא מנחש.

השלבים, לפי הסדר: מפתח ירוק → הורדת הירוק מהשפה → חיתוך לתוכן → קוונטיזציה ל-200 צבעים
כמו כל דמות אחרת → הסרת צהוב → דחיסה חסרת אובדן.

    python3 scripts/life/ingest-characters-2026-09-13.py <תיקיית המסירה>
"""
from __future__ import annotations

import importlib.util
import json
import os
import sys

import numpy as np

try:
    import oxipng
except ImportError:
    oxipng = None
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.normpath(os.path.join(HERE, '..', '..', 'public', 'life', 'art'))
COLOURS = 200
# **כמה מותר ליחס הגובה-רוחב לזוז, באחוזים.** לא טעם — מדידה. הסצנה מציבה דמות לפי כפות
# הרגליים ולפי שבר גובה, ולכן חיתוך צר יותר ביחס פירושו אותו אדם, דק וגבוה יותר על המסך,
# בלי שאף מספר בקוד השתנה. במסירת 13.9.2026 שבע-עשרה דמויות חזרו מתוחות לגובה הקנבס
# שביקשתי — אופיר יצא ביחס 0.143 במקום 0.309 — והשומר הזה הוא מה שעצר אותן.
TOLERANCE = 8.0

spec = importlib.util.spec_from_file_location('build_art', os.path.join(HERE, 'build-art.py'))
build_art = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build_art)


def key_green(rgb: np.ndarray) -> np.ndarray:
    """
    אותה שאלה כמו `slice-sheets.key_green`, בווקטור: ירוק שמוביל על שני הערוצים האחרים
    ביחס ברור הוא הבד, לא הדמות. שאלת יחס ולא שאלת מרחק — חולצה ירוקה כהה נשארת, מסך
    ירוק רווי הולך.
    """
    r, g, b = (rgb[..., i].astype(np.float32) for i in range(3))
    screen = (g > 90) & (g > r * 1.35) & (g > b * 1.35)
    alpha = np.where(screen, 0, 255).astype(np.uint8)
    im = Image.fromarray(alpha, 'L')
    # שחיקה קלה בולעת את שורת הפיקסלים המעורבת, וטשטוש קל מחזיר שפה רכה במקום סטנסיל
    im = im.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    return np.asarray(im)


def despill(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """איפה שהירוק מוביל על שני האחרים, להוריד אותו לרמתם. על ירוק אמיתי זה כמעט כלום."""
    out = rgb.astype(np.float32)
    cap = np.maximum(out[..., 0], out[..., 2])
    lead = (out[..., 1] > cap) & (alpha > 0)
    out[..., 1] = np.where(lead, cap + (out[..., 1] - cap) * 0.25, out[..., 1])
    return np.clip(out, 0, 255).astype(np.uint8)


def treat(src: str, key: str, manifest_sheets: dict) -> tuple[str, int, str]:
    rgb = np.asarray(Image.open(src).convert('RGB'))
    alpha = key_green(rgb)
    rgb = despill(rgb, alpha)

    ys, xs = np.where(alpha > 8)
    if not len(ys):
        return key, 0, 'המפתח לא מצא כלום'
    box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    rgba = np.dstack([rgb, alpha])[box[1]:box[3], box[0]:box[2]]

    im = Image.fromarray(rgba, 'RGBA')
    a = im.getchannel('A')
    flat = Image.new('RGB', im.size, (0, 0, 0))
    flat.paste(im.convert('RGB'), mask=a)
    q = flat.quantize(colors=COLOURS, method=Image.Quantize.FASTOCTREE).convert('RGB')
    clean, moved = build_art.deyellow(Image.merge('RGBA', (*q.split(), a)))
    out = Image.merge('RGBA', (*clean.convert('RGB').split(), a))

    dest = os.path.join(ART, f'{key}.png')
    was, backup = None, None
    if os.path.exists(dest):
        with Image.open(dest) as old:
            was, backup = old.size, old.copy()
    out.save(dest, optimize=True)
    if oxipng:
        oxipng.optimize(dest, level=4, strip=oxipng.StripChunks.safe())

    note = ''
    if was:
        r_old, r_new = was[0] / was[1], out.width / out.height
        drift = abs(r_new / r_old - 1) * 100
        note = f'יחס {r_old:.3f} → {r_new:.3f}  ({drift:+.1f}%)'
        if drift > TOLERANCE:
            note += f'  ✗ נדחה — {drift:.0f}% צר מדי'
            os.remove(dest)
            if backup is not None:
                backup.save(dest, optimize=True)
            return key, 0, note
    if key in manifest_sheets:
        manifest_sheets[key]['bytes'] = os.path.getsize(dest)
        manifest_sheets[key]['w'], manifest_sheets[key]['h'] = out.size
    return key, moved, f'{out.width}×{out.height}  {os.path.getsize(dest)/1024:6.0f}KB  {note}'


def main() -> int:
    folder = sys.argv[1]
    sheets_path = os.path.join(ART, 'sheets.json')
    sheets = json.loads(open(sheets_path, encoding='utf-8').read())
    found = []
    for root, _, files in os.walk(folder):
        for f in sorted(files):
            if f.endswith('.png') and f[:-4] != 'preview':
                found.append((os.path.join(root, f), f[:-4]))
    print(f'{len(found)} דמויות\n')
    for src, key in sorted(found, key=lambda t: t[1]):
        k, moved, note = treat(src, key, sheets)
        print(f'{k:<18} {note}' + (f'   צהוב {moved}' if moved else ''))
    open(sheets_path, 'w', encoding='utf-8').write(json.dumps(sheets, ensure_ascii=False, indent=1) + '\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())
