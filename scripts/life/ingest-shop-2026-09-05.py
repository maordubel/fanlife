#!/usr/bin/env python3
"""
חנות האוהדים — a room, out of one of the three panoramas Maor sent.

    python3 scripts/life/ingest-shop-2026-09-05.py

Three empty 360° rooms arrived with "one of them should be the fan shop, pick the best".
The third is the one: a wooden floor, a sloped ceiling with real beams, deep window
reveals and a plain door — an upstairs room in an old building, which is what a fan shop
in south Tel Aviv in 1990 actually was. The other two are a modern office with a suspended
ceiling and an air-conditioning unit, and a tiled corridor; neither can be aged into 1990
without repainting them, and repainting a photograph is drawing.

An equirectangular panorama is not a backdrop: straight walls bow, and a room whose walls
bow reads as a fairground mirror. So it is REPROJECTED — a real pinhole camera placed at
the centre of the sphere, 96° across, aimed a little below the horizon so the floor gets
the bottom third — and then graded the way every other room in this game is graded.

The yaw was not guessed: eight views were rendered round the sphere and looked at, and
−110° is the only one that is a SHOP — a long blank wall to hang shirts on, a door on the
right for the customer to come through, and the sloped ceiling on the left saying which
kind of building this is. Straight ahead is a corner, and a corner is not a room.

The 360 file is kept as well, registered as a panorama, so the same room can later be
looked around in rather than only stood in.
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)

import importlib.util


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


ig = _load('ig', os.path.join(HERE, 'ingest-2026-09.py'))
ib = _load('ib', os.path.join(HERE, 'ingest-2026-09b.py'))

SRC = os.environ.get('WORKER_UPLOADS', '/root/.claude/uploads/1031bb6e-b609-5caf-8b3a-4b2f7101c0c4')
OUT = os.path.join(ROOT, 'public/life/art')

# the three that arrived, and which one is used
ROOMS = {
    '53bfc346': ('fanShop', 'קומה שנייה, רצפת עץ, קורות — חנות האוהדים'),
}
PASSED = {
    '2bb1f7cf': 'משרד מודרני עם תקרה אקוסטית ומזגן קסטה — אי אפשר להזקין אותו ל־1990',
    'd0b83933': 'מסדרון מרוצף, בלי חלון לרחוב — חדר בלי חוץ',
}


def perspective(equi, yaw_deg=-110.0, pitch_deg=-8.0, fov_deg=94.0, out_w=1600, out_h=900):
    """One pinhole view out of an equirectangular sphere. Straight walls come out straight."""
    src = np.asarray(equi.convert('RGB')).astype(np.float32)
    sh, sw = src.shape[:2]
    f = (out_w / 2) / math.tan(math.radians(fov_deg) / 2)
    xs = np.arange(out_w) - out_w / 2
    ys = np.arange(out_h) - out_h / 2
    gx, gy = np.meshgrid(xs, ys)
    gz = np.full_like(gx, f, dtype=np.float32)

    pitch = math.radians(pitch_deg)
    cp, sp = math.cos(pitch), math.sin(pitch)
    y2 = gy * cp - gz * sp
    z2 = gy * sp + gz * cp

    yaw = math.radians(yaw_deg)
    cy, sy = math.cos(yaw), math.sin(yaw)
    x3 = gx * cy + z2 * sy
    z3 = -gx * sy + z2 * cy

    lon = np.arctan2(x3, z3)
    lat = np.arctan2(y2, np.hypot(x3, z3))
    u = (lon / (2 * math.pi) + 0.5) * (sw - 1)
    v = (lat / math.pi + 0.5) * (sh - 1)

    # bilinear, so a 700-pixel-wide panorama does not come out as stairs
    u0, v0 = np.floor(u).astype(int), np.floor(v).astype(int)
    du, dv = (u - u0)[..., None], (v - v0)[..., None]
    u0 = np.clip(u0, 0, sw - 1); u1 = np.clip(u0 + 1, 0, sw - 1)
    v0 = np.clip(v0, 0, sh - 1); v1 = np.clip(v0 + 1, 0, sh - 1)
    top = src[v0, u0] * (1 - du) + src[v0, u1] * du
    bot = src[v1, u0] * (1 - du) + src[v1, u1] * du
    return Image.fromarray(np.clip(top * (1 - dv) + bot * dv, 0, 255).astype(np.uint8))


def age(im):
    """
    1990, not a letting agent's photograph.
    
    The room arrives lit like an empty flat: neutral white, flat contrast, cold. A shop
    with people in it is warmer, dimmer at the edges and has some grain. Nothing is
    painted — this is exposure, contrast and a vignette, which is what a period lens did.
    """
    a = np.asarray(im).astype(np.float32) / 255
    a = np.clip((a - 0.5) * 1.10 + 0.5, 0, 1)          # contrast
    a *= np.array([1.03, 0.995, 0.955])                 # a little warmth, off the yellow band
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.hypot((xx - w / 2) / (w / 2), (yy - h / 2) / (h / 2))
    a *= (1 - 0.30 * np.clip(r - 0.45, 0, None) ** 1.4)[..., None]
    a += (np.random.default_rng(9).normal(0, 0.010, a.shape[:2]))[..., None]
    return Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8))


def main():
    manifest_path = os.path.join(OUT, 'manifest.json')
    manifest = json.load(open(manifest_path, encoding='utf8'))
    for stem, (key, whatHe) in ROOMS.items():
        path = os.path.join(SRC, f'{stem}-image.png')
        if not os.path.exists(path):
            print('  missing', stem)
            continue
        equi = Image.open(path)
        flat = age(perspective(equi))
        row = ig.write(flat, key, max_w=ib.MAX_BACKDROP_W, dey=ib.deyellow_place, shift=False)
        row['source'] = 'maor-2026-09-05-rooms'
        row['whatHe'] = whatHe
        manifest.setdefault('backdrops', {})[key] = row
        print(f'  {key:12s} {row.get("bytes", 0) / 1024:6.0f}KB  {whatHe}')
    json.dump(manifest, open(manifest_path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print('\nלא נלקחו:')
    for stem, why in PASSED.items():
        print(f'  {stem}  {why}')


if __name__ == '__main__':
    main()
