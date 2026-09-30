#!/usr/bin/env python3
"""
הרקעים של 27.9.2026 — החבילה THE-WORKER-LIFE-BACKGROUNDS-2026-09-27 (18) ושלושה מהתיקייה המאושרת.

  WORKER_BG=<pack folder> WORKER_OK=<approved folder> python3 scripts/life/ingest-backgrounds-2026-09-27.py

החבילה נבנתה לפי `docs/life/ART-BACKDROPS-NEEDED-2026-09-27.md`: אותה מצלמה של החדר הקיים, בעשור
אחר. ה-README שלה אומר שהן טיוטות, 1672×941, שלא נוקו מצהוב ושהאצטדיונים אינם שחזור אדריכלי
מאומת — וזה נרשם בשורה (`conceptHe`) ולא מוסתר (כלל 16).

הצינור הוא הצינור של הפרויקט: PNG ל-`public/life/art` → `finish-backdrops.py` (פלטה, צהוב דרך
הפלטה, רצועות sky/ground) → `to-webp-2026-09-13.py` (WebP, צהוב נמדד על הפענוח — כלל 61).
`ramatGan` נכתב **על אותו שם** (הכלל של מאור: לדרוס ישן באותו שם) — ולכן החדר נמדד מחדש.
"""
import json
import os
import subprocess
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
ART = os.path.join(ROOT, 'public/life/art')
PACK = os.environ.get('WORKER_BG', '/tmp/bg/THE-WORKER-LIFE-BACKGROUNDS-2026-09-27')
OK = os.environ.get('WORKER_OK', '/mnt/user-data/uploads/גרפיקה מאושרת')

CONCEPT = 'קונספט לפי תיאור, לא שחזור אדריכלי מאומת (README של החבילה, 27.9.2026)'

# key → (source file, whatHe, concept)
BACKGROUNDS = {
    'ramatGan': (f'{PACK}/01-priority-A/ramatGan.png', 'אצטדיון רמת גן — גמרי 1999–2000', True),
    'kiosk00': (f'{PACK}/01-priority-A/kiosk00.png', 'הקיוסק של רפי — שנות ה־2000', False),
    'kiosk10': (f'{PACK}/01-priority-A/kiosk10.png', 'הקיוסק של רפי — שנות ה־2010', False),
    'kiosk20': (f'{PACK}/01-priority-A/kiosk20.png', 'הקיוסק של רפי — שנות ה־2020', False),
    'street10': (f'{PACK}/01-priority-A/street10.png', 'הרחוב ליד הבית — 2010–2026', False),
    'busStation20': (f'{PACK}/01-priority-A/busStation20.png', 'תחנת אוטובוסי אוהדים — 2017–2026', False),
    'menoraSeats': (f'{PACK}/01-priority-A/menoraSeats.png', 'היכל מנורה — מהמושבים, 2025', True),
    'schoolyard20': (f'{PACK}/01-priority-A/schoolyard20.png', 'חצר בית הספר — 2021', False),
    'gate7Old': (f'{PACK}/02-priority-B/gate7Old.png', 'בלומפילד מבחוץ — לפני השיפוץ, 2000–2015', False),
    'allenby20': (f'{PACK}/02-priority-B/allenby20.png', 'פינת אלנבי — 2010–2026', False),
    'pitchPark00': (f'{PACK}/02-priority-B/pitchPark00.png', 'המגרש השכונתי — דשא טבעי, 2000', False),
    'teddy2010': (f'{PACK}/03-extras/teddy2010.png', 'טדי — 2010, יציע האורחים', True),
    'salzburg2010': (f'{PACK}/03-extras/salzburg2010.png', 'זלצבורג — 2010, יציע האורחים', True),
    'lyon2010': (f'{PACK}/03-extras/lyon2010.png', 'ליון, ז׳רלאן — 2010, יציע האורחים', True),
    'benfica2010': (f'{PACK}/03-extras/benfica2010.png', 'ליסבון, אצטדיון האור — 2010', True),
    'botevgradOut2026': (f'{PACK}/03-extras/botevgradOut2026.png', 'בוטבגרד — מחוץ לאולם, 2026', True),
    'botevgradSeats2026': (f'{PACK}/03-extras/botevgradSeats2026.png', 'בוטבגרד — מהמושבים, 2026', True),
    # the approved folder — three paintings Maor released for the city (27.9.2026)
    'jaffa00': (f'{OK}/יפו שנות 2000.png', 'שדרות ירושלים ומגדל השעון, יפו — שנות ה־2000', False),
    'gate5Stand': (f'{OK}/כניסה ליציע של שער 5 שנות 90 2000.png', 'הכניסה ליציע שער 5 — שנות ה־90 וה־2000', False),
    'ussExtDusk': (f'{OK}/ussishkin-exterior-1980s-v2.png', 'אוסישקין מבחוץ, ערב משחק', False),
}

# the pitch and the grass take GREEN, not brown, where they cross the yellow band
GREEN = {
    'ramatGan': 0.45, 'pitchPark00': 0.42, 'teddy2010': 0.55, 'salzburg2010': 0.6,
    'lyon2010': 0.5, 'benfica2010': 0.45,
}


def main():
    manifest_path = os.path.join(ART, 'manifest.json')
    manifest = json.load(open(manifest_path, encoding='utf8'))
    backdrops = manifest.setdefault('backdrops', {})
    for key, (src, what, concept) in BACKGROUNDS.items():
        if not os.path.exists(src):
            print(f'!! missing {src}')
            return 1
        im = Image.open(src).convert('RGB')
        # 2048-wide approved paintings come down to the pack's width; the pipeline caps height
        if im.width > 2048:
            im = im.resize((2048, round(im.height * 2048 / im.width)), Image.LANCZOS)
        im.save(os.path.join(ART, f'{key}.png'))
        row = {'source': 'maor-2026-09-27-backgrounds', 'whatHe': what}
        if concept:
            row['conceptHe'] = CONCEPT
        backdrops[key] = row
    json.dump(manifest, open(manifest_path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    # finish-backdrops keeps its own GREEN_BELOW table; add ours for this run
    fb = os.path.join(HERE, 'finish-backdrops.py')
    env = dict(os.environ, WORKER_GREEN_EXTRA=json.dumps(GREEN))
    subprocess.run([sys.executable, fb, *BACKGROUNDS], check=True, env=env)
    subprocess.run([sys.executable, os.path.join(HERE, 'to-webp-2026-09-13.py')], check=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
