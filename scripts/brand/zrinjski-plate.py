"""
LIFE · Zrinjski's own ground at the end of the street, from the owner's photograph (24.11.2026).

    python3 scripts/brand/zrinjski-plate.py            # writes public/life/flow/<stem>-{2048,1024}.webp + the manifest row
    python3 scripts/brand/zrinjski-plate.py --preview /tmp/z   # also a before/after pair for review

Source (never modified): brand/source/life/zrinjski/stadium-photo-IMG_5493.jpg, a daylight photo of the main stand.
`stadium-aerial-collage.png` carries text, crests and faces: it is a layout reference only and is never read here.

Steps, in order:
 1. crop to the stand, both floodlight pylons and the hill behind (the empty daylight sky above and the pitch below go);
 2. paint out every word, crest, flag and sponsor board (the slogan banner along the top, the club names on the stand
    fronts, the flags at the left, the boards along the track): each patch is cloned from the same rows a little to the
    side (seat rows run horizontally, so the rows line up), or filled with the banner's own white where it is a plain wall;
 3. grade to LIFE's dusk (rule life-flow-art: blue-hour after rain, warm lamps): the flat daylight blue becomes the dusk
    sky of `look/dusk.ts` with an alpha falloff so the game's own sky shows through above, the hill and the blocks sink
    into blue shadow, the floodlights come on (cool-white heads with a warm halo), the stand is lit from above, and
    some windows in the blocks behind are lit amber (hue under 30 degrees, never yellow);
 4. rule 8: the result goes through `deyellow.py` and is scanned with the bake's own yellow and family measures.
Zrinjski's colour policy (club-packs/zrinjski-mostar/identity.json) bans no family; red is the club's own and stays.
"""
import hashlib
import importlib.util
import io
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'brand/source/life/zrinjski/stadium-photo-IMG_5493.jpg'
OUT = ROOT / 'public/life/flow'
STEM = 'life-stadium-zrinjski-mostar-a-owner1'
CROP = (0, 790, 2576, 1740)  # x0, y0, x1, y1 in the 2576x1932 source

# every mark, in source pixels: (x0, y0, x1, y1, how) — how: dx to clone from (same rows), 'down' (the rows below it),
# or 'wall' (the wall's own colour)
MARKS = [
    (850, 1400, 1450, 1462, 'down'),       # the slogan banner and its crest: the seat rows below it carried up
    (0, 1546, 120, 1572, 150),             # club name, left stand front
    (704, 1562, 800, 1584, -110),          # club name
    (1200, 1570, 1274, 1588, -90),         # club name
    (1458, 1578, 1752, 1596, 'wall'),      # club name and year under the press box roof
    (1622, 1570, 1678, 1585, 70),          # club name (small)
    (1976, 1569, 2034, 1586, 80),          # club name
    (2338, 1562, 2400, 1578, -80),         # club name
    (266, 1592, 384, 1740, 140),           # the flags and their poles
    (1738, 1700, 2030, 1740, 'wall'),      # sponsor boards along the track
    (2180, 1700, 2252, 1740, 'wall'),
]
FLOOD_L = (0, 815, 150, 1025)     # left pylon's head
FLOOD_R = (2388, 1210, 2520, 1292)  # right pylon's head
BLOCKS = [(1100, 1290, 1900, 1440), (930, 1320, 1040, 1400)]  # apartment blocks behind the stand
SKY_STOPS = [(0.0, '#f0a878'), (0.045, '#d9929a'), (0.15, '#8d86ad'), (0.34, '#456aa6'), (0.62, '#1f3a7c'), (1.0, '#0c1a4c')]


def hexrgb(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32) / 255


def paint_out(a):
    """Every mark gone: cloned from the same rows beside it, or the plain wall colour with the wall's own grain."""
    for x0, y0, x1, y1, how in MARKS:
        if how == 'down':
            hh = y1 - y0
            a[y0:y1, x0:x1] = a[y1 + 4:y1 + 4 + hh, x0:x1].copy() * 0.92
        elif how == 'wall':
            ring = np.concatenate([a[max(0, y0 - 6):y0, x0:x1].reshape(-1, 3), a[y1:y1 + 6, x0:x1].reshape(-1, 3)])
            light = ring[ring.mean(1) > np.percentile(ring.mean(1), 40)]
            base = np.median(light, 0)
            rng = np.random.default_rng(x0 * 7 + y0)
            grain = rng.normal(0, 0.012, (y1 - y0, x1 - x0, 1)).astype(np.float32)
            shade = np.linspace(1.0, 0.94, y1 - y0, dtype=np.float32)[:, None, None]
            a[y0:y1, x0:x1] = np.clip(base[None, None] * shade + grain, 0, 1)
        else:
            dx = int(how)
            a[y0:y1, x0:x1] = a[y0:y1, x0 + dx:x1 + dx].copy()
    return a


def sky_mask(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = ((b > r + 0.18) & (b > g + 0.05) & (b > 0.45)).astype(np.float32)
    # only the sky: nothing below the top of the stand counts (the blue band on the stand stays a wall)
    m[1390 - CROP[1]:] = 0
    im = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.6))
    return np.asarray(im, np.float32) / 255


def dusk_sky(h, w, horizon):
    """The game's dusk dome, as rows: the horizon line (in crop pixels) is the warm band, deep blue at the top."""
    y = np.arange(h, dtype=np.float32)
    e = np.clip((horizon - y) / (horizon * 0.9), 0, 1) ** 0.8
    out = np.zeros((h, 3), np.float32)
    for i in range(len(SKY_STOPS) - 1):
        (s0, c0), (s1, c1) = SKY_STOPS[i], SKY_STOPS[i + 1]
        if i == 0:
            out[:] = hexrgb(c0)
        t = np.clip((e - s0) / (s1 - s0), 0, 1)
        t = t * t * (3 - 2 * t)
        out = out * (1 - t[:, None]) + hexrgb(c1)[None] * t[:, None]
    srgb = out ** 1.0
    return np.repeat(srgb[:, None, :], w, 1)


def radial(h, w, cx, cy, r):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / r
    return np.clip(1 - d, 0, 1) ** 2


def grade(a, sky):
    h, w, _ = a.shape
    y0 = CROP[1]
    lum = a @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    # the land: the hill, trees and blocks sink into blue-hour shadow; the stand (bright, low) keeps more of its light
    stand = np.zeros((h, w), np.float32)
    stand[1395 - y0:] = 1
    stand = np.asarray(Image.fromarray((stand * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(30)), np.float32) / 255
    k = 0.22 + 0.28 * stand
    cool = np.array([0.78, 0.86, 1.08], np.float32)
    land = (a ** 1.15) * k[..., None] * cool
    # the floodlights' wash over the stand, warmer under each pylon, whiter in the middle
    wash = radial(h, w, 80, 120, 1700) * 0.55 + radial(h, w, 2450, 460, 1300) * 0.45
    land += (a ** 1.4) * (wash * stand)[..., None] * np.array([0.62, 0.55, 0.5], np.float32)
    # the seats' white catches the light most: a lift on the bright, low-saturation pixels of the stand
    white = np.clip((lum - 0.55) / 0.35, 0, 1) * stand
    land += white[..., None] * np.array([0.16, 0.16, 0.17], np.float32)
    # lit windows in the blocks behind: dark openings in a pale facade, some warm, some cool TV-blue, most dark
    rng = np.random.default_rng(1905)
    for x0, by0, x1, by1 in BLOCKS:
        ys, xs = slice(by0 - y0, by1 - y0), slice(x0, x1)
        blk = a[ys, xs]
        mx, mn = blk.max(-1), blk.min(-1)
        sat = (mx - mn) / np.maximum(mx, 1e-4)
        pale = np.asarray(Image.fromarray(((blk.mean(-1) > 0.72) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9)), np.float32) / 255
        dark = (blk.mean(-1) < 0.45) & (sat < 0.3) & (pale > 0.5) & (sky[ys, xs] < 0.2)
        cell = np.zeros(dark.shape, np.float32)
        ch, cw = 6, 8
        for yy in range(0, dark.shape[0], ch):
            for xx in range(0, dark.shape[1], cw):
                if rng.random() < 0.3:
                    cell[yy:yy + ch, xx:xx + cw] = 1 if rng.random() < 0.82 else 0.6
        lit = dark * cell
        warm = np.where(cell[..., None] == 0.6, np.array([0.55, 0.62, 0.85], np.float32), np.array([1.0, 0.66, 0.38], np.float32))
        land[ys, xs] = land[ys, xs] * (1 - lit[..., None]) + warm * lit[..., None] * 0.8
    # the sky: the dusk dome, the warm band where the hill meets it
    horizon = 1395 - y0
    sk = dusk_sky(h, w, horizon) * 0.9
    out = land * (1 - sky[..., None]) + sk * sky[..., None]
    # the floodlight heads: cool-white panels, a warm halo, a glow that carries over the sky
    for (x0, fy0, x1, fy1), s in ((FLOOD_L, 1.0), (FLOOD_R, 0.8)):
        cx, cy = (x0 + x1) / 2, (fy0 + fy1) / 2 - y0
        head = np.zeros((h, w), np.float32)
        head[fy0 - y0:fy1 - y0, x0:x1] = (a[fy0 - y0:fy1 - y0, x0:x1].mean(-1) > 0.55)
        head = np.asarray(Image.fromarray((head * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2)), np.float32) / 255
        out = out * (1 - head[..., None]) + np.array([1.0, 0.97, 0.93], np.float32) * head[..., None]
        out += radial(h, w, cx, cy, 420 * s)[..., None] * np.array([0.55, 0.42, 0.32], np.float32) * s
        out += radial(h, w, cx, cy, 150 * s)[..., None] * np.array([0.6, 0.56, 0.5], np.float32) * s
    return np.clip(out, 0, 1)


def alpha_of(sky, h):
    """Opaque land; the sky fades out upward so the game's own dome takes over above the hill."""
    y = np.arange(h, dtype=np.float32)
    fade = np.clip((y - 40) / 300, 0, 1)[:, None]
    return np.clip(1 - sky * (1 - fade) * 0.85, 0, 1)


def deyellow(im):
    spec = importlib.util.spec_from_file_location('deyellow', ROOT / 'scripts/brand/deyellow.py')
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    out, moved = mod.deyellow(im)
    return out, moved


def bake_measures(rgb):
    spec = importlib.util.spec_from_file_location('bake', ROOT / 'scripts/life/flow/bake.py')
    mod = importlib.util.module_from_spec(spec)
    sys.modules['bake'] = mod
    spec.loader.exec_module(mod)
    return mod.hue_yellow_share(rgb), mod.families(rgb)


def webp(im, path, q=82):
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=q, method=6, exact=True)
    data = buf.getvalue()
    path.write_bytes(data)
    return {'w': im.width, 'h': im.height, 'bytes': len(data), 'sha': hashlib.sha256(data).hexdigest()[:16]}


def main():
    preview = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None
    src = Image.open(SRC).convert('RGB')
    a = np.asarray(src, np.float32) / 255
    a = paint_out(a.copy())
    a = a[CROP[1]:CROP[3], CROP[0]:CROP[2]]
    sky = sky_mask(a)
    g = grade(a, sky)
    alpha = alpha_of(sky, g.shape[0])
    rgb = Image.fromarray((g * 255 + 0.5).astype(np.uint8))
    rgb, moved = deyellow(rgb)
    im = rgb.convert('RGBA')
    im.putalpha(Image.fromarray((alpha * 255 + 0.5).astype(np.uint8)))
    files = {}
    for size in (2048, 1024):
        s = im.resize((size, round(im.height * size / im.width)), Image.LANCZOS)
        files[str(size)] = webp(s, OUT / f'{STEM}-{size}.webp')
    small = np.asarray(rgb.resize((512, round(rgb.height * 512 / rgb.width))), np.uint8)
    yellow, fam = bake_measures(small)
    avg = small.reshape(-1, 3).mean(0)
    man_path = OUT / 'manifest.json'
    man = json.loads(man_path.read_text())
    man['pieces'][STEM] = {
        'kind': 'stadium', 'club': 'zrinjski-mostar', 'town': 'mos', 'key': 'a', 'stem': STEM,
        'src': {'w': im.width, 'h': im.height}, 'files': files,
        'yellow': round(yellow, 4), 'families': fam, 'avg': '#%02x%02x%02x' % tuple(int(x) for x in avg),
        'from': {'owner': 'brand/source/life/zrinjski/stadium-photo-IMG_5493.jpg', 'script': 'scripts/brand/zrinjski-plate.py'},
        'use': yellow <= 0.04,
        'note': "owner's own photo of the main stand (24.11.2026): slogan banner, club names, flags and track boards painted out; graded to the LIFE dusk, floodlights on, windows lit; sky fades to alpha",
    }
    man['pieces'] = dict(sorted(man['pieces'].items()))
    man_path.write_text(json.dumps(man, indent=1) + '\n')  # the bake's own layout (scripts/life/flow/bake.py)
    print(STEM, files, 'yellow', yellow, fam, 'deyellowed px', moved)
    if preview:
        Path(preview).mkdir(parents=True, exist_ok=True)
        before = src.crop(CROP).resize((1024, round(950 * 1024 / 2576)))
        bg = Image.new('RGBA', im.size, (14, 26, 76, 255))
        after = Image.alpha_composite(bg, im).convert('RGB').resize(before.size)
        pair = Image.new('RGB', (1024, before.height * 2 + 8), (0, 0, 0))
        pair.paste(before, (0, 0)); pair.paste(after, (0, before.height + 8))
        pair.save(f'{preview}/zrinjski-before-after.jpg', quality=88)


if __name__ == '__main__':
    main()
