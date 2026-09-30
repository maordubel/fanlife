#!/usr/bin/env python3
"""
הרקעים של 2000–2026 — שבעה-עשר ציורים, 21.9.2026.

  WORKER_BG=<folder> python3 scripts/life/ingest-backgrounds-2026-09-21.py

מאור שלח את החבילה `THE-WORKER-BACKGROUNDS-2000-2026-17` לפי `docs/life/ART-PROMPTS-2000-2026.md`:
ארבעה-עשר הפרומטים המקוריים, `hallNew` (§15), ושני יציעי בלומפילד (§17). ה-README שלה
אומר שהם נוצרו במחולל תמונות לפי הפרומטים, ששלושה מהם (`bloomOldTerrace`, `bloomNewTerrace`,
`driveIn`) הם **קונספט ולא שחזור אדריכלי**, ושהאולם באירופה הוא חלל גנרי — וזה נרשם
ב-`content/manual/asset-provenance.json` ולא מוסתר (כלל 16).

הצינור הוא הצינור של הפרויקט, בלי קיצור: כל ציור נכתב כ-PNG ל-`public/life/art` בגודל
שהגיע (1672 רוחב — מתחת לגבול ה-1536 גובה של `finish-backdrops.py`), ואז:
  1. `finish-backdrops.py <keys>` — פלטה של 160 צבעים, ניקוי צהוב דרך הפלטה, ורצועות
     `--sky`/`--ground` לטלפון (כלל 52);
  2. `to-webp-2026-09-13.py` — WebP, והוכחה על הפענוח שאין צהוב (כלל 61), ו-`--index`.
"""
import json
import os
import subprocess
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
ART = os.path.join(ROOT, 'public/life/art')
SRC = os.environ.get('WORKER_BG', '/tmp/claude-0/sp/bg')

# key → (whatHe, concept) — concept: לא שחזור אדריכלי מאומת, לפי ה-README של החבילה
BACKGROUNDS = {
    'homeAdult': ('הבית של פוגי הבוגר — סלון ומטבח פתוח', False),
    'flatAway': ('דירה שכורה בחו״ל, ערב', False),
    'workshopFix': ('הסדנה של לירון, 2006', False),
    'communityRoom': ('חדר קהילה — שולחן ארוך, לוח שעם', False),
    'storeroom': ('מחסן ציוד קהילתי', False),
    'officeOwner': ('משרד ענף הבעלות, 2025', False),
    'deskNewsroom': ('מערכת קטנה', False),
    'rehearsal': ('חדר חזרות, 2013', False),
    'driveIn': ('הדרייב אין, 2015 — קונספט', True),
    'arenaEuroOut': ('רחבה מול אולם באירופה — חלל גנרי', True),
    'arenaEuroSeats': ('מהמושבים באותו אולם — חלל גנרי', True),
    'portEurope': ('טרמינל הגעה באירופה', False),
    'pitchSmall': ('מגרש קטן מודרני, דשא סינתטי', False),
    'bedroom00': ('החדר של פוגי בן 22, 2000', False),
    'hallNew': ('אולם אימון שכור, 2007', False),
    'bloomOldTerrace': ('היציע של בלומפילד 2000–2016 — טיוטת קונספט', True),
    'bloomNewTerrace': ('היציע של בלומפילד המחודש — טיוטת קונספט', True),
}


def main():
    manifest_path = os.path.join(ART, 'manifest.json')
    manifest = json.load(open(manifest_path, encoding='utf8'))
    backdrops = manifest.setdefault('backdrops', {})
    for key, (what, concept) in BACKGROUNDS.items():
        src = os.path.join(SRC, f'{key}.png')
        if not os.path.exists(src):
            print(f'!! missing {src}')
            return 1
        im = Image.open(src).convert('RGB')
        im.save(os.path.join(ART, f'{key}.png'))
        row = backdrops.get(key, {})
        row.update({'source': 'maor-2026-09-21-backgrounds', 'whatHe': what})
        if concept:
            row['conceptHe'] = 'קונספט לפי תיאור, לא שחזור אדריכלי מאומת (README של החבילה)'
        backdrops[key] = row
    json.dump(manifest, open(manifest_path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    keys = list(BACKGROUNDS)
    subprocess.run([sys.executable, os.path.join(HERE, 'finish-backdrops.py'), *keys], check=True)
    subprocess.run([sys.executable, os.path.join(HERE, 'to-webp-2026-09-13.py')], check=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
