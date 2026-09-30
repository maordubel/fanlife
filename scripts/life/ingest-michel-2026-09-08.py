"""
הצוות על מסך ירוק — קליטת הדמויות של 8.9.2026 (מישל, בארי).

  MICHEL_SRC=/tmp/michel python3 scripts/life/ingest-michel-2026-09-08.py

הסיבוב הראשון צולם על רקע אפור בהיר, וזה שבר את הגזירה: הפאנלים הלבנים של חליפת הדיאדורה
נמצאים באותו ערך בדיוק כמו הרקע, ולכן כל ניסיון להפריד אכל למישל את הכתפיים ואת השרוולים.
הרקע הירוק פותר את זה מהשורש — לחליפה אדום־לבן־שחור אין שום ערוץ משותף איתו.

שלושה שלבים, וכולם אוטומטיים:

1. **מפתח כרומה ב-YCrCb**, על ערוצי הצבע בלבד. לא על בהירות: לרקע יש גרדיאנט תאורה, ומפתח
   שמסתכל על בהירות היה חותך את החלק הכהה שלו החוצה ואת החלק הבהיר פנימה.
2. **הסרת נזילה** — ירוק שנשפך על שולי הדמות. אחרי המפתח 17% מפיקסלי המתאר היו ירקרקים;
   הכלל הוא שירוק לא יעלה על ממוצע האדום והכחול, וזה מוריד אותם לאפס בלי לגעת בשום פיקסל
   שהוא באמת ירוק בבגד (אין כזה).
3. **חיתוך לגובה** — הדמות בלבד, בלי אוויר מסביב, כדי שהגובה במטרים שמוצהר עליה יהיה
   הגובה שלה בפועל ולא של המסגרת.
"""
import json
import os
import sys

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(HERE, '..', '..', 'public', 'life', 'art')
GENERATED = os.path.join(HERE, '..', '..', 'lib', 'life', 'generated', 'cityCast.ts')
SRC = os.environ.get('MICHEL_SRC', '/tmp/michel')

# file → (key, מה זה, גובה הדמות במטרים)
# הגובה **לא נבחר כאן**. `lib/life/world/heights.ts` הוא הבית היחיד של גובה של אדם
# במשחק, והמספרים למטה מועתקים ממנו: בארי מטר שמונים ואחת. שומר ב-`tests/city.test.ts`
# מפיל את הבנייה אם השתיים ייפרדו.
JOBS = [
    ('michel-front.png', 'michel99', 'מישל, עומד — 1999', 1.75),
    ('michel-3q.png', 'michel99-3q', 'מישל, שלושה־רבעים ימינה — 1999', 1.75),
    ('barry-front.png', 'barryToday', 'בארי, עומד — היום', 1.81),
    ('barry-3q.png', 'barryToday-3q', 'בארי, שלושה־רבעים ימינה — היום', 1.81),
    # בארי עם הטרנזיסטור, 8.9.2026. החולצה כאן **חלקה, בלי הדפס ובלי כוכב** — ולכן, בניגוד
    # ל-`barryToday`, היא לא אנכרוניזם באף שנה. זאת הגרסה שעומדת ברחוב.
    ('barry-radio-front.png', 'barryRadio', 'בארי עם הרדיו, עומד', 1.81),
    ('barry-radio-3q.png', 'barryRadio-3q', 'בארי עם הרדיו, שלושה־רבעים', 1.81),
]


def cut(path: str) -> Image.Image:
    rgb = np.asarray(Image.open(path).convert('RGB'))
    ycc = cv2.cvtColor(rgb, cv2.COLOR_RGB2YCrCb).astype(np.float32)
    corner = np.concatenate([ycc[:50, :50].reshape(-1, 3), ycc[:50, -50:].reshape(-1, 3)])
    key = np.median(corner, axis=0)
    # ערוצי הצבע בלבד — הבהירות של הרקע משתנה ואסור שהיא תשפיע
    distance = np.linalg.norm(ycc[..., 1:] - key[1:], axis=2)
    mask = (distance > 28).astype(np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((11, 11), np.uint8))
    labelled, n = ndimage.label(mask)
    if n:
        sizes = ndimage.sum(mask, labelled, range(1, n + 1))
        mask = (labelled == (int(np.argmax(sizes)) + 1)).astype(np.uint8)

    out = rgb.astype(np.float32)
    # הסרת נזילה: ירוק לא עולה על ממוצע האדום והכחול
    limit = (out[..., 0] + out[..., 2]) / 2
    out[..., 1] = np.minimum(out[..., 1], limit)

    rgba = np.dstack([out.clip(0, 255).astype(np.uint8), (mask * 255).astype(np.uint8)])
    image = Image.fromarray(rgba, 'RGBA')
    return image.crop(image.getbbox())


def yellow_pixels(image: Image.Image) -> int:
    a = np.asarray(image.convert('RGBA')).astype(np.float32)
    rgb, alpha = a[..., :3], a[..., 3]
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    delta = mx - mn
    sat = np.where(mx > 0, delta / np.maximum(mx, 1), 0)
    val = mx / 255
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    hue = np.zeros_like(mx)
    q = (delta > 0) & (mx == r); hue[q] = 60 * (((g - b)[q] / delta[q] + 6) % 6)
    q = (delta > 0) & (mx == g); hue[q] = 60 * ((b - r)[q] / delta[q] + 2)
    q = (delta > 0) & (mx == b); hue[q] = 60 * ((r - g)[q] / delta[q] + 4)
    return int(((hue >= 38) & (hue <= 70) & (sat >= 0.35) & (val >= 0.35) & (alpha > 128)).sum())


def main() -> None:
    manifest_path = os.path.join(ART, 'manifest.json')
    manifest = json.load(open(manifest_path, encoding='utf-8'))
    figures = manifest.setdefault('figures', {})
    for filename, key, what, metres in JOBS:
        path = os.path.join(SRC, filename)
        if not os.path.exists(path):
            print(f'{key}: source missing ({path})')
            continue
        image = cut(path)
        # לוח של 256 צבעים עם שקיפות, כמו כל דמות אחרת בארכיון
        flat = image.convert('RGBA').quantize(colors=255, method=Image.FASTOCTREE)
        out = os.path.join(ART, f'{key}.png')
        flat.save(out, 'PNG', optimize=True)
        saved = Image.open(out)
        # חוק הצהוב נמדד על הבייטים שנשמרו, לא על מה שהיה בזיכרון — יש בדיקה שדורשת את
        # המספר הזה מכל נכס בארכיון, וזאת הסיבה שהיא קיימת.
        left = yellow_pixels(saved)
        if left:
            raise SystemExit(f'{key}: {left} yellow pixels shipped')
        figures[key] = {
            'w': saved.size[0], 'h': saved.size[1], 'metres': metres,
            'bytes': os.path.getsize(out), 'whatHe': what, 'yellowLeft': left,
            'source': 'maor-2026-09-08-green-screen',
        }
        print(f'{key}: {what} — {saved.size[0]}×{saved.size[1]}, {metres} m '
              f'({os.path.getsize(out) // 1024} KB)')
    json.dump(manifest, open(manifest_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    write_generated(figures)
    print('manifest + lib/life/generated/cityCast.ts updated')


HEADER = '''/**
 * נוצר אוטומטית — do not edit. סקריפטי הקליטה של הדמויות כותבים אותו מחדש.
 *
 * הגובה של כל דמות **במטרים**, ולא בפיקסלים. זה מה שמאפשר להציב אותה בעיר: ברגע שידוע
 * שמישל הוא מטר שבעים וחמש, המנוע יודע כמה גדול הוא צריך להיראות בכל מרחק, ואין שום מספר
 * שצריך לכוונן ביד. תמונה בלי השורה הזאת היא תמונה שאי אפשר להעמיד ברחוב.
 */
export type CastMember = {
  /** גובה הדמות במטרים */
  metres: number
  /** רוחב וגובה הקובץ, אחרי חיתוך לדמות עצמה */
  w: number
  h: number
}

export const CITY_CAST: Record<string, CastMember> = {
'''


def write_generated(figures: dict) -> None:
    rows = [
        f"  '{key}': {{ metres: {row['metres']}, w: {row['w']}, h: {row['h']} }},"
        for key, row in sorted(figures.items())
        if isinstance(row, dict) and 'metres' in row
    ]
    with open(GENERATED, 'w', encoding='utf-8') as handle:
        handle.write(HEADER + '\n'.join(rows) + '\n}\n')


if __name__ == '__main__':
    main()
