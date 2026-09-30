#!/usr/bin/env python3
"""
גימור הרקעים — the pass every painted room goes through before a phone is allowed to load it.

Two jobs, one script, run after ANY backdrop lands in `public/life/art/`:

1. **Shrink and quantise.** The September deliveries arrived as 2048×1152 true-colour PNGs
   at ~3 MB each — six of them, 18 MB, for a game whose room budget is 3.6 MB
   (`tests/life.test.ts`, "keeps any single room inside a sane download"). They also
   skipped `build-art.py`, so the manifest still described the files they replaced and
   the yellow scan never saw them. Here each backdrop taller than 1536px is brought down to
   1536, quantised to the same 160-colour dithered palette `build-art.py` uses, de-yellowed
   with the same function, measured from the saved FILE, and its manifest row rewritten.

2. **Extend for portrait.** A 16:9 painting on a 9:19.5 phone can either fill the glass —
   and show a quarter of the room with the child a third of the screen tall — or keep its
   width and leave black bands. Very Little Nightmares, the bar Maor set, does neither:
   its rooms are TALL. Ours are not, so for every backdrop this writes two extension
   strips, `<key>--sky.png` above and `<key>--ground.png` below: the painting's own top
   and bottom rows stretched, blurred and faded toward the ink, so the camera can show a
   taller slice of the world than the painting has and nothing reads as a bar. Sky above
   a street is sky; pavement below it is pavement. The extension is as tall as it needs
   to be to make the picture roughly square, capped at 35% of the painting's height so no
   room is mostly smear. All coordinates in every scene stay fractions of the ORIGINAL
   painting — the strips hang off it at y < 0 and y > H, and nothing else moves.

    python3 scripts/life/finish-backdrops.py            # every backdrop
    python3 scripts/life/finish-backdrops.py street     # just these keys
"""

import json
import os
import sys

from PIL import Image, ImageFilter

try:
    import oxipng
except ImportError:  # לא מותקן — הצינור עובד, הקבצים פשוט גדולים יותר
    oxipng = None


def squeeze(path):
    """
    דחיסה מחדש, בלי לאבד פיקסל אחד.

    PNG הוא פורמט חסר-אובדן, אבל יש בו הרבה דרכים לקודד את אותה תמונה בדיוק, והן לא
    שוות בגודל. ‎`optimize=True`‎ של PIL בוחר אחת סבירה; מעבר שסורק את כל צירופי המסננים
    בוחר את הטובה ביותר, ומוריד בין 16% ל-22% — על אותם פיקסלים בדיוק, מאומת בגיבוב.
    זה חשוב במיוחד עכשיו: החדרים גדלו פי שלושה בשטח כדי להתאים למסך, ורבע מזה חוזר חינם.
    """
    if oxipng is None:
        return
    try:
        oxipng.optimize(path, level=4, strip=oxipng.StripChunks.safe())
    except Exception:
        pass

HERE = os.path.dirname(os.path.abspath(__file__))


def _build_art():
    """`build-art.py` has a hyphen in its name; load it as a module for its two functions."""
    import importlib.util

    spec = importlib.util.spec_from_file_location('build_art', os.path.join(HERE, 'build-art.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_ba = _build_art()
deyellow, count_yellow = _ba.deyellow, _ba.count_yellow

ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
ART = os.path.join(ROOT, 'public', 'life', 'art')
MANIFEST = os.path.join(ART, 'manifest.json')

# **הגובה הוא הגבול, לא הרוחב.** 11.9.2026.
#
# הציור ממלא את גובה הזכוכית, ולכן הגובה שלו הוא מה שקובע אם הוא חד. הגבול הישן — 1600
# רוחב — נולד כשכל החדרים היו 16:9, ובחדר רחב הוא חתך דווקא את המימד שקובע: רחוב של
# ‎1600×625‎ עבר בלי שינוי והוצג מוגדל פי 3.6. עכשיו הקנבס מצייר בפיקסלים של המכשיר,
# והמסירה נבנתה לגובה 1536 בדיוק בשביל זה. גבול על הרוחב היה מוחק אותה בדרך פנימה.
MAX_HEIGHT = 1536
COLOURS = 160
# how tall the extension may grow, as a fraction of the painting's height
EXT_CAP = 0.35
# the far edge of each strip fades to this — the runtime palette's `ink`
INK = (0x15, 0x12, 0x0E)


# Where a painting has GRASS in the yellow band, desaturating it makes dirt and rotating it
# to the badge's brown makes rust — both wrong for a football pitch. Below this fraction of
# the height (the pitch and the near terrace; the far stand's beige concrete is above it)
# every yellow-band pixel is turned GREEN instead, before the general treatment runs.
GREEN_BELOW = {
    'stand': 0.40, 'bloomOldTerrace': 0.30, 'bloomNewTerrace': 0.30, 'pitchSmall': 0.30,
    # 24.9.2026 — the three Bloomfield photographs: the grass starts under the pitch-side ad
    # boards, which are measured per frame, so a board is never turned green
    'bloom80Goal': 0.695, 'bloom90Side': 0.475, 'bloom90Corner': 0.645,
}
GREEN_HUE = 84.0
# a dated ingest may add its own grass lines for one run (ingest-backgrounds-2026-09-27.py)
GREEN_BELOW.update(json.loads(os.environ.get('WORKER_GREEN_EXTRA', '{}')))


def green_grass(im, from_y):
    import colorsys

    px = im.load()
    w, h = im.size
    lut = {}
    for y in range(int(from_y * h), h):
        for x in range(w):
            p = px[x, y]
            q = lut.get(p)
            if q is None:
                hh, s, v = colorsys.rgb_to_hsv(p[0] / 255, p[1] / 255, p[2] / 255)
                if 36 <= hh * 360 <= 74 and s >= 0.28 and v >= 0.28:
                    r, g, b = colorsys.hsv_to_rgb(GREEN_HUE / 360, min(0.8, s * 0.85), v * 0.97)
                    q = (int(r * 255), int(g * 255), int(b * 255))
                else:
                    q = p
                lut[p] = q
            if q != p:
                px[x, y] = q
    return im


def quantised(im, colours):
    """
    A PALETTE file, de-yellowed through its palette.

    The first version of this pass quantised, converted back to RGB to run `deyellow`
    pixel by pixel, and saved THAT — a true-colour PNG of a 160-colour image, two and a
    half times the size it needed to be. The palette is the image: treating its entries is
    treating every pixel, and the file stays a palette file.
    """
    q = im.quantize(colors=colours, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG)
    palette = q.getpalette()
    colours = len(palette) // 3
    swatch = Image.new('RGB', (colours, 1))
    swatch.putdata([tuple(palette[i * 3 : i * 3 + 3]) for i in range(colours)])
    treated, moved_entries = deyellow(swatch)
    flat = []
    for r, g, b in list(treated.getdata()):
        flat.extend((r, g, b))
    q.putpalette(flat)
    # how many PIXELS changed, for the manifest — the same number the old pass reported
    if moved_entries:
        before = [tuple(palette[i * 3 : i * 3 + 3]) for i in range(colours)]
        after = list(treated.getdata())
        changed = {i for i in range(colours) if before[i] != after[i]}
        moved = sum(1 for index in q.getdata() if index in changed)
    else:
        moved = 0
    return q, moved


def extension_height(w, h):
    """Enough to make the picture about square, never more than the cap."""
    want = (w - h) / 2
    return int(max(0, min(want, h * EXT_CAP)))


def strip(source, height, fade_to_top):
    """One extension strip: the edge band stretched, blurred, and faded into the ink."""
    w = source.width
    stretched = source.resize((w, height), Image.BICUBIC).filter(ImageFilter.GaussianBlur(18))
    grad = Image.linear_gradient('L').resize((w, height))
    if fade_to_top:
        grad = grad.transpose(Image.FLIP_TOP_BOTTOM)
    # The fade is fast then slow: the strip keeps the painting's colour for its first
    # stretch, so sky stays sky and pavement stays pavement right where they meet the
    # picture, and is nearly ink by the far edge. A linear fade left a wide band of
    # mid-grey smear on every phone; this reads instead as the room standing in the dark,
    # which is exactly how Very Little Nightmares lights its dioramas. Never fully black,
    # so a camera resting on it still shows a surface rather than a void.
    mask = grad.point(lambda v: int(255 * 0.92 * (v / 255) ** 0.55))
    ink = Image.new('RGB', (w, height), INK)
    return Image.composite(ink, stretched, mask)


def finish(key, manifest):
    path = os.path.join(ART, f'{key}.png')
    im = Image.open(path).convert('RGB')
    w, h = im.size
    if h > MAX_HEIGHT:
        im = im.resize((round(w * MAX_HEIGHT / h), MAX_HEIGHT), Image.LANCZOS)
        w, h = im.size
    if key in GREEN_BELOW:
        im = green_grass(im, GREEN_BELOW[key])
    out, moved = quantised(im, COLOURS)
    out.save(path, optimize=True)
    squeeze(path)
    left = count_yellow(Image.open(path))
    row = manifest['backdrops'].get(key, {})
    row.update({'w': w, 'h': h, 'bytes': os.path.getsize(path), 'deyellowed': moved, 'yellowLeft': left})
    row.setdefault('source', 'delivery')
    row.setdefault('box', [0, 0, w, h])
    manifest['backdrops'][key] = row
    print(f'{key:14s} {w:4d}x{h:<4d} {row["bytes"]/1024:7.1f}KB  de-yellowed {moved:6d}  left {left}')

    ext = extension_height(w, h)
    manifest.setdefault('extensions', {})
    rgb = out.convert('RGB')
    for suffix, band, to_top in (('sky', rgb.crop((0, 0, w, max(4, h // 60))), True),
                                 ('ground', rgb.crop((0, h - max(4, h // 50), w, h)), False)):
        name = f'{key}--{suffix}'
        epath = os.path.join(ART, f'{name}.png')
        if ext <= 0:
            if os.path.exists(epath):
                os.remove(epath)
            manifest['extensions'].pop(name, None)
            continue
        s, smoved = quantised(strip(band, ext, to_top), 64)
        s.save(epath, optimize=True)
        squeeze(epath)
        sleft = count_yellow(Image.open(epath))
        manifest['extensions'][name] = {
            'w': w, 'h': ext, 'bytes': os.path.getsize(epath), 'source': key,
            'box': [0, 0, w, ext], 'deyellowed': smoved, 'yellowLeft': sleft,
        }
        print(f'  {name:20s} {w:4d}x{ext:<4d} {os.path.getsize(epath)/1024:6.1f}KB  left {sleft}')


def main():
    with open(MANIFEST, encoding='utf8') as fh:
        manifest = json.load(fh)
    keys = sys.argv[1:] or list(manifest['backdrops'].keys())
    for key in keys:
        finish(key, manifest)
    with open(MANIFEST, 'w', encoding='utf8') as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=1)
    bad = [k for g in manifest.values() for k, r in g.items() if r.get('yellowLeft')]
    if bad:
        print('FAIL — rule 8:', bad)
        sys.exit(1)


if __name__ == '__main__':
    main()
