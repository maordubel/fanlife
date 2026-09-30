#!/usr/bin/env python3
"""
הפנים בתיבה הן הפנים שעומדות בחדר — 2000–2026 (21.9.2026).

`life:sync` (כלל 85) העמיד כל מי שמדבר בחדר, על הגוף שלו בשנים האלה (`castFigures.ts`).
הפנים בתיבה לא הלכו איתו: ניקו, גור, יונתן, **דור** והילד דיברו כולם עם `faceYoung` —
נער בן שלוש-עשרה שה-de-yellow שרף לו את הלחי — בזמן שעל הרצפה עמדו גבר, גבר, גבר,
צעירה וילד; אילן השכן דיבר עם הפנים של **רפי**; ענבל ותמר עם הפנים של **לימור**;
רומא ואולי עם אותו `faceSupporter`. כלל 67: פלייט של אדם נחתך מהפיגורה של אותו אדם.

אז לכל גוף תחליף יש כאן לוח שנחתך **ממנו** — אותה שיטה בדיוק של
`make-faces.py` (ריבוע סביב הראש, קצת אוויר מעל השיער, הכתפיים בפנים, על הקרם של
`facePogi`) — ו-`FACES_2000` ב-`castFigures.ts` מחבר את השם ללוח. שני אנשים שעומדים על
אותו גוף מקבלים אותם פנים, וזה נכון: זה אותו תחליף, ו-`life:sync` כבר בודק שהם לא
נפגשים באותו פרק. כשגוף משלהם יגיע (ART-PROMPTS §16), הלוח נחתך ממנו מחדש בשורה אחת.

    python3 scripts/life/cast-faces-2026-09-21.py
    python3 scripts/life/to-webp-2026-09-13.py && python3 scripts/life/to-webp-2026-09-13.py --index
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ART = Path(__file__).resolve().parents[2] / 'public' / 'life' / 'art'
CREAM = (0xED, 0xE6, 0xD8)
SIZE = 320

# לוח ← הגוף שהאדם עומד עליו ב-2000–2026 (`CAST_2000`)
FACES: dict[str, str] = {
    # the key names the BODY, not a person: two people on one stand-in share it, and when
    # one of them gets a body of their own, their plate gets their own name
    'faceStandA1': 'adultA1',
    'faceStandA2': 'adultA2',
    'faceStandA4': 'adultA4',
    'faceStandA6': 'adultA6',
    'faceStandB1': 'adultB1',
    'faceStandB2': 'adultB2',
    'faceStandB3': 'adultB3',
    'faceStandB4': 'adultB4',
    'faceStandB5': 'adultB5',
    'faceStandB6': 'adultB6',
    'faceStandB7': 'adultB7',
    # and two people whose grown body exists and whose box still showed the 1980s board:
    # Efi at twelve (a stageA2 crop) and Kobi at forty (the 1986 concept), both photo-real
    # men on the floor from 1990/1996 on
    'faceEfi96': 'efi96',
    'faceKobi90': 'kobi90-stand',
    # the 1980s under their OWN keys (21.9.2026): until today these seven were crops of the
    # first concept board — drawn, big-eyed, a cartoon family talking in a photographed
    # world. Maor: "אתה מציג את פוגי כילד כציור — זו טעות." Every one of them is cut now
    # from the photographed body that stands in the room in those years.
    'faceKobi': 'kobi',
    'faceRachel': 'rachel',
    # the pose that looks at the camera: `ofir` and `amit` stand in profile
    'faceOfir': 'ofir-arms',
    'faceAmit': 'amit-arms',
    'faceEfi': 'efi',
    'faceKeren': 'keren',
    # "ילד" / "ילד מהשכונה" — a boy of the neighbourhood, from the classroom sheet: the crowd
    # sheets' boys carry the de-yellow damage in their skin, and `pupil-pass` is a back view
    'faceKid': 'pupil-sideA',
}


def head_box(alpha: np.ndarray, until: float = 0.2) -> tuple[int, int, int, int]:
    h, w = alpha.shape
    ys, xs = np.where(alpha[: int(h * until)] > 40)
    if len(ys) == 0:
        return 0, 0, w, min(h, w)
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


def plate(figure: str) -> Image.Image:
    im = Image.open(ART / f'{figure}.webp').convert('RGBA')
    alpha = np.array(im.split()[-1])
    l, t, r, b = head_box(alpha, 0.2)
    canvas = Image.new('RGBA', (r - l, b - t), (*CREAM, 255))
    canvas.paste(im, (-l, -t), im)
    out = canvas.resize((SIZE, SIZE), Image.LANCZOS)
    out = out.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
    return out.convert('RGB')


def main() -> None:
    manifest = json.loads((ART / 'manifest.json').read_text(encoding='utf-8'))
    rows = manifest.setdefault('portraits', {})
    for key, figure in FACES.items():
        out = plate(figure)
        path = ART / f'{key}.png'
        out.save(path, optimize=True)
        rows[key] = {'w': SIZE, 'h': SIZE, 'bytes': os.path.getsize(path), 'yellowLeft': 0, 'source': f'cut from {figure}'}
        print(f'{key:16s} ← {figure}')
    (ART / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
