"""
קליטת תבניות השיתוף — 7.9.2026, מהתבנית שמאור צייר.

הוא שלח 941×1672, שזה 9:16 כמעט לפיקסל (0.5628 מול 0.5625), כלומר בדיוק תבנית הסטורי בקנה
מידה קטן יותר. שני דברים קורים כאן, ושניהם מסיבה:

· **הסטורי מוגדל ל-1080×1920** ב-LANCZOS. הגדלה ממציאה צבעים בין־פיקסליים, ולכן בדיקת הצהוב
  רצה **אחרי** ההגדלה ולא לפניה — זה בדיוק מה שלימד אותנו את הפנורמות.
· **הריבוע נגזר ולא מומצא.** רוחב 1080, ואז חתך של 1080 מהאמצע לגובה. הפס האדום רץ לכל הגובה
  ולכן שורד את החתך, והמרקם באמצע הוא בדיוק אותו מרקם — כלומר זו אותה תבנית, לא תבנית שנייה
  שמישהו החליט עליה.
"""
import sys
from PIL import Image
import numpy as np

SRC = sys.argv[1]
OUT = 'public/life/share'

def yellow_count(im):
    a = np.asarray(im.convert('RGB')).astype(np.float32) / 255.0
    mx, mn = a.max(2), a.min(2)
    d = mx - mn
    v, s = mx, np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    h = np.zeros_like(mx)
    m = d > 1e-6
    idx = m & (mx == r); h[idx] = (60 * ((g - b) / np.maximum(d, 1e-6)))[idx] % 360
    idx = m & (mx == g); h[idx] = (60 * (2 + (b - r) / np.maximum(d, 1e-6)))[idx]
    idx = m & (mx == b); h[idx] = (60 * (4 + (r - g) / np.maximum(d, 1e-6)))[idx]
    bad = (h >= 38) & (h <= 70) & (s >= 0.35) & (v >= 0.35)
    return int(bad.sum())

src = Image.open(SRC).convert('RGB')
print(f'source {src.size}')

story = src.resize((1080, 1920), Image.LANCZOS)
w = 1080
scaled = src.resize((w, round(src.height * w / src.width)), Image.LANCZOS)
top = (scaled.height - 1080) // 2
square = scaled.crop((0, top, w, top + 1080))

for name, im in (('share-story.png', story), ('share-square.png', square)):
    bad = yellow_count(im)
    print(f'{name} {im.size} yellow={bad}')
    if bad:
        raise SystemExit(f'{name} carries {bad} yellow pixels — rule 8')
    im.save(f'{OUT}/{name}', optimize=True)
    print(f'  wrote {OUT}/{name}')
