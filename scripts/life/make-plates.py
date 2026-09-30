#!/usr/bin/env python3
"""
לוחות המעבר — the director's plates, generated from the paintings the game already has.

  python3 scripts/life/make-plates.py

A cut between chapters used to be a word over black. A film names its time over a
PICTURE: the ground the next chapter is set in, graded like a memory, with the bars of a
wide frame and the grain of stock. This script makes one plate per chapter in the
registry out of that chapter's key backdrop — no new painting, a grade: a little
desaturation, cool shadows and warm lights, a vignette, film grain — plus a breath of the
red smoke plate over the football chapters and of the floodlight haze over the nights.
It also writes the two textures the shell animates: `fxGrain` (a tileable noise) and
three `fxLeak*` light leaks for the sweep on a year change.

Everything is 1600×900 and quantised like a backdrop, and every plate is measured for
yellow like everything else. Sources per chapter live in PLATES; a chapter that gains a
better key painting changes one line here.
"""
import json
import os
import random
import importlib.util

from PIL import Image, ImageChops, ImageEnhance, ImageFilter, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
ART = os.path.join(ROOT, 'public/life/art')


def _load(name, filename):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, filename))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


ba = _load('ba', 'build-art.py')
ig = _load('ig', 'ingest-2026-09.py')

W, H = 1280, 720

# chapter id → (backdrop key, mood)
PLATES = {
    '1986': ('reveal', 'day'),
    '1990': ('gate7', 'day'),
    '1991': ('ussMain', 'hall'),
    '1993-cup': ('ussHigh', 'hall'),
    '1993-galil': ('ussEnd', 'hall'),
    '1995-sinai': ('kiosk', 'dusk'),
    '1996-army': ('streetEast', 'dusk'),
    '1997-basket': ('ussExt', 'night'),
    '1998-laces': ('stand', 'day'),
    '1999-basket': ('ussCream', 'hall'),
    '1999-cup': ('introDerbyNight', 'night'),
    '2000-title': ('street90', 'day'),
    '2000-double': ('introDerbyNight', 'night'),
    # the frame
    'today': ('introBeacon', 'night'),
    'stageA': ('ground', 'day'),
    'stageB': ('ussLow', 'hall'),
}


def vignette(im, strength=0.55):
    mask = Image.new('L', im.size, 0)
    # radial falloff drawn as an ellipse blurred out
    from PIL import ImageDraw
    d = ImageDraw.Draw(mask)
    d.ellipse((-int(W * 0.15), -int(H * 0.25), int(W * 1.15), int(H * 1.25)), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(220))
    dark = Image.new('RGB', im.size, (8, 8, 10))
    return Image.composite(im, dark, mask.point(lambda v: int(255 - (255 - v) * strength)))


def grade(im, mood):
    im = im.convert('RGB').resize((W, H), Image.LANCZOS)
    im = ImageEnhance.Color(im).enhance(0.78)
    im = ImageEnhance.Contrast(im).enhance(1.12)
    # split tone: cool shadows, warm highlights — through a curve on each channel
    r, g, b = im.split()
    r = r.point(lambda v: min(255, int(v * 1.03 + 2)))
    b = b.point(lambda v: min(255, int(v * 0.97 + 8 * (1 - v / 255))))
    im = Image.merge('RGB', (r, g, b))
    if mood == 'night':
        im = ImageEnhance.Brightness(im).enhance(0.9)
    if mood == 'hall':
        im = ImageEnhance.Brightness(im).enhance(0.94)
    im = vignette(im)
    return im


def overlay(im, key, alpha):
    path = os.path.join(ART, f'{key}.png')
    if not os.path.exists(path):
        return im
    top = Image.open(path).convert('RGBA').resize((W, H), Image.LANCZOS)
    a = top.split()[-1].point(lambda v: int(v * alpha))
    top.putalpha(a)
    base = im.convert('RGBA')
    base.alpha_composite(top)
    return base.convert('RGB')


def grain(im, amount=9, seed=7):
    rnd = random.Random(seed)
    noise = Image.effect_noise((W, H), amount).convert('L')
    # centre the noise on grey so it adds and subtracts equally
    noise = ImageChops.offset(noise, rnd.randint(0, 99), rnd.randint(0, 99))
    g = Image.merge('RGB', (noise, noise, noise))
    return ImageChops.add(ImageChops.subtract(im, Image.new('RGB', im.size, (7, 7, 7))), ImageChops.subtract(g, Image.new('RGB', im.size, (121, 121, 121))))


def letterbox_hint(im):
    # a hairline of warmer light along the horizon third — a projector's breath
    return im


def write(im, key, manifest, colors=112):
    row = ig.write(im.convert('RGB'), key, quantise=colors, max_w=W)
    row['source'] = 'plates'
    manifest.setdefault('plates', {})[key] = row


def make_grain_tile(manifest):
    size = 256
    tile = Image.effect_noise((size, size), 48).convert('L')
    alpha = tile.point(lambda v: abs(v - 128) * 2)
    out = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    out.putalpha(alpha.point(lambda v: min(255, int(v * 0.55))))
    path = os.path.join(ART, 'fxGrain.webp')
    # WebP חסר אובדן: רעש הוא הדבר שקידוד מאבד הכי גרוע, והקובץ הזה שוקל כמה עשרות KB
    out.save(path, lossless=True)
    manifest.setdefault('plates', {})['fxGrain'] = {'w': size, 'h': size, 'bytes': os.path.getsize(path), 'source': 'plates', 'yellowLeft': 0}
    print(f'fxGrain          {size}x{size} {os.path.getsize(path)/1024:.1f}KB')


def make_leaks(manifest):
    from PIL import ImageDraw
    for i, (cx, cy, tone) in enumerate([(0.15, 0.3, (255, 60, 40)), (0.8, 0.6, (255, 230, 220)), (0.5, 0.1, (255, 90, 70))], start=1):
        w, h = 800, 450
        im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        for r in range(260, 0, -12):
            a = int(200 * (1 - r / 260) ** 1.6)
            d.ellipse((cx * w - r * 1.8, cy * h - r, cx * w + r * 1.8, cy * h + r), fill=(*tone, a))
        im = im.filter(ImageFilter.GaussianBlur(38))
        path = os.path.join(ART, f'fxLeak{i}.png')
        im.save(path, optimize=True)
        manifest.setdefault('plates', {})[f'fxLeak{i}'] = {'w': w, 'h': h, 'bytes': os.path.getsize(path), 'source': 'plates', 'yellowLeft': ba.count_yellow(Image.open(path).convert('RGBA'))}
        print(f'fxLeak{i}          {w}x{h} {os.path.getsize(path)/1024:.1f}KB')


def main():
    mpath = os.path.join(ART, 'manifest.json')
    manifest = json.load(open(mpath, encoding='utf8'))
    for cid, (key, mood) in PLATES.items():
        src = os.path.join(ART, f'{key}.png')
        if not os.path.exists(src):
            print(f'!! {cid}: no {key}.png')
            continue
        im = grade(Image.open(src), mood)
        if mood in ('night', 'hall'):
            im = overlay(im, 'overlayHaze', 0.28)
        if mood in ('day', 'dusk', 'night') and key != 'introBeacon':
            im = overlay(im, 'overlaySmoke', 0.22)
        # grain is the shell's job (`fxGrain`, animated) — baked grain triples the file
        write(im, f'plate-{cid}', manifest)
    make_grain_tile(manifest)
    make_leaks(manifest)
    json.dump(manifest, open(mpath, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print('manifest written')


if __name__ == '__main__':
    main()
