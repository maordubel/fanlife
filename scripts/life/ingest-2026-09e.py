#!/usr/bin/env python3
"""
המסירה החמישית — the supporters, and the two Bloomfields the game had not reached.

  python3 scripts/life/ingest-2026-09e.py

Three things came in with `THE-WORKER-GRAPHICS-MASTER-80S-90S-2026-09-04` that were not in
the repo, and one came in by hand:

1. **The supporter sheet** (`05-CHARACTER-REFERENCES/user-supplied/ChatGPT Image Sep 2…`):
   five of the Stage B cast on screen green, front and back, at a height the game can use
   — שחור, סוקו, אסף, שלום (the ultras activist of the 2000s, not the footballer) and
   חרמש. `KNOWN-GAPS.md` in the same package lists them as "no PNG"; this file is the
   answer to that list, for the five the sheet holds.
2. **The pose sheet** (`77eac620…`): the same five again with מלמד and פרדי, at a third of
   the height. Only the two who are on no other sheet are cut from it, upscaled, and they
   are marked `soft` in the manifest so nobody mistakes them for finished figures.
3. **Bloomfield 2000–2016 and 2019+** (`04-BLOOMFIELD/reconstruction-2000-2019plus`): the
   sixteen frames of the ground after this game's decades. They land under their own keys
   so the chapters after 2000 — and the frame of 2026 the game opens on — can name a place.
4. **The terrace panorama** Maor pasted into the chat on 5.9.2026 — the first REAL
   panorama of the eight, replacing a mirrored stand-in. It is ingested by `pano.py`,
   not here, because it did not arrive in a folder.
"""
import importlib.util
import json
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'public/life/art')
PKG = os.environ.get('WORKER_PKG', '/mnt/user-data/uploads/THE-WORKER-GRAPHICS-MASTER-80S-90S-2026-09-04')
BLOOM = os.environ.get(
    'WORKER_BLOOM',
    '/mnt/user-data/uploads/THE-WORKER-COMPLETE-ART-MASTER-2026-09-04--THE-WORKER-COMPLETE-ART-MASTER-2026-09-04/BLOOMFIELD-2000-2019-PLUS',
)


def _load(name, filename):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, filename))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


ba = _load('ba', 'build-art.py')
ig = _load('ig', 'ingest-2026-09.py')
ib = _load('ib', 'ingest-2026-09b.py')
ss = _load('ss', 'slice-sheets.py')

REFS = os.path.join(PKG, '05-CHARACTER-REFERENCES/user-supplied')
SHEET_A = os.path.join(REFS, 'ChatGPT Image Sep 2, 2026, 02_21_46 PM.png')
SHEET_B = os.path.join(REFS, '77eac620-b046-45de-a4c0-32cc324beeba.png')

# Sheet A: one row of ten figures above a row of props and five label cards.
SHEET_A_BAND = (0, 0, 1718, 446)
SHEET_A_NAMES = [
    'shachor', 'shachor-back',
    'soko', 'soko-back',
    'asaf', 'asaf-back',
    'yosef', 'yosef-back',
    'hermesh', 'hermesh-back',
]

# Sheet B, second row, by panel: (x0, x1, y0, y1, count, names). Labels sit above the
# figures and props below; both are cropped away so a column is one person.
SHEET_B_PANELS = [
    ((0, 282, 312, 420), 4, ['melamed', 'melamed-play', 'melamed-lean', 'melamed-listen']),
    # Six lawyers overlap on the sheet; three of the six cuts are one man each and the
    # other three carry a neighbour's arm, so only the clean three are kept.
    ((318, 282, 700, 420), 6, ['freddy', 'freddy-glass', None, 'freddy-drink', None, None]),
]

BLOOMFIELD = [
    # key, file, what it is for
    ('bloomOldGates', 'old-2000-2016/bloomfield-old-exterior-gates.png'),
    ('bloomOldCorner', 'old-2000-2016/bloomfield-old-master-corner.png'),
    ('bloomOldStand', 'old-2000-2016/bloomfield-old-long-stand.png'),
    ('bloomOldEnd', 'old-2000-2016/bloomfield-old-scoreboard-end.png'),
    ('bloomOldHigh', 'old-2000-2016/bloomfield-old-high-corner.png'),
    ('bloomOldTunnel', 'old-2000-2016/bloomfield-old-tunnel.png'),
    ('bloomNewInside', 'new-2019-plus/bloomfield-new-master-interior.png'),
    ('bloomNewPitch', 'new-2019-plus/bloomfield-new-pitch-level.png'),
    ('bloomNewDay', 'new-2019-plus/bloomfield-new-aerial-day.png'),
    ('bloomNewPlaza', 'new-2019-plus/bloomfield-new-exterior-plaza.png'),
    ('bloomNewSea', 'new-2019-plus/bloomfield-new-jaffa-sea.png'),
    ('bloomNewNight', 'new-2019-plus/bloomfield-new-aerial-night.png'),
    ('introFirstSight', 'intros/intro-old-first-sight.png'),
    ('introDerbyNight', 'intros/intro-old-derby-night.png'),
    ('introReturnHome', 'intros/intro-new-return-home.png'),
    ('introBeacon', 'intros/intro-new-beacon.png'),
]


def cut_row(sheet, band, count, names, scale, manifest, soft=False, by_ink=False):
    strip = ib.ba.defringe(ig.despill(ig.key_flat(sheet.crop(band))))
    # The pose sheet's figures overlap, so there is no gap to cut on: split on the ink
    # profile into the number of people the panel is known to hold.
    runs = ss.slice_row_n(strip, count) if by_ink else (ib.slice_by_gaps(strip, count) or ss.slice_row_n(strip, count))
    if len(runs) != count:
        print(f'!! band {band}: wanted {count}, found {len(runs)} — {runs}')
        return
    for (a, b), key in zip(runs, names):
        if key is None:
            continue
        cut = ba.trim(strip.crop((a, 0, b, strip.height)))
        if scale != 1:
            cut = ba.upscale(cut, scale)
        row = ig.write(cut, key, quantise=140, max_h=ib.MAX_FIGURE_H)
        row['source'] = '2026-09e'
        if soft:
            row['soft'] = True
        manifest[key] = row


def main():
    manifest_path = os.path.join(OUT, 'manifest.json')
    manifest = json.load(open(manifest_path, encoding='utf8'))
    figures = manifest.setdefault('figures', {})
    backdrops = manifest.setdefault('backdrops', {})

    print('--- sheet A: the supporters, front and back ---')
    cut_row(Image.open(SHEET_A), SHEET_A_BAND, len(SHEET_A_NAMES), SHEET_A_NAMES, 1, figures)

    print('--- sheet B: melamed and freddy (soft) ---')
    sheet_b = Image.open(SHEET_B)
    for band, count, names in SHEET_B_PANELS:
        cut_row(sheet_b, band, count, names, 2.4, figures, soft=True, by_ink=True)

    print('--- bloomfield 2000–2016 / 2019+ ---')
    for key, name in BLOOMFIELD:
        path = os.path.join(BLOOM, name)
        if not os.path.exists(path):
            print(f'!! missing {path}')
            continue
        im = Image.open(path).convert('RGB')
        row = ig.write(im, key, quantise=160, max_w=1600, dey=ba.deyellow_soft if hasattr(ba, 'deyellow_soft') else None)
        row['source'] = '2026-09e'
        backdrops[key] = row

    json.dump(manifest, open(manifest_path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print('manifest written')


if __name__ == '__main__':
    main()
