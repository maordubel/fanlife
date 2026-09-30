# -*- coding: utf-8 -*-
"""
ארכיון החולצות — משני מקורות, לקובץ WebP אחד לכל חולצה.

`public/kits/*.webp`, וכל אחת נחתכה מהרקע שלה, מרוכזת על בד שקוף מרובע, ומקודדת
פעם אחת. הסקריפט הוא גם ההוכחה, כמו `to-webp-2026-09-13.py` של כלל 61: כל קובץ
מקודד, **מפוענח**, והצהוב נספר על הבייטים שנשמרים — לא על מה שהיה בזיכרון.

**ההבדל מכלל 61 הוא מה שנעשה עם המדידה.** שם צהוב מנוקה, כי הוא פליטה של קידוד
מאבד. כאן הוא **עובדה על החפץ** — סמל היורופה ליג על השרוול, פס הזהב של ויזה
1985, חולצת שוער כתומה — ולנקות אותו זה לזייף את הארכיון. מאור אישר את זה במפורש
ב-16.9.2026 כשהמספרים הוצגו לו, ולכן הצהוב נמדד, נרשם לכל קובץ, ועובר ל-
`YELLOW_EXEMPTIONS` כערך שלישי במקום להימחק.

**מה הסקריפט הזה עושה ומה לא.** הוא השלב השני: קידוד ומדידה. החיתוך מהרקע, ניקוי
הכתמים והמרכוז על 760×760 קרו בשלב הכנה מחוץ לריפו, על קבצי JPEG של צד שלישי שאינם
נשמרים כאן — ולכן `plan.json` מצביע על קבצים מוכנים, והסקריפט **נופל** אם אחד מהם
אינו בדיוק 760×760 במקום לתקן אותו בשקט. הדרך חזרה למקור שמורה בכל שורה ב-
`kit-photos.json`: `sourceFile` ו-`sourceUrl`. `docs/10-kit-archive.md` מסביר למה זה
מחולק ככה.

שני מקורות:
  vikipoel · ויקיפועל, "חולצות (כדורגל)" — 199 תצלומים של החולצות האמיתיות
             באדיבות ישי צבי. **רק החזית**, לבקשת מאור: 85 מהן גב ונופו ביד,
             אחרי שהתברר ששם הקובץ לא אמין (` b` הוא לפעמים חזית, ולפעמים
             החזית היא דווקא הקובץ בלי ה-b).
  fka      · footballkitarchive.com — 54 תמונות מוצר על רקע לבן נקי, והן היחידות
             שמכסות 1949–1984. 74 התמונות האחרות שלהם נפסלו: הן צילומי משחק, ויש
             בהן שחקני יריבה ורקע מגרש — כלומר בדיוק הצהוב שכלל 8 קיים בגללו.
"""
import io, json, os, sys
import numpy as np
from PIL import Image

OUT = 'public/kits'
SIZE = 760


def yellow_mask(rgb: np.ndarray) -> np.ndarray:
    """The canonical band — kept in step with `lib/isYellow.ts` by tests/brand.test.ts."""
    r = rgb[..., 0].astype(np.int16); g = rgb[..., 1].astype(np.int16); b = rgb[..., 2].astype(np.int16)
    mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b); d = mx - mn
    s = np.where(mx > 0, d / np.maximum(mx, 1), 0.0)
    v = mx / 255.0
    h = np.zeros(d.shape, dtype=np.float32); nz = d > 0
    ri = (mx == r) & nz; gi = (mx == g) & nz & ~ri; bi = nz & ~ri & ~gi
    h[ri] = 60 * (((g[ri] - b[ri]) / d[ri] + 6) % 6)
    h[gi] = 60 * ((b[gi] - r[gi]) / d[gi] + 2)
    h[bi] = 60 * ((r[bi] - g[bi]) / d[bi] + 4)
    return (s >= 0.35) & (v >= 0.35) & (h >= 38) & (h <= 70) & nz


def encode(im: Image.Image, path: str) -> dict:
    """Encode, then DECODE THE SAVED BYTES and measure on those (rule 61)."""
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=88, method=6)
    data = buf.getvalue()
    back = Image.open(io.BytesIO(data)).convert('RGBA')
    a = np.array(back)
    vis = a[..., 3] > 128
    y = yellow_mask(a[..., :3]) & vis
    open(path, 'wb').write(data)
    return {'bytes': len(data),
            'yellowPx': int(y.sum()),
            'yellowPct': round(float(y.sum()) / max(int(vis.sum()), 1) * 100, 3)}


def main() -> int:
    os.makedirs(OUT, exist_ok=True)
    plan = json.load(open(sys.argv[1], encoding='utf-8'))
    rows = []
    for entry in plan:
        im = Image.open(entry['src']).convert('RGBA')
        if im.size != (SIZE, SIZE):
            raise SystemExit(f"{entry['src']}: expected {SIZE}×{SIZE}, got {im.size}")
        measured = encode(im, os.path.join(OUT, entry['slug'] + '.webp'))
        rows.append({**{k: v for k, v in entry.items() if k != 'src'}, **measured})
    json.dump(rows, open('/tmp/claude-0/encoded.json', 'w', encoding='utf-8'),
              ensure_ascii=False, indent=0)
    total = sum(r['bytes'] for r in rows)
    withY = [r for r in rows if r['yellowPx'] > 0]
    print(f'{len(rows)} shirts · {total/1048576:.1f} MB · '
          f'{len(withY)} carry yellow (max {max(r["yellowPct"] for r in rows):.2f}%)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
