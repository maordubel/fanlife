#!/usr/bin/env python3
"""
הנייר של 1999 ושל 2000 — nine scans Maor supplied, treated as documents.

  python3 scripts/life/ingest-docs-2026-09-16.py --src DIR

`ingest-1986-docs.py` did this once before for the ticket and the four pages of מעריב
ספורט that close Stage A. This is the same job for the two cup finals at the other end of
the story, and it is a separate dated script for the same reason that one was: a document
is not art, so the rules it obeys are different from the rules a figure sheet obeys.

**What made the cut, and what did not.** Sixteen scans arrived. Nine are here. The seven
that are not include three good photographs — players lifting a cup, a man in a scarf
lifting a cup, an action shot against a yellow crowd — and every one of them was left out
for the same reason: **nothing is printed on them.** A photograph with no caption, no
masthead and no date cannot be placed on a chapter's card without the card making a claim
about when it was taken, and rule 11 says this game does not make claims it cannot source.
Every one of the nine below identifies ITSELF: the plaque names the season, the ticket
names the date and both fixtures, the front pages carry their own mastheads, the clipping
carries its own printed caption, the season books print the club, the ground and the price.
That is why their captions in `lib/life/history/days.ts` are transcriptions and not
descriptions — quoting what a page says is the one way to put words near a document
without putting words on it (rule 49).

Three rules from the pipeline, unchanged, and each is here because it was got wrong before:

  * **Rule 44 — de-yellow AFTER the resize.** LANCZOS averages a legal olive with its
    neighbour and lands the result inside the band, so treating first and resizing after
    treats the wrong pixels.
  * **Rule 61 — this script writes PNG and FINISHES WITH THE CONVERTER.** The rule is
    blunt about it: everybody who writes to `public/life/art` ends by running
    `to-webp-2026-09-13.py`, which encodes, DECODES, counts yellow on the bytes that get
    saved, cleans whatever survived and encodes again — and drops to lossless only for a
    file that will not reach zero any other way. Writing lossless WebP here directly was
    the first version of this script and it was wrong twice: it is a second definition of
    "how this folder is encoded", and it cost 3.6 MB for nine documents where the
    canonical converter costs 0.9 MB with the same proof. The converter is invoked at the
    end of `main`, so nobody has to remember.
  * **No exemption for aged paper, and none for a yellow masthead.** `דאבל טיים` is set in
    yellow on blue across the top of מעריב ספורט and it goes through the same rotation as
    every other pixel in this folder. Rule 8 is absolute, rule 27 gives artwork no
    exemption, and `ingest-1986-docs.py` already settled the same question for four pages
    of 1986 newsprint: *the first thing an exemption costs is the meaning of the rule.*

Nothing here deskews. The 1986 ticket was photographed at an angle on a table and had to
be flattened before a child's price could be read off it; these nine are flat scans
already, and a perspective transform applied to a document that does not need one is a
document this game has altered for no reason.
"""
import argparse
import json
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

# (delivered file, DOC key, max width)
#
# A max width of 0 means "the scan's own size". Six of the nine arrive smaller than any
# cap this script would impose, and upscaling a 250-pixel season book to look like the
# others would paste it — the lesson of `faceFreddy` (rule 67), applied to paper.
PLAN = [
    # 19.5.1999
    ('9ed96194-image.png', 'docCup99', 860),
    ('cd5022e9-image.png', 'docPage99', 1024),
    ('a81341f1-image.png', 'docTikva99', 0),
    ('b32b53ad-image.png', 'docSeason9899', 0),
    # 13.5.2000
    ('6052324f-image.png', 'docSeason9900', 0),
    # 17.5.2000
    ('0bf3e93f-image.png', 'docTicket2000', 0),
    ('749b8aaa-image.png', 'docProgramme2000', 0),
    ('dc111272-image.png', 'docRedBall2000', 860),
    ('4f9b63bf-image.png', 'docDouble2000', 860),
]


def ingest(src: str, key: str, max_w: int) -> dict:
    im = Image.open(src)
    source = im.convert('RGBA') if im.mode in ('RGBA', 'LA', 'P') else im.convert('RGB')
    if max_w and source.width > max_w:
        height = max(1, round(source.height * max_w / source.width))
        source = source.resize((max_w, height), Image.LANCZOS)
    arr = np.array(source)
    before = deyellow_fast.count_yellow(arr, K)
    if arr.shape[-1] == 4:
        treated, moved = deyellow_fast.deyellow(arr[..., :3], K)
        treated = np.dstack([treated, arr[..., 3]])
    else:
        treated, moved = deyellow_fast.deyellow(arr, K)
    dest = os.path.join(OUT, f'{key}.png')
    Image.fromarray(treated).save(dest, 'PNG', optimize=True)
    # The count here is on the treated ARRAY, which is exact for a lossless PNG. The count
    # that ships is the converter's, taken off the decoded WebP — see `--index`.
    after = deyellow_fast.count_yellow(np.array(Image.open(dest)), K)
    return {
        'key': key,
        'size': source.size,
        'from': im.size,
        'yellow_before': before,
        'yellow_after': after,
        'moved': moved,
        'bytes': os.path.getsize(dest),
    }


def convert() -> int:
    """רול 61 — the one converter, called rather than described."""
    import subprocess
    script = os.path.join(HERE, 'to-webp-2026-09-13.py')
    print('\n--- to-webp-2026-09-13.py ---')
    return subprocess.call([sys.executable, script])


def register(rows: list) -> None:
    path = os.path.join(OUT, 'manifest.json')
    with open(path, encoding='utf-8') as fh:
        manifest = json.load(fh)
    for row in rows:
        manifest.setdefault('docs', {})[row['key']] = {
            'w': row['size'][0],
            'h': row['size'][1],
            # `bytes` and `yellowLeft` are placeholders until the converter runs; it
            # rewrites both from the bytes that actually end up in the folder (`--index`),
            # which is the only number `tests/life.test.ts` should ever read.
            'bytes': row['bytes'],
            'yellowLeft': row['yellow_after'],
            'source': 'scans 2026-09-16',
        }
    # indent=1, key order preserved — writing indent=2 once reformatted 8,768 lines.
    with open(path, 'w', encoding='utf-8') as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=1)
        fh.write('\n')


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True, help='the folder holding the delivered scans')
    ap.add_argument('--no-convert', action='store_true', help='leave the PNGs on disk (rule 61 says do not)')
    args = ap.parse_args()

    rows, missing, dirty = [], [], []
    for name, key, max_w in PLAN:
        path = os.path.join(args.src, name)
        if not os.path.exists(path):
            missing.append(path)
            continue
        row = ingest(path, key, max_w)
        rows.append(row)
        if row['yellow_after'] > 0:
            dirty.append(row)
    register(rows)

    width = max((len(r['key']) for r in rows), default=10)
    for r in rows:
        print(
            f"{r['key']:<{width}}  {str(r['from']):>12} -> {str(r['size']):<12}  "
            f"yellow {r['yellow_before']:>7} -> {r['yellow_after']:<4}  moved {r['moved']:>8}  {r['bytes'] / 1024:7.1f} KB"
        )
    if missing:
        print('\nMISSING:')
        for m in missing:
            print(f'  {m}')
    if dirty:
        print('\nSTILL YELLOW after treatment -- do not ship:')
        for r in dirty:
            print(f"  {r['key']}: {r['yellow_after']}")
    print(f'\n{len(rows)} written, {len(missing)} missing, {len(dirty)} dirty')
    if missing or dirty:
        return 1
    return 0 if args.no_convert else convert()


if __name__ == '__main__':
    raise SystemExit(main())
