#!/usr/bin/env python3
"""
המסירה של 17.9.2026 — חמישה ציורים, עשרה חפצים שצולמו, ושני צינורות שונים לגמרי.

    python3 scripts/life/ingest-2026-09-17.py --src art-drop/2026-09-17

Maor delivered three kinds of thing in one folder and they are NOT one job:

  · **ציורים** — painted rooms. They go through the normal pipeline: PNG into
    `public/life/art`, `finish-backdrops.py` shrinks, quantises, **de-yellows** and writes
    the sky/ground strips (rules 44 + 52), and `to-webp-2026-09-13.py` closes it (rule 61).
    A sunlit boulevard is environment, not a document; the three-band de-yellow was built
    for exactly the stone and foliage that sits in the paint band.
  · **חפצים שצולמו** — punch-cards, coupons, magazine covers, a cinema stub. They go to
    `public/life/artefacts/` and they **keep their yellow**, because nobody chose it: it
    is the masthead פנדל was printed in and the gold X somebody punched through a bus
    card. This is rule 69's case, one folder further along, and it is granted the same
    way — measured first, shown, then asked for, as a FOLDER exemption in
    `lib/brand/yellowExemptions.ts` that `tests/brand.test.ts` re-derives from
    `content/manual/life-artefacts.json` rather than trusts.
  · **תצלומים בלי דבר מודפס עליהם** — five modern photographs of אצטדיון לאומי רמת גן.
    They are NOT shipped, and the reason is `ingest-docs-2026-09-16.py`'s reason, not a
    new one: *a photograph with no caption, no masthead and no date cannot be placed on a
    chapter's card without the card making a claim about when it was taken.* Three good
    photographs were left out of that delivery for it; five are left out of this one. They
    are reference for whoever paints the ground, and they are listed at the foot of this
    file so the next person does not go looking for them.

**למה שני מדדי צהוב ולא אחד.** The backdrops are measured to ZERO — `finish-backdrops.py`
fails the run otherwise. The artefacts are measured to a NUMBER, per file, on the decoded
bytes (rule 61), and that number is written down. An exemption is not a place yellow goes
unmeasured; it is a place it goes recorded.
"""
from __future__ import annotations

import argparse
import io
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
ART = os.path.join(ROOT, 'public/life/art')
ARTEFACTS = os.path.join(ROOT, 'public/life/artefacts')
LEDGER = os.path.join(ROOT, 'content/manual/life-artefacts.json')

# ---------------------------------------------------------------------------- ציורים ---
#
# `ramatGanGates` is the OUTSIDE of the national stadium — turnstiles, the fans on the
# forecourt, the nineties cars. `ramatGan` (5.9.2026) is the terrace INSIDE it, which is
# where the two finals are watched, so this is the arrival card and not a replacement:
# the same relationship `ground` has with `bloomfield-outside`.
#
# `ticketOffice` is a room, and it is the reason the delivery exists. See the scene.
BACKDROPS = [
    ('backdrops/ticket-office.jpg', 'ticketOffice'),
    ('backdrops/ramatgan-gates.jpg', 'ramatGanGates'),
    # ...and three that land without a scene on them, which is rule 43's own practice and
    # not a lapse of rule 48: `undercroft`, `ussHallPre`, `promenade` and `promenadeDusk`
    # all sat in `BACKDROP` before anything stood in them, on the stated reasoning that
    # "the art lands first so the 1983-2000 plan can name a place instead of describing
    # one." Rule 48's deletions were PROPS, which cost a room bytes the moment it names
    # one; an unplaced backdrop costs nothing at load, because a scene loads its own.
    # `art.ts` says which is which, per key, so neither list can quietly rot.
    ('backdrops/bus-stop-dan.jpg', 'busStopDan'),
    ('backdrops/jaffa-boulevard.jpg', 'jaffaBoulevard'),
    ('backdrops/jaffa-alley-cafe.jpg', 'jaffaAlleyCafe'),
]

# ------------------------------------------------------------ חפצים שצולמו (DOC) -------
#
# Identified by LOOKING at each one, which is the only way: the delivery note that came
# with them described a Mikasa ball and two סופרגול albums that are not in the folder, and
# named two bus cards where there are three. Every row below is what the object says about
# itself — a masthead, an issue number, a printed price, a serial — and `printedHe` is a
# transcription rather than a description, for rule 49's reason: a caption beside one of
# these is most of the way to writing on it.
#
# (delivered file, DOC key, max width, what it is, what is printed on it)
ARTEFACT_PLAN = [
    (
        'artefacts/d564c6d5-image.png', 'docPendel26', 1160,
        'שער פנדל מס׳ 26',
        'פנדל — ספורט בעולם ובארץ · העתון לספורטאי הצעיר · מס׳ 26 · 2 ל״י · "פוסטר!! כפול! הפועל כפר-סבא"',
    ),
    (
        'artefacts/1023b582-image.png', 'docPendel34', 1157,
        'שער פנדל מס׳ 34',
        'פנדל — ספורט בעולם ובארץ · העתון לספורטאי הצעיר · מס׳ 34 · 2 ל״י',
    ),
    (
        'artefacts/403453aa-image.png', 'docPendel38', 0,
        'שער פנדל מס׳ 38',
        'פנדל — ספורט בעולם ובארץ · העתון לספורטאי הצעיר · מס׳ 38 · 2 ל״י · "פוסטר ענק! יוהן קרויף"',
    ),
    (
        'artefacts/83aee7ac-image.png', 'docPendel180', 0,
        'שער פנדל ספורט מס׳ 180',
        'פנדל ספורט · 15.1.1979 · מס׳ 180 · 12 ל״י',
    ),
    (
        'artefacts/c3dc65a8-image.png', 'docToto4085', 0,
        'טופס ספורטוטו מלא',
        'המועצה להסדר ההימורים בספורט · "ספורטוטו" תל-אביב, ת.ד. 16154 · 8.6.85 · מחזור 40/85 · '
        'משחקי הליגות האוסטרליות · מחיר הטור 180 ש״ע, מחיר הטופס 25 ש״ע',
    ),
    (
        'artefacts/90dc7971-image.png', 'docTotoForms', 0,
        'חבילת טפסי טוטו ריקים',
        'המועצה להסדר ההימורים בספורט',
    ),
    (
        'artefacts/92d2e413-image.png', 'docCinemaAllenby', 0,
        'כרטיס קולנוע "אלנבי"',
        'Cinema "ALLENBY" Tel. 3820 · אולם · הצגה I · שורה 5 · כסא 10 · המחיר 35 · 40 Mils · '
        '"שמור את הכרטיס עד תום התכנה"',
    ),
    (
        'artefacts/ce653296-image.png', 'docEggedLira', 0,
        'שלושה כרטיסי נסיעה בלירות',
        'כרטיסיה 250 — מחיר כולל 25.00 ל״י, "הנחה מיוחדת: אשה מגיל 60, גבר מגיל 65" · '
        'סטודנט 250 — מחיר כולל 52.00 ל״י, "האדיבות היא דרך דו-סטרית · היה אדיב" · '
        'כרטיסית נסיעה לחודש 600 — מחיר כולל 225.00 ל״י',
    ),
    (
        'artefacts/b632b672-image.png', 'docNoarCard', 0,
        'כרטיסיית נוער ואזרח ותיק, מנוקבת',
        'כרטיסיית נוער ואזרח ותיק · "לשימוש בקווים בהם קוד המחיר 2" · 5.50 ש״ח לנסיעה · '
        'מחיר הכרטיסיה 55.00 ש״ח · "לנוער עד גיל 18, נשים בגיל 60 גברים בגיל 65" · סדרה 31',
    ),
    (
        'artefacts/1adf87a1-image.png', 'docPunchCards', 0,
        'שלוש כרטיסיות מנוקבות',
        'כרטיסיה רגילה 6.40 · כרטיסיה לזכאי 5.30 · כרטיסיה 6.40 · "כרטיסיה זו אינה ניתנת להחזרה"',
    ),
]

# --------------------------------------------------------- מה שלא נכנס, ולמה ------------
#
# Five modern photographs of אצטדיון לאומי רמת גן: the pitch from the west stand, the
# bowl from the air, the stand from the touchline, the concrete elevation from the car
# park, and `backdrops/ramatgan-interior.png` (885×346, far below any backdrop height this
# folder ships). Nothing is printed on any of them. They cannot be documents for the
# reason nine of sixteen scans were documents on 16.9.2026 and seven were not, and they
# cannot be backdrops because nothing in the game stands in a 2020s photograph.
HELD_BACK = [
    'artefacts/1afa4c0c-image.png',
    'artefacts/b78c0ce7-image.png',
    'artefacts/ce939ff1-image.png',
    'artefacts/d790743e-image.png',
    'backdrops/ramatgan-interior.png',
]

# Three of the five paintings arrive with nowhere to stand yet. They are ingested anyway
# (see `BACKDROPS`), and `docs/life/ART-REQUIRED.md` carries what each one still needs.
HELD_PAINTINGS: list[str] = []


# ---------------------------------------------------------------------------------------
# הפס הקנוני של `lib/isYellow.ts` — hue 38–70, S ≥ 0.35, V ≥ 0.35. Copied here in the
# same shape `scripts/kits/build-archive.py` copies it, and kept in step by
# `tests/brand.test.ts`, which holds the TypeScript definition and the measured numbers
# against each other.
def yellow_mask(rgb: np.ndarray) -> np.ndarray:
    a = rgb.astype(np.float32) / 255.0
    mx, mn = a.max(2), a.min(2)
    d = mx - mn
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    h = np.zeros_like(mx)
    m = d > 1e-6
    i = (mx == r) & m
    h[i] = ((g - b)[i] / d[i]) % 6
    i = (mx == g) & m
    h[i] = ((b - r)[i] / d[i]) + 2
    i = (mx == b) & m
    h[i] = ((r - g)[i] / d[i]) + 4
    h *= 60
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    return (h >= 38) & (h <= 70) & (s >= 0.35) & (mx >= 0.35)


def encode_measured(im: Image.Image, path: str) -> dict:
    """
    Encode, then DECODE THE SAVED BYTES and measure on those (rule 61).

    **וכאן לא מנקים.** `to-webp-2026-09-13.py` measures the same way and then chases the
    number to zero, because there the yellow is an artefact of a lossy encoder. Here it is
    an artefact of the OBJECT: a masthead, a punched foil X, a gold band on a coupon.
    Cleaning it would falsify the scan, which is the worse of the two failures (rule 69 §1).
    So the loop is gone and the number is written down instead.
    """
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=90, method=6)
    data = buf.getvalue()
    with Image.open(io.BytesIO(data)) as back:
        a = np.asarray(back.convert('RGB'))
    y = yellow_mask(a)
    with open(path, 'wb') as fh:
        fh.write(data)
    px = a.shape[0] * a.shape[1]
    return {
        'bytes': len(data),
        'w': a.shape[1],
        'h': a.shape[0],
        'yellowPx': int(y.sum()),
        'yellowPct': round(float(y.sum()) / max(px, 1) * 100, 3),
    }


def run(script: str, *args: str) -> int:
    print(f'\n--- {script} {" ".join(args)} ---')
    return subprocess.call([sys.executable, os.path.join(HERE, script), *args])


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True, help='the folder holding the delivery')
    ap.add_argument('--no-convert', action='store_true', help='leave the PNGs on disk (rule 61 says do not)')
    args = ap.parse_args()
    src = os.path.join(ROOT, args.src) if not os.path.isabs(args.src) else args.src

    missing = [
        os.path.join(src, name)
        for name, *_ in [(n, k) for n, k in BACKDROPS] + [(row[0], row[1]) for row in ARTEFACT_PLAN]
        if not os.path.exists(os.path.join(src, name))
    ]
    if missing:
        print('MISSING:')
        for m in missing:
            print(f'  {m}')
        return 1

    # ------------------------------------------------------------------ the paintings ---
    # Written as PNG at the delivered size. `finish-backdrops.py` owns the height cap, the
    # palette, the de-yellow and the strips; doing any of it here would be a second
    # definition of how this folder is made.
    for name, key in BACKDROPS:
        with Image.open(os.path.join(src, name)) as im:
            rgb = im.convert('RGB')
            rgb.save(os.path.join(ART, f'{key}.png'), 'PNG', optimize=True)
        print(f'{key:16s} {rgb.width}x{rgb.height}  → public/life/art/{key}.png')

    manifest_path = os.path.join(ART, 'manifest.json')
    with open(manifest_path, encoding='utf-8') as fh:
        manifest = json.load(fh)
    for _, key in BACKDROPS:
        row = manifest['backdrops'].get(key, {})
        row['source'] = 'maor-2026-09-17'
        manifest['backdrops'][key] = row
    with open(manifest_path, 'w', encoding='utf-8') as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=1)
        fh.write('\n')

    if run('finish-backdrops.py', *[key for _, key in BACKDROPS]) != 0:
        return 1

    # ------------------------------------------------------------------- the artefacts ---
    os.makedirs(ARTEFACTS, exist_ok=True)
    records = []
    for name, key, max_w, what_he, printed_he in ARTEFACT_PLAN:
        with Image.open(os.path.join(src, name)) as raw:
            im = raw.convert('RGB')
            delivered = im.size
            if max_w and im.width > max_w:
                im = im.resize((max_w, max(1, round(im.height * max_w / im.width))), Image.LANCZOS)
            row = encode_measured(im, os.path.join(ARTEFACTS, f'{key}.webp'))
        row.update({'key': key, 'file': f'{key}.webp', 'whatHe': what_he, 'printedHe': printed_he,
                    'deliveredAs': f'{delivered[0]}×{delivered[1]}'})
        records.append(row)
        print(f'{key:18s} {row["w"]:>5}x{row["h"]:<5} {row["bytes"]/1024:7.1f}KB  '
              f'yellow {row["yellowPx"]:>7} ({row["yellowPct"]:.3f}%)')

    with_yellow = [r for r in records if r['yellowPx'] > 0]
    ledger = {
        'note': (
            'חפצים שצולמו — עשרה מסמכים אמיתיים מהארכיון של צוות The Worker, נמסרו 17.9.2026. הקבצים ב-'
            'public/life/artefacts, והשדות yellowPx/yellowPct נמדדו על **הפענוח** של הבייטים שנשמרו '
            '(כלל 61) ולא על מה שהיה בזיכרון. הצהוב כאן נשאר בכוונה: הוא המסכה של פנדל, ה-X של הזהב '
            'שמישהו ניקב בכרטיסייה, והנייר שהצהיב מגיל — אף אחד לא בחר בו, וניקוי שלו מזייף את הסריקה. '
            'האישור הוא כלל 69, והוא נרשם כתיקייה ב-lib/brand/yellowExemptions.ts. '
            'printedHe הוא תעתיק של מה שכתוב על החפץ עצמו, לא תיאור שלו (כלל 49).'
        ),
        'measuredOn': '2026-09-17',
        'filesTotal': len(records),
        'filesWithYellow': len(with_yellow),
        'maxPercent': max((r['yellowPct'] for r in records), default=0.0),
        'records': records,
    }
    with open(LEDGER, 'w', encoding='utf-8') as fh:
        json.dump(ledger, fh, ensure_ascii=False, indent=1)
        fh.write('\n')
    print(f'\nartefacts: {len(with_yellow)}/{len(records)} carry yellow · '
          f'largest {ledger["maxPercent"]:.3f}% · content/manual/life-artefacts.json written')

    print('\nלא נכנסו (אין עליהם דבר מודפס · כלל 11):')
    for name in HELD_BACK:
        print(f'  {name}')
    if HELD_PAINTINGS:
        print('לא נכנסו (אין להם מקום לעמוד בו · כלל 48):')
        for name in HELD_PAINTINGS:
            print(f'  {name}')

    return 0 if args.no_convert else run('to-webp-2026-09-13.py')


if __name__ == '__main__':
    raise SystemExit(main())
