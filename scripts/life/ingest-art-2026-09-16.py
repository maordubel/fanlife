#!/usr/bin/env python3
"""
קליטת מסירת הארט של 16.9.2026 — the seventeen files Maor's art run returned.

  python3 scripts/life/ingest-art-2026-09-16.py [--src DIR]

The delivery is the answer to `docs/life/ART-PROMPTS-2026-09-16.md`: eight close-up
plates at 788x1400, seven re-cut expression plates at 130x260, and Freddy and Melamed
re-drawn at 320x320. Its own README is explicit that it did NOT de-yellow anything and
did NOT convert to WebP -- "this is an art delivery before the cleaning and conversion
step defined in the request as happening on your side". This script is that step.

Three rules do the work and each one is here because it was got wrong before:

  * **Rule 44 -- de-yellow AFTER the resize.** LANCZOS interpolates, so a plate that is
    clean at source can come out of a downscale with a few hundred pixels inside the
    band: `freddy` produced 303 from the resize alone. Treating first and resizing after
    is treating the wrong pixels.
  * **Rule 61 -- count on the decoded bytes, with alpha.** The number that matters is
    what a browser paints, not what PIL held before the encoder ran. So every file is
    re-opened from disk after it is written and counted through `build_art.count_yellow`,
    which skips anything with `a < 8`. Counting `convert('RGB')` on an RGBA image invents
    yellow out of the transparent border -- twice, in one session.
  * **Lossless WebP.** Lossy WebP puts yellow back at decode (rule 27). `lossless=True`
    is what turns "no yellow" from a sample into a property of the file.

Sizes are the delivery's own and are NOT changed: the plates arrive at a uniform 130
wide because they were cut one whole column at a time, which is the point -- the widths
they replace (102 to 202) are what a cut across a sheet's gutter looks like, and that is
the bug this delivery exists to fix.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PIL import Image  # noqa: E402

import numpy as np  # noqa: E402

import deyellow_fast  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'public/life/art')

_BUILD_ART, K = deyellow_fast.constants()

# folder -> [(delivered file stem, asset key)]
PLAN = {
    'closeups': [
        ('cuKobiTable', 'cuKobiTable'),
        ('cuKobiWhere', 'cuKobiWhere'),
        ('cuOfir90', 'cuOfir90'),
        ('cuRachelNu', 'cuRachelNu'),
        ('cuRachelWatch', 'cuRachelWatch'),
        ('cuTeacherShare', 'cuTeacherShare'),
        ('cuUsherNight', 'cuUsherNight'),
        # cuPogiReveal is deliberately NOT here: the delivery's own README says it is a
        # PNG export of `tunnelReveal.webp` with the same decoded pixels. Re-ingesting it
        # under a second name would put the same picture on disk twice and let the two
        # drift. It keeps its fallback, which already points at `tunnelReveal`.
    ],
    'plates': [
        ('faceRachel90-angry', 'faceRachel90-angry'),
        ('faceRachel90-nu', 'faceRachel90-nu'),
        ('faceRachel90-side', 'faceRachel90-side'),
        ('faceRachel90-smile', 'faceRachel90-smile'),
        ('faceRachel90-worried', 'faceRachel90-worried'),
        ('faceTeacher', 'faceTeacher'),
        ('faceTeacher-smile', 'faceTeacher-smile'),
    ],
    'portraits': [
        ('faceFreddy', 'faceFreddy'),
        ('faceMelamed', 'faceMelamed'),
    ],
}


def ingest(src_png: str, key: str) -> dict:
    im = Image.open(src_png)
    size, mode = im.size, im.mode
    source = im.convert('RGBA') if im.mode in ('RGBA', 'LA', 'P') else im.convert('RGB')
    arr = np.array(source)
    before = deyellow_fast.count_yellow(arr, K)
    # No resize here: the delivery is already at the target sizes the brief asked for.
    # De-yellow is still last, because that is the only order rule 44 permits and the
    # next person to add a resize to this function must not have to notice.
    if arr.shape[-1] == 4:
        treated, moved = deyellow_fast.deyellow(arr[..., :3], K)
        treated = np.dstack([treated, arr[..., 3]])
    else:
        treated, moved = deyellow_fast.deyellow(arr, K)
    dest = os.path.join(OUT, f'{key}.webp')
    Image.fromarray(treated).save(dest, 'WEBP', lossless=True, quality=100, method=6)
    # Rule 61: re-open from disk and count what a browser would actually paint.
    after = deyellow_fast.count_yellow(np.array(Image.open(dest)), K)
    return {
        'key': key, 'size': size, 'mode': mode,
        'yellow_before': before, 'yellow_after': after, 'moved': moved,
        'bytes': os.path.getsize(dest),
    }


# Which manifest section each key belongs in. The registry is what the yellow proof and
# the art audit walk (rule 61 and the sixty-five-file hole that taught it), so a file that
# lands on disk without a row here is a file nothing checks.
SECTION = {'closeups': 'plates', 'plates': 'portraits', 'portraits': 'portraits'}


def register(rows: list, folder_of: dict) -> None:
    import json
    path = os.path.join(OUT, 'manifest.json')
    with open(path, encoding='utf-8') as fh:
        manifest = json.load(fh)
    for row in rows:
        section = SECTION[folder_of[row['key']]]
        manifest.setdefault(section, {})[row['key']] = {
            'w': row['size'][0], 'h': row['size'][1], 'bytes': row['bytes'],
            'yellowLeft': row['yellow_after'], 'source': 'art delivery 2026-09-16',
        }
    # indent=1, key order preserved: writing indent=2 once reformatted 8,768 lines and
    # buried a 24-line change inside it.
    with open(path, 'w', encoding='utf-8') as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=1)
        fh.write('\n')


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True, help='the unzipped THE-WORKER-ART-2026-09-16 folder')
    args = ap.parse_args()

    rows, missing, dirty, folder_of = [], [], [], {}
    for folder, pairs in PLAN.items():
        for stem, key in pairs:
            path = os.path.join(args.src, folder, f'{stem}.png')
            if not os.path.exists(path):
                missing.append(path)
                continue
            row = ingest(path, key)
            rows.append(row)
            folder_of[key] = folder
            if row['yellow_after'] > 0:
                dirty.append(row)
    register(rows, folder_of)

    width = max((len(r['key']) for r in rows), default=10)
    for r in rows:
        print(f"{r['key']:<{width}}  {str(r['size']):>12}  {r['mode']:<5}  "
              f"yellow {r['yellow_before']:>6} -> {r['yellow_after']:<4}  moved {r['moved']:>7}  {r['bytes'] / 1024:6.1f} KB")

    if missing:
        print('\nMISSING:')
        for m in missing:
            print(f'  {m}')
    if dirty:
        print('\nSTILL YELLOW after treatment -- do not ship:')
        for r in dirty:
            print(f"  {r['key']}: {r['yellow_after']}")
    print(f"\n{len(rows)} written, {len(missing)} missing, {len(dirty)} dirty")
    return 1 if (missing or dirty) else 0


if __name__ == '__main__':
    raise SystemExit(main())
