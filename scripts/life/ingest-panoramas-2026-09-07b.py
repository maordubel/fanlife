"""
שלוש הפנורמות של 7.9.2026 (המשלוח השני) — הטיילת, פינת כספה תמר, וקולנוע אלנבי.

  PANO_SRC=/tmp/pano2 python3 scripts/life/ingest-panoramas-2026-09-07b.py

מה שונה מהמשלוח הראשון (`ingest-panoramas-2026-09-07.py`): אלה לא רקעים רחבים אלא
**פנורמות גליליות** — 3264×1312 ו-3168×1344, קרוב לפי שישה־עשר פיקסלים מהקודמות, והכביש
בתחתיתן מתעקל. עיקול הוא החתימה של הטלה גלילית: הקו הישר של המדרכה נמתח סביב הצופה. לכן
הן נשמרות ברוחבן המלא ולא נחתכות ל-16:9 — הרוחב הזה הוא בדיוק שדה הראייה שהשחקן יסובב בו
את הראש (`lib/life/city/pano.ts`), ולחתוך אותו זה לזרוק את מה שנשלח.

התמונה הרביעית נפסלה, ולא בגלל איכות: היא אותו קולנוע **במראה** — האגף העגול עבר משמאל
לימין — והשלט שעליה ג'יבריש. זה בדיוק הכשל שכבר תועד (`docs/life/CITY-BRIEF-2026-09-07.md`,
הגבלה 3), והתשובה לו היא שלט חדש שנתלה מעל הישן, לא היפוך חזרה. עד שיהיה שלט — היא לא
נכנסת. הרביעית לא אבדה; היא פשוט לא נשלחת עם כיתוב שאי אפשר לקרוא.

חוק הצהוב חל כאן כמו על כל ציור: 0.08% בטיילת, 1.51% בפינת תמר, 1.20% בקולנוע — כולם
מסובבים לחום החם באותה סיבוב שקורא cut-cards, ונמדדים שוב על הבייטים שנשמרו.
"""
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from importlib.machinery import SourceFileLoader  # noqa: E402

cards = SourceFileLoader('cards', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cut-cards.py')).load_module()

HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(HERE, '..', '..', 'public', 'life', 'art')
SRC = os.environ.get('PANO_SRC', '/tmp/pano2')

# file → (key, מה זה, קו האופק כשבר מהגובה — נמדד על התמונה, לא מוערך)
JOBS = [
    ('promenade-bauhaus.jpg', 'panoPromenade', 'הטיילת, הבניין העגול מול הים', 0.720),
    ('tamar-corner.jpg', 'panoTamar', 'פינת קפה תמר — מאפייה, חנות ספרים, גלידריה', 0.735),
    ('cinema-allenby.jpg', 'panoCinema', 'קולנוע אלנבי, הצומת', 0.735),
    # 7.9.2026, אחרי הראשונות: *"קח גם את שדרות ירושלים ביפו ליד בלומפילד."* — וזה בדיוק
    # המקום הנכון, כי זאת הדרך אל האצטדיון. המסגרת הדקורטיבית סביבה נחתכה לפני הקליטה;
    # בתלת־ממד מסגרת היא לא קישוט אלא קיר.
    ('jerusalem-blvd.jpg', 'panoJaffa', 'שדרות ירושלים, יפו — הדרך לבלומפילד', 0.70),
    # *"אוסישקין מבחוץ."* — הפינה עם הגג הירוק, מהרחוב. זאת הפנורמה שפותחת את האולם:
    # `panoUssHall` שכבר רשום במשחק הוא ממלא מקום (ציור שטוח משוכפל), וזה הדבר האמיתי.
    ('uss-outside.jpg', 'panoUssOutside', 'אוסישקין מבחוץ — הפינה, הגג הירוק', 0.745),
    # בלומפילד מבחוץ, שתי נקודות. *"תוציא עבודה מושלמת מכל התמונות שיש לך."* אלה שתי
    # התחנות של הדרך פנימה: הרחוב לאורך החזית, ואז המרחב מתחת ליציע עם הקרוסלות והדלת.
    ('bloom-facade.jpg', 'panoBloomGate', 'בלומפילד — מתחת ליציע, הקרוסלות והדלת', 0.615),
    ('bloom-gate.jpg', 'panoBloomFacade', 'בלומפילד — החזית מהרחוב, עמוד התאורה', 0.575),
    # ארבעה חדרים. אלה לא רחובות: הקירות בשלושה־ארבעה מטר, לא בשלושים, ולכן גם קו האופק
    # נמוך יותר וגם הרדיוס. הרצפה שלהם היא מתנה — מרצפות טרצו והקסגון מיושרות מושלם.
    ('room-bedroom.jpg', 'panoRoomBed', 'החדר של פוגי — המיטה, הילקוט, הנעליים', 0.560),
    ('room-kitchen.jpg', 'panoRoomKitchen', 'המטבח — החלון, המקרר, שולחן האוכל', 0.545),
    ('room-living.jpg', 'panoRoomLiving', 'הסלון — הספה, הטרנזיסטור, הדלת', 0.545),
    ('room-grocery.jpg', 'panoRoomGrocery', 'המכולת — הדלפק, המאזניים, הרחוב בחוץ', 0.560),
]

# רוחב היעד. 2560 ולא 3264: בטלפון החלון הוא בערך 30° מתוך 140°, כלומר כחמישית מהרוחב —
# 2560 נותן 550 פיקסלים על מסך של 390, כלומר עדיין מעל צפיפות המסך, ומוריד שליש ממשקל הקובץ.
TARGET_W = 2560


def quantise(im: Image.Image) -> Image.Image:
    """כמו כל רקע אחר בארכיון: לוח של 256 צבעים. הלוח נבנה מהתמונה **אחרי** הטיפול, ולכן
    הקוונטיזציה לא יכולה להמציא גוון שחוק הצהוב כבר הוציא."""
    return im.convert('P', palette=Image.ADAPTIVE, colors=256, dither=Image.FLOYDSTEINBERG)


def treat(im: Image.Image) -> tuple[Image.Image, float]:
    a = np.asarray(im.convert('RGB'))
    before = cards.fraction_yellow(a)
    return Image.fromarray(cards.deyellow(a)), before


def main() -> None:
    manifest_path = os.path.join(ART, 'manifest.json')
    manifest = json.load(open(manifest_path, encoding='utf-8'))
    manifest.setdefault('panoramas', {})
    for filename, key, what, horizon in JOBS:
        path = os.path.join(SRC, filename)
        if not os.path.exists(path):
            print(f'{key}: source missing ({path})')
            continue
        im = Image.open(path).convert('RGB')
        w, h = im.size
        height = round(TARGET_W * h / w)
        # להקטין ואז לטפל, לעולם לא הפוך: LANCZOS ממציא צבעי ביניים, וממוצע של חום מטופל
        # עם שכנו יכול לנחות בחזרה בתוך הפס. נמדד על מה שנשמר.
        small = im.resize((TARGET_W, height), Image.LANCZOS)
        out, before = treat(small)
        out_path = os.path.join(ART, f'{key}.png')
        quantise(out).save(out_path, 'PNG', optimize=True)
        again = cards.fraction_yellow(np.asarray(Image.open(out_path).convert('RGB')))
        # צבע הכביש ממש מתחת לרגליים: החציון של שני האחוזים התחתונים של מה שנשמר. הוא נמדד
        # ולא נבחר, ו-`lib/life/city/pano.ts` נושא בדיוק את שלושת המספרים האלה.
        saved = np.asarray(Image.open(out_path).convert('RGB'))
        near = np.median(saved[int(saved.shape[0] * 0.98):].reshape(-1, 3), axis=0).astype(int).tolist()
        manifest['panoramas'][key] = {
            'w': TARGET_W, 'h': height,
            'horizon': horizon,
            'bytes': os.path.getsize(out_path),
            'yellowLeft': round(again, 6),
            'source': 'maor-2026-09-07-panoramas-b',
            'whatHe': what,
            'nearRgb': near,
        }
        print(f'{key}: {what} — {TARGET_W}×{height}, yellow {before * 100:.2f}% → {again * 100:.2f}% '
              f'({os.path.getsize(out_path) // 1024} KB), nearRgb {near}')
        if again > 0:
            raise SystemExit(f'STILL YELLOW: {key}')
    json.dump(manifest, open(manifest_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('manifest updated')


if __name__ == '__main__':
    main()
