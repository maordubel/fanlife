#!/usr/bin/env python3
"""
המסירה השלישית — the art that answers `ART-BRIEF-COMPLETE.md` (4.9.2026), plus the
Ussishkin reconstruction, ingested.

  WORKER_ART=<delivery folder> WORKER_USS=<ussishkin folder> \
    python3 scripts/life/ingest-2026-09c.py [--only backdrops,sheets,faces,props,parallax,uss,ui]

Same pipeline as `ingest-2026-09b.py` — imported, not copied — with three new kinds of
asset the earlier deliveries did not have:

* **Parallax layers** (`<key>--far/--mid/--near`): FAR is an opaque painting and goes
  through the backdrop treatment; MID and NEAR carry real alpha and are quantised to a
  palette WITH alpha (FASTOCTREE keeps it), because a 1.7MB true-colour layer per plane
  would put a street over the room budget three times.
* **Walk sheets facing LEFT.** `pogi-side` and `hero80-side` face right and the runtime
  mirrors with `setFlipX(facing < 0)`; a walk cut facing left would moonwalk. Frames from
  the two walk sheets are mirrored on the way in, so every side-on frame in the folder
  faces the same way.
* **Ussishkin, five angles**, palette PNGs already at 1600×900 and already yellow-free;
  they are re-measured and registered, not re-treated.
"""
import argparse
import importlib.util
import json
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'public/life/art')
ART = os.environ.get('WORKER_ART', '/mnt/user-data/uploads/THE-WORKER-ART-DELIVERY-2026-09-04')
USS = os.environ.get('WORKER_USS', '/mnt/user-data/uploads/USSISHKIN-RECONSTRUCTION-V2/deliverables/USSISHKIN-RECONSTRUCTION-V2')


def _load(name, filename):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, filename))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


ba = _load('ba', 'build-art.py')
ss = _load('ss', 'slice-sheets.py')
ig = _load('ig', 'ingest-2026-09.py')
ib = _load('ib', 'ingest-2026-09b.py')

# ---------------------------------------------------------------------------- backdrops
BACKDROPS = [
    ('bedroom', 'backgrounds/bedroom.png'),
    ('bedroom90', 'backgrounds/bedroom90.png'),
    ('living', 'backgrounds/living.png'),
    ('reveal', 'backgrounds/reveal.png'),
    ('street90', 'backgrounds/street90.png'),
    ('classroom', 'backgrounds/classroom.png'),
    ('schoolyard', 'backgrounds/schoolyard.png'),
]

USS_BACKDROPS = [
    ('ussMain', 'ussishkin-empty-main-stand.png'),
    ('ussCream', 'ussishkin-empty-cream-stand.png'),
    ('ussEnd', 'ussishkin-empty-end-wall.png'),
    ('ussHigh', 'ussishkin-empty-high-corner.png'),
    ('ussLow', 'ussishkin-empty-low-sideline.png'),
]

# ------------------------------------------------------------------------------- sheets
# (file, keyer, mirror, rows) — rows are (count, names)
SHEETS = [
    ('character-sheets/pogi-walk-sheet.png', 'green', True, [(8, [f'pogi-w{i}' for i in range(1, 9)])]),
    ('character-sheets/hero80-walk-sheet.png', 'green', True, [(8, [f'hero80-w{i}' for i in range(1, 9)])]),
    ('character-sheets/keren-sheet.png', 'green', False, [
        (7, ['keren', 'keren-3q', 'keren-side', 'keren-back', 'keren-sit', 'keren-cross', 'keren-point']),
        (7, ['keren-w1', 'keren-w2', 'keren-w3', 'keren-w4', 'keren-laugh', 'keren-shout', 'keren-hips']),
    ]),
    ('character-sheets/efi-sheet.png', 'green', False, [
        (7, ['efi', 'efi-3q', 'efi-side', 'efi-back', 'efi-crouch', 'efi-kick', 'efi-arms']),
        (7, ['efi-w1', 'efi-w2', 'efi-w3', 'efi-w4', 'efi-dribble', 'efi-cheer', 'efi-sulk']),
    ]),
    ('character-sheets/oldMan-sheet.png', 'green', False, [
        (7, ['oldMan', 'oldMan-3q', 'oldMan-side', 'oldMan-back', 'oldMan-lean', 'oldMan-hand', 'oldMan-paper']),
        (7, ['oldMan-point', 'oldMan-arms', 'oldMan-laugh', 'oldMan-shrug', 'oldMan-coins', 'oldMan-wipe', 'oldMan-stool']),
    ]),
    ('character-sheets/rachel90-sheet.png', 'green', False, [
        (7, ['rachel90', 'rachel90-3q', 'rachel90-side', 'rachel90-back', 'rachel90-arms', 'rachel90-hips', 'rachel90-note']),
        (7, ['rachel90-apron', 'rachel90-point', 'rachel90-watch', 'rachel90-hug', 'rachel90-sit', 'rachel90-door', 'rachel90-call']),
    ]),
    ('character-sheets/teacher-sheet.png', 'green', False, [
        (7, ['teacher', 'teacher-3q', 'teacher-side', 'teacher-back', 'teacher-arms', 'teacher-note', 'teacher-look']),
        (7, ['teacher-point', 'teacher-hand', 'teacher-sit', 'teacher-lean', 'teacher-walk', 'teacher-watch', 'teacher-turn']),
    ]),
    ('character-sheets/pupil-sheet.png', 'green', False, [
        (8, ['pupil-back1', 'pupil-back2', 'pupil-back3', 'pupil-back4', 'pupil-sideA', 'pupil-sideB', 'pupil-turn', 'pupil-pass']),
    ]),
    ('character-sheets/hooperRed-sheet.png', 'green', False, [
        (6, ['hooperRed-ball', 'hooperRed-dribble', 'hooperRed-shoot', 'hooperRed-stretch', 'hooperRed-away', 'hooperRed-bent']),
    ]),
    ('character-sheets/ussishkin-staff-sheet.png', 'green', False, [
        (4, ['usher', 'usher-block', 'usher-up', 'usher-wave']),
        (4, ['hallVendor', 'hallVendor-hand', 'hallVendor-change', 'hallVendor-shout']),
    ]),
]

FACES = [
    ('portraits/faceRachel90-sheet.png', ['faceRachel90', 'faceRachel90-smile', 'faceRachel90-worried', 'faceRachel90-nu', 'faceRachel90-angry', 'faceRachel90-side']),
    ('portraits/faceTeacher-sheet.png', ['faceTeacher', 'faceTeacher-glasses', 'faceTeacher-share', 'faceTeacher-tired', 'faceTeacher-smile', 'faceTeacher-angry']),
    ('portraits/faceOldMan-sheet.png', ['faceOldMan', 'faceOldMan-smile', 'faceOldMan-what', 'faceOldMan-story', 'faceOldMan-over', 'faceOldMan-laugh']),
]

PROPS = ['propBagStrap90', 'propBasketball', 'propCassette', 'propChalk', 'propClipping90',
         'propNote', 'propNoteOpen', 'propScorePaper', 'propTicket91', 'propWrapper']

PARALLAX = ['street', 'approach', 'gate7', 'stand']


def cut_sheet(path, keyer, mirror, rows, manifest_sheets):
    sheet = Image.open(path)
    if keyer == 'green':
        keyed = ib.ba.defringe(ig.despill(ig.key_flat(sheet)))
    else:
        keyed = ba.defringe(ss.key_alpha(sheet))
    bands = ib.row_bands(keyed)
    if len(bands) != len(rows):
        print(f'!! {os.path.basename(path)}: found {len(bands)} rows, expected {len(rows)} — {bands}')
        return
    for (top, bottom), (count, names) in zip(bands, rows):
        strip = keyed.crop((0, top, keyed.width, bottom))
        runs = ib.slice_by_gaps(strip, count) or ss.slice_row_n(strip, count)
        if len(runs) != count:
            print(f'!! {os.path.basename(path)} row {top}-{bottom}: wanted {count}, found {len(runs)}')
            continue
        for (a, b), key in zip(runs, names):
            cut = ba.trim(strip.crop((a, 0, b, strip.height)))
            if mirror:
                cut = cut.transpose(Image.FLIP_LEFT_RIGHT)
            manifest_sheets[key] = ig.write(cut, key, quantise=140, max_h=ib.MAX_FIGURE_H)


def clean_rgba_palette(flat):
    """`clean_palette` for a 4-channel table: de-yellow every entry, keep its alpha."""
    table = flat.getpalette('RGBA')
    if not table:
        return flat
    out = list(table)
    for i in range(0, len(table), 4):
        r, g, b = table[i], table[i + 1], table[i + 2]
        h, sat, v = ba.rgb_to_hsv(r, g, b)
        if sat < ba.SAT_MIN or v < ba.VAL_MIN or not (ba.HUE_MIN <= h <= ba.HUE_MAX):
            continue
        out[i], out[i + 1], out[i + 2] = ba.hsv_to_rgb(ba.SAFE_HUE, min(0.86, sat * 0.9), v)
    flat.putpalette(out, 'RGBA')
    return flat


def write_alpha_layer(im, key, colors=200):
    """A layer with real transparency, quantised WITH its alpha — FASTOCTREE keeps it."""
    im = im.convert('RGBA')
    alpha = im.split()[-1]
    rgb, moved = ba.deyellow(im)
    im = rgb.convert('RGBA')
    im.putalpha(alpha)
    flat = clean_rgba_palette(im.quantize(colors=colors, method=Image.FASTOCTREE))
    path = os.path.join(OUT, f'{key}.png')
    flat.save(path, optimize=True)
    left = ba.count_yellow(Image.open(path).convert('RGBA'))
    size = os.path.getsize(path)
    print(f'{key:18s} {im.width:5d}x{im.height:<5d} {size/1024:8.1f}KB  moved {moved:6d}  yellow {left}')
    return {'w': im.width, 'h': im.height, 'bytes': size, 'yellowLeft': left, 'source': '2026-09c'}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', default='')
    args = ap.parse_args()
    stages = set(args.only.split(',')) if args.only else {'backdrops', 'sheets', 'faces', 'props', 'parallax', 'uss', 'ui'}

    manifest_path = os.path.join(OUT, 'manifest.json')
    manifest = json.load(open(manifest_path, encoding='utf8'))
    sheets_path = os.path.join(OUT, 'sheets.json')
    sheets = json.load(open(sheets_path, encoding='utf8'))

    if 'backdrops' in stages:
        print('--- backdrops ---')
        for key, name in BACKDROPS:
            im = Image.open(os.path.join(ART, name)).convert('RGB')
            manifest.setdefault('backdrops', {})[key] = ig.write(im, key, max_w=ib.MAX_BACKDROP_W, dey=ib.deyellow_place, shift=False)

    if 'uss' in stages:
        print('--- ussishkin ---')
        for key, name in USS_BACKDROPS:
            im = Image.open(os.path.join(USS, name)).convert('RGB')
            manifest.setdefault('backdrops', {})[key] = ig.write(im, key, max_w=ib.MAX_BACKDROP_W, dey=ib.deyellow_place, shift=False)

    if 'sheets' in stages:
        print('--- sheets ---')
        for name, keyer, mirror, rows in SHEETS:
            cut_sheet(os.path.join(ART, name), keyer, mirror, rows, sheets)

    if 'faces' in stages:
        print('--- faces ---')
        for name, names in FACES:
            src = Image.open(os.path.join(ART, name)).convert('RGB')
            keyed = ig.key_flat(src, near=26, far=52)
            bands = ib.row_bands(keyed)
            if len(bands) != 1:
                print(f'!! {name}: found {len(bands)} rows, expected 1 — {bands}')
                continue
            top, bottom = bands[0]
            strip = keyed.crop((0, top, keyed.width, bottom))
            runs = ib.slice_by_gaps(strip, len(names)) or ss.slice_row_n(strip, len(names))
            if len(runs) != len(names):
                print(f'!! {name}: wanted {len(names)} faces, found {len(runs)}')
                continue
            pad = round(0.06 * (bottom - top))
            for (a, b), key in zip(runs, names):
                box = (max(0, a - pad), max(0, top - pad), min(src.width, b + pad), min(src.height, bottom + pad))
                sheets[key] = ig.write(src.crop(box), key, quantise=0, max_h=ib.MAX_FACE_H)

    if 'props' in stages:
        print('--- props ---')
        for key in PROPS:
            im = ba.trim(Image.open(os.path.join(ART, 'props', f'{key}.png')).convert('RGBA'))
            manifest.setdefault('props', {})[key] = ig.write(im, key, quantise=160, max_h=320, method=Image.MEDIANCUT)

    if 'parallax' in stages:
        print('--- parallax ---')
        for key in PARALLAX:
            far = Image.open(os.path.join(ART, 'parallax', f'{key}--far.png')).convert('RGB')
            manifest.setdefault('parallax', {})[f'{key}--far'] = ig.write(far, f'{key}--far', max_w=ib.MAX_BACKDROP_W, dey=ib.deyellow_place, shift=False)
            for plane in ('mid', 'near'):
                im = Image.open(os.path.join(ART, 'parallax', f'{key}--{plane}.png'))
                manifest['parallax'][f'{key}--{plane}'] = write_alpha_layer(im, f'{key}--{plane}')

    if 'ui' in stages:
        print('--- ui ---')
        im = Image.open(os.path.join(ART, 'ui', 'the-worker-title.png'))
        manifest.setdefault('ui', {})['titleWorker'] = write_alpha_layer(ba.trim(im), 'titleWorker', colors=120)

    json.dump(manifest, open(manifest_path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    json.dump(sheets, open(sheets_path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print('manifest + sheets written')


if __name__ == '__main__':
    main()
