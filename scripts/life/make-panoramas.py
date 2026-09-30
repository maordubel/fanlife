#!/usr/bin/env python3
"""
פנורמות-מחזיק-מקום — until the painted 360° panoramas land, build one for each key
out of the room's own flat painting, mirrored so it wraps.

  python3 scripts/life/make-panoramas.py            # every key that has no painted file
  python3 scripts/life/make-panoramas.py --force    # rebuild all stand-ins

A stand-in is [painting | mirror | painting | mirror] cut to 4096×1024 with the painting
scaled to the strip's height, so the left and right edges join (a mirror-tiled strip is
seamless by construction). It is not a panorama — the perspective is wrong at the seams —
but it is the right SIZE and the right ROOM, which is what the viewer needs to be built
and tuned against. `manifest.json` records `source: 'stand-in'`; when a real panorama
arrives under the same key, `ingest-…` overwrites it and the row.
"""
import argparse
import importlib.util
import json
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'public/life/art')

W, H = 4096, 1024

# key → (backdrops to stitch, in order)
SOURCES = {
    'panoReveal': ['reveal', 'stand'],
    'panoTerrace1986': ['stand', 'reveal'],
    'panoUssHall': ['ussMain', 'ussCream'],
    'panoUssDerby': ['ussCream', 'ussMain'],
    'panoKitchen90': ['kitchen', 'living'],
    'panoBedroomMorning90': ['bedroom90', 'living'],
    'panoGate7': ['gate7', 'approach'],
    'panoClassroom': ['classroom', 'schoolyard'],
}


def _load(name, filename):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, filename))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def build(keys):
    tiles = []
    for key in keys:
        im = Image.open(os.path.join(OUT, f'{key}.png')).convert('RGB')
        im = im.resize((round(im.width * H / im.height), H), Image.LANCZOS)
        tiles.append(im)
        tiles.append(im.transpose(Image.FLIP_LEFT_RIGHT))
    strip = Image.new('RGB', (W, H))
    x = 0
    i = 0
    while x < W:
        tile = tiles[i % len(tiles)]
        strip.paste(tile, (x, 0))
        x += tile.width
        i += 1
    # Roll the strip so the FIRST painting's centre sits at the strip's centre — yaw 0 in
    # the viewer — where the real panoramas put their subject; the marks tuned for the
    # painted ones then land roughly on the right things in the stand-in too.
    shift = W // 2 - tiles[0].width // 2
    rolled = Image.new('RGB', (W, H))
    rolled.paste(strip.crop((W - shift, 0, W, H)), (0, 0))
    rolled.paste(strip.crop((0, 0, W - shift, H)), (shift, 0))
    strip = rolled
    # Fade the last tile into the first across 64px so the wrap has no hard edge.
    fade = 64
    left = strip.crop((0, 0, fade, H))
    right = strip.crop((W - fade, 0, W, H))
    blend = Image.blend(right, left, 0.5)
    strip.paste(blend, (W - fade, 0))
    return strip


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--force', action='store_true')
    args = ap.parse_args()
    ba = _load('ba', 'build-art.py')
    ig = _load('ig', 'ingest-2026-09.py')
    ib = _load('ib', 'ingest-2026-09b.py')
    manifest_path = os.path.join(OUT, 'manifest.json')
    manifest = json.load(open(manifest_path, encoding='utf8'))
    rows = manifest.setdefault('panoramas', {})
    for key, sources in SOURCES.items():
        path = os.path.join(OUT, f'{key}.png')
        if os.path.exists(path) and not args.force and rows.get(key, {}).get('source') != 'stand-in':
            print(f'{key}: painted, kept')
            continue
        strip = build(sources)
        # the backdrop treatment: palette PNG, de-yellowed through the palette
        row = ig.write(strip, key, quantise=128, dey=ib.deyellow_place, shift=False, method=Image.MEDIANCUT)
        rows[key] = {**row, 'source': 'stand-in'}
        print(f'   from {"+".join(sources)}')
    json.dump(manifest, open(manifest_path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
