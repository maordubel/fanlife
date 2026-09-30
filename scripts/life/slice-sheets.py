#!/usr/bin/env python3
"""
פריסת גיליונות — a character sheet becomes numbered frames, automatically.

The boards arrive as one image with a row of poses on a flat ground: green screen for
the newer sheets, near-black for the older ones. Cutting them by hand means measuring
pixels off a screenshot and being wrong by three, so this measures them instead: key the
ground, find the columns that contain anything, and split wherever there is a gap wide
enough to be between two figures rather than between two legs.

Output goes straight into `public/life/art/` with the same de-yellow and palette-PNG
treatment every other asset gets — see `build-art.py`, whose helpers this imports.
"""
import importlib.util
import json
import os
import sys

from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'public/life/art')
BOARDS = os.environ.get('WORKER_BOARDS', '/root/.claude/uploads/13cbdfeb-c68d-5459-8ba2-6a01b0061153')

spec = importlib.util.spec_from_file_location('ba', os.path.join(HERE, 'build-art.py'))
ba = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ba)


def key_green(im):
    """Chroma key. The sheets use a saturated screen green nothing in 1980 Jaffa wears."""
    im = im.convert('RGB')
    px = im.load()
    w, h = im.size
    alpha = Image.new('L', (w, h), 255)
    ap = alpha.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if g > 90 and g > r * 1.35 and g > b * 1.35:
                ap[x, y] = 0
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out = im.convert('RGBA')
    out.putalpha(alpha)
    return out


def key_alpha(im):
    """
    Some sheets arrive already cut, on a soft painted wash behind real transparency.

    There is nothing to key: the alpha channel IS the answer, and the wash is only there
    so a person can see the figures on a white page. Reading the alpha and throwing the
    wash away is both more accurate than any chroma test and the only way to keep a dark
    olive uniform, which every colour key on this project has tried to eat.
    """
    out = im.convert('RGBA')
    alpha = out.split()[-1].point(lambda v: 0 if v < 24 else v)
    out.putalpha(alpha)
    return out


def key_dark(im, limit=70):
    """The older sheets sit on a flat near-black card."""
    im = im.convert('RGB')
    px = im.load()
    w, h = im.size
    alpha = Image.new('L', (w, h), 255)
    ap = alpha.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if max(r, g, b) < limit and max(r, g, b) - min(r, g, b) < 26:
                ap[x, y] = 0
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out = im.convert('RGBA')
    out.putalpha(alpha)
    return out


def key_wash(im_rgba):
    """
    The photographic sheets sit on a BLURRED wash rather than a flat card, and the wash is
    partly opaque in the file. A colour key cannot separate denim from a blue-grey blur —
    but an edge fence can, and for the opposite reason to the painted boards: here it is
    the background that has no edges and the figure that is sharp. So the grow walks the
    blur freely and stops the moment it meets a photographed edge.
    """
    from PIL import ImageChops

    cut = ba.cutout(im_rgba.convert('RGB'), step_tol=8, wall=12)
    return ImageChops.multiply(cut.split()[-1], im_rgba.split()[-1])


def columns(im, floor=6):
    """Which columns hold anything at all."""
    alpha = im.split()[-1]
    w, h = im.size
    px = alpha.load()
    filled = []
    for x in range(w):
        n = 0
        for y in range(0, h, 2):
            if px[x, y] > 40:
                n += 1
                if n >= floor:
                    break
        filled.append(n >= floor)
    return filled


def slice_row(im, gap=10, min_width=18):
    """Split a keyed row into figures on the empty columns between them."""
    filled = columns(im)
    runs = []
    start = None
    blank = 0
    for x, on in enumerate(filled):
        if on:
            if start is None:
                start = x
            blank = 0
        elif start is not None:
            blank += 1
            if blank >= gap:
                if x - blank - start >= min_width:
                    runs.append((start, x - blank))
                start = None
                blank = 0
    if start is not None and len(filled) - start >= min_width:
        runs.append((start, len(filled)))
    return runs


def ink_profile(im):
    """How much figure there is in each column — 0 is empty ground."""
    alpha = im.split()[-1]
    w, h = im.size
    px = alpha.load()
    return [sum(1 for y in range(h) if px[x, y] > 24) for x in range(w)]


def slice_row_n(im, n, min_width=18):
    """
    Split a keyed row into exactly N figures, by cutting where there is least of anybody.

    `slice_row` needs one gap width to be right for a whole sheet, and on these boards it
    never is: a cheering man's raised arm overlaps his neighbour's shoulder while a seated
    one leaves sixty clear pixels, so any single threshold either welds two people
    together or cuts somebody down the middle. Worse, two figures on these sheets
    sometimes touch, and then there is no blank column to find at all.

    The sheet's own count IS known — seven poses in the top row, five in the bottom — so
    it is used. Read the ink density of every column, then take N-1 cuts greedily at the
    emptiest column left, refusing any cut too close to one already made. A blank gap is
    simply density zero, so this still prefers real gaps wherever they exist; where the
    figures touch it cuts through the thinnest place instead of failing.
    """
    ink = ink_profile(im)
    width = len(ink)
    first = next((x for x, v in enumerate(ink) if v), None)
    last = next((x for x in range(width - 1, -1, -1) if ink[x]), None)
    if first is None or last is None or n < 1:
        return []
    span = last + 1 - first
    if n == 1:
        return [(first, last + 1)]
    keep = max(min_width, int(span / n * 0.55))
    cuts = []
    order = sorted(range(first + keep, last + 1 - keep), key=lambda x: (ink[x], abs(x - (first + last) / 2)))
    for x in order:
        if len(cuts) >= n - 1:
            break
        if all(abs(x - c) >= keep for c in cuts):
            cuts.append(x)
    cuts.sort()
    edges = [first, *cuts, last + 1]
    runs = []
    for i in range(len(edges) - 1):
        a, b = edges[i], edges[i + 1]
        while a < b and not ink[a]:
            a += 1
        while b > a and not ink[b - 1]:
            b -= 1
        if b - a >= min_width:
            runs.append((a, b))
    return runs


def emit(im, key, scale):
    im = ba.trim(ba.defringe(im))
    if scale != 1:
        im = ba.upscale(im, scale)
    out = im.convert('RGBA')
    flat = out.convert('RGB').quantize(colors=200, method=Image.FASTOCTREE).convert('RGBA')
    flat.putalpha(out.split()[-1])
    # De-yellow LAST, on the quantised pixels, and measure the file that is written.
    flat, moved = ba.deyellow(flat)
    path = os.path.join(OUT, f'{key}.png')
    flat.save(path, optimize=True)
    left = ba.count_yellow(Image.open(path))
    print(f'{key:16s} {flat.width:4d}x{flat.height:<4d} {os.path.getsize(path)/1024:7.1f}KB  moved {moved:5d}  yellow {left}')
    return {'w': flat.width, 'h': flat.height, 'bytes': os.path.getsize(path), 'yellowLeft': left}


JOBS = [
    # (board file, band (x0,y0,x1,y1), keyer, output names in order, scale)
    #
    # Only the sheets that key CLEANLY are sliced here. Ofir, Amit and Efi live on an
    # older card whose background is nearly the same value as Ofir's black tracksuit —
    # keying it ate his jacket and merged him with his neighbour — so they keep coming
    # from the painted Stage A cast row via `build-art.py`. A sheet that does not key is
    # not a sheet to force.
    ('d8a1a9b7-image.png', (290, 40, 1120, 430), 'green',
     ['kid', 'kid-3q', 'kid-side', 'kid-side-b', 'kid-back', 'kid-back-b'], 1.6),
    ('d8a1a9b7-image.png', (95, 710, 1360, 975), 'green',
     [f'kid-walk{i}' for i in range(1, 9)], 1.6),
    # y starts below the card's own "רחל / אמא" heading — a label inside a sprite is the
    # concept board leaking into the game.
    ('cc456e2f-image.png', (10, 82, 380, 300), 'green',
     ['rachel-tray', 'rachel', 'rachel-smoke'], 3.0),
    # Ofir and Amit, re-shot on green. The old dark card could not be keyed without
    # eating Ofir's jacket; a screen nothing in 1980 Jaffa wears solves it in one pass.
    ('3d0ccce0-image.png', (20, 20, 1520, 580), 'green',
     ['ofir-arms', 'ofir', 'ofir-side', 'ofir-back', 'ofir-3q', 'ofir-walk', 'ofir-scarf'], 1.1),
    ('3d0ccce0-image.png', (20, 600, 1520, 1010), 'green',
     ['ofir-sitA', 'ofir-sitB', 'ofir-cross', 'ofir-sitC', 'ofir-crouch'], 1.1),
    ('af3f0150-image.png', (20, 20, 1520, 570), 'green',
     ['amit-arms', 'amit', 'amit-back', 'amit-scarfstand', 'amit-side', 'amit-walk', 'amit-scarf'], 1.1, 4),
    ('af3f0150-image.png', (20, 590, 1520, 1000), 'green',
     ['amit-sitA', 'amit-sitB', 'amit-cross', 'amit-sitC', 'amit-sitD', 'amit-hold'], 1.1, 4),

    # ------------------------------------------------------------------ שנות ה-90 ---
    # The same three people, fifteen years on. They are sliced from the same green
    # screens by the same pass, and named with a decade suffix rather than replacing
    # anybody: a life simulation that spans decades needs BOTH ages on disk at once, so
    # that a scene set in 1980 and a scene set in 1995 can stand side by side in the
    # same build and the player can see the years land on a face.
    #
    # Kobi: the moustache greys, the tracksuit is the newer navy-and-red, the newspaper
    # stays. Ofir: the buzz cut is now shaved, the jacket is black, there is a cigarette.
    # Amit: he grew, and he brought the drum.
    ('17265c8e-image.png', (20, 20, 1520, 600), 'green',
     ['kobi90', 'kobi90-arms', 'kobi90-side', 'kobi90-back', 'kobi90-stand', 'kobi90-cheer',
      'kobi90-bag'], 1.1, 6),
    ('17265c8e-image.png', (20, 600, 1520, 1010), 'green',
     ['kobi90-lean', 'kobi90-sitA', 'kobi90-point', 'kobi90-paper', 'kobi90-sitB'], 1.1, 6),
    ('09198b41-image.png', (20, 20, 1520, 600), 'green',
     ['ofir90-arms', 'ofir90', 'ofir90-side', 'ofir90-back', 'ofir90-3q', 'ofir90-smoke',
      'ofir90-walk'], 1.1, 6),
    ('09198b41-image.png', (20, 600, 1520, 1005), 'green',
     ['ofir90-crouch', 'ofir90-point', 'ofir90-sitA', 'ofir90-sitB', 'ofir90-scarf'], 1.1, 6),
    ('37a5d952-image.png', (20, 20, 1520, 575), 'green',
     ['amit90', 'amit90-3q', 'amit90-side', 'amit90-back', 'amit90-turn', 'amit90-cheer',
      'amit90-walk', 'amit90-scarf'], 1.1, 4),
    ('37a5d952-image.png', (20, 590, 1520, 1000), 'green',
     ['amit90-cross', 'amit90-sitA', 'amit90-sitB', 'amit90-point', 'amit90-drum'], 1.1, 4),

    # ------------------------------------------------------- הדמות הראשית, שלושה גילים ---
    # The player, at the three ages the script needs him: the boy grown to a teenager,
    # the young man, and the conscript of the early nineties. These sheets arrive already
    # cut — real alpha behind a painted wash — so they are read rather than keyed, which
    # is also the only way an olive uniform survives contact with this pipeline.
    ('badd7c71-image.png', (0, 0, 1536, 486), 'alpha',
     ['hero80', 'hero80-3q', 'hero80-side', 'hero80-back', 'hero80-pack', 'hero80-walk',
      'hero80-ball', 'hero80-kick'], 1.0, 4),
    ('badd7c71-image.png', (0, 486, 1536, 838), 'alpha',
     ['hero80-scarf', 'hero80-cheer', 'hero80-point', 'hero80-crouch', 'hero80-tie',
      'hero80-sit', 'hero80-away', 'hero80-leave'], 1.0, 4),
    ('badd7c71-image.png', (0, 838, 1536, 1024), 'alpha',
     ['faceHero80', 'faceHero80-3q', 'faceHero80-smile', 'faceHero80-shout',
      'faceHero80-side', 'faceHero80-profile', 'faceHero80-back', 'propPack80',
      'propScarf80', 'propBall80'], 1.0, 4),

    ('083ebfe5-image.png', (0, 0, 1536, 486), 'alpha',
     ['hero90', 'hero90-3q', 'hero90-side', 'hero90-back', 'hero90-pack', 'hero90-walk',
      'hero90-ball', 'hero90-kick'], 1.0, 4),
    ('083ebfe5-image.png', (0, 486, 1536, 838), 'alpha',
     ['hero90-scarf', 'hero90-cheer', 'hero90-think', 'hero90-crouch', 'hero90-tie',
      'hero90-sit', 'hero90-away', 'hero90-leave'], 1.0, 4),
    ('083ebfe5-image.png', (0, 838, 1536, 1024), 'alpha',
     ['faceHero90', 'faceHero90-3q', 'faceHero90-smile', 'faceHero90-shout',
      'faceHero90-back', 'faceHero90-look', 'faceHero90-grin', 'faceHero90-shades',
      'propScarf90', 'propPack90', 'propBall90'], 1.0, 4),

    ('9b8b015d-image.png', (0, 0, 1536, 512), 'alpha',
     ['soldier', 'soldier-rifle', 'soldier-march', 'soldier-back', 'soldier-pack',
      'soldier-side', 'soldier-aim'], 1.0, 4),
    ('9b8b015d-image.png', (0, 512, 1536, 866), 'alpha',
     ['soldier-tired', 'soldier-shout', 'soldier-salute', 'soldier-sit', 'soldier-crate',
      'soldier-tie', 'soldier-away'], 1.0, 4),
    ('9b8b015d-image.png', (0, 866, 1536, 1024), 'alpha',
     # The tail of this row is a kit lay-out that the splitter cannot name honestly —
     # a beret, a helmet, webbing and a rifle overlap each other on the page. They are
     # cut and kept under neutral names rather than being labelled as props the game
     # would then be tempted to place; only the beret is clean enough to use.
     ['faceSoldier', 'faceSoldier-3q', 'faceSoldier-look', 'faceSoldier-smile',
      'faceSoldier-shout', 'faceSoldier-side', 'faceSoldier-shades', 'faceSoldier-beret',
      'faceSoldier-back', 'propBeret', 'soldierKitA', 'soldierKitB', 'soldierKitC',
      'soldierKitD'], 1.0, 4),

    # ------------------------------------------------------------------ השחקנים ---
    # Four footballers and one supporter, each on their own green screen, each in a kit
    # AND in civilian clothes — so the same person can be on the pitch in one scene and
    # standing in a street in another, which is the whole point of a life that spans
    # decades. Kit poses, then the second life, then the busts used for speaker plates.
    #
    # Gershon's second row is the rival kit. It is the story reason he exists — the
    # centre-half who left and became hated — and it is also the one thing in this
    # project that is genuinely yellow. It goes through the same de-yellow as everything
    # else (rule 8), so it ships amber-and-black rather than yellow-and-black. That is a
    # decision to confirm, not a bug to fix quietly: the alternative is a named rule 8
    # exemption for these five files.
    ('6589b1fd-image.png', (0, 0, 1536, 492), 'green',
     ['sinai', 'sinai-run', 'sinai-ball', 'sinai-kick', 'sinai-cheer', 'sinai-point',
      'sinai-back'], 1.0, 6),
    ('6589b1fd-image.png', (0, 492, 1536, 800), 'green',
     ['sinai-civA', 'sinai-civB', 'sinai-civC', 'sinai-civD', 'sinai-bustA',
      'sinai-bustB'], 1.0, 6),
    ('6589b1fd-image.png', (0, 800, 1536, 1024), 'green',
     ['faceSinai', 'faceSinai-b', 'faceSinai-side', 'faceSinai-look', 'faceSinai-shout',
      'faceSinai-kit', 'faceSinai-point'], 1.0, 6),

    ('21d2cbec-image.png', (0, 0, 1536, 485), 'green',
     ['tikva-run', 'tikva', 'tikva-shout', 'tikva-back', 'tikva-side', 'tikva-ball'], 1.0, 6),
    ('21d2cbec-image.png', (0, 485, 1536, 800), 'green',
     ['tikva-away', 'tikva-away-back', 'tikva-away-smile', 'tikva-away-side', 'tikva-home',
      'tikva-captain'], 1.0, 6),
    ('21d2cbec-image.png', (0, 800, 1536, 1024), 'green',
     ['tikva-civA', 'tikva-civB', 'tikva-civC', 'tikva-civD', 'tikva-third',
      'tikva-third-back'], 1.0, 6),

    ('80bf8af1-image.png', (0, 0, 1536, 450), 'green',
     ['gershon-bust', 'gershon', 'gershon-back', 'gershon-run', 'gershon-head',
      'gershon-side'], 1.0, 6),
    ('80bf8af1-image.png', (0, 450, 1536, 800), 'green',
     ['gershon-rival-look', 'gershon-rival-captain', 'gershon-rival', 'gershon-rival-back',
      'gershon-rival-shout'], 1.0, 6),
    ('80bf8af1-image.png', (0, 800, 1536, 1024), 'green',
     ['gershon-civA', 'gershon-civB', 'gershon-civC', 'gershon-civD', 'gershon-civE'], 1.0, 6),

    ('e13f68c7-image.png', (0, 0, 1536, 455), 'green',
     ['elimelech-point', 'elimelech-shout', 'elimelech-ready', 'elimelech-catch',
      'elimelech-back', 'elimelech-claim'], 1.0, 6),
    ('e13f68c7-image.png', (0, 455, 1536, 775), 'green',
     ['elimelech-civA', 'elimelech-civB', 'elimelech-civC', 'elimelech-civD',
      'elimelech-civE', 'elimelech-civF', 'elimelech-civG'], 1.0, 6),
    ('e13f68c7-image.png', (0, 775, 1536, 1024), 'green',
     ['faceElimelech', 'faceElimelech-smile', 'faceElimelech-side', 'faceElimelech-look',
      'faceElimelech-shout', 'faceElimelech-calm', 'faceElimelech-ball'], 1.0, 6),

    ('0d2d6054-image.png', (0, 0, 1536, 455), 'green',
     ['keren90', 'keren90-side', 'keren90-smile', 'keren90-sit', 'keren90-arms'], 1.0, 6),
    ('0d2d6054-image.png', (0, 455, 1536, 706), 'green',
     ['keren90-band', 'keren90-scarf', 'keren90-look', 'keren90-shout'], 1.0, 6),
    ('0d2d6054-image.png', (0, 706, 1536, 1024), 'green',
     ['faceKeren90', 'faceKeren90-b', 'faceKeren90-side', 'faceKeren90-profile',
      'faceKeren90-smile'], 1.0, 6),
]


# Explicit crops, because these two sheets are laid out by hand rather than on a grid and
# the automatic slicer sees one connected wash. Each box is generous; `trim` finds the
# figure inside it.
KOBI = [
    ('f8886918-image.png', {
        'kobi': (395, 20, 512, 548),
        'kobi-side': (563, 20, 700, 548),
        'kobi-back': (742, 20, 888, 548),
        'kobi-scarf': (942, 20, 1098, 548),
        'kobi-walk': (1142, 20, 1308, 548),
        'kobi-cheer': (20, 558, 308, 1022),
        'kobi-rail': (312, 558, 618, 1022),
        'kobi-chair': (992, 558, 1338, 1022),
        'kobi-bag': (1342, 558, 1534, 1022),
    }, 1.0),
    ('3c8dfc75-image.png', {
        'kobi-arms': (150, 10, 300, 520),
        'kobi-point': (700, 10, 900, 520),
    }, 1.0),
]


def slice_kobi(report):
    from PIL import Image as _Image

    for board, boxes, scale in KOBI:
        src = _Image.open(os.path.join(BOARDS, board)).convert('RGBA')
        print(f'\n{board} → {len(boxes)} hand-cut poses')
        for name, box in boxes.items():
            piece = src.crop(box)
            piece.putalpha(key_wash(piece))
            report[name] = emit(piece, name, scale)


def main():
    report = {}
    for board, band, mode, names, scale, *rest in JOBS:
        gap = rest[0] if rest else 10
        raw = Image.open(os.path.join(BOARDS, board))
        if mode == 'alpha':
            keyed = key_alpha(raw.convert('RGBA').crop(band))
        else:
            im = raw.convert('RGB').crop(band)
            keyed = key_green(im) if mode == 'green' else key_dark(im)
        runs = slice_row(keyed, gap=gap)
        if len(runs) != len(names):
            runs = slice_row_n(keyed, len(names))
        print(f'\n{board} {band} → {len(runs)} figure(s) for {len(names)} name(s)')
        for i, name in enumerate(names):
            if i >= len(runs):
                print(f'  !! {name}: no figure at slot {i}')
                continue
            x0, x1 = runs[i]
            report[name] = emit(keyed.crop((x0, 0, x1, keyed.height)), name, scale)
    slice_kobi(report)
    with open(os.path.join(OUT, 'sheets.json'), 'w', encoding='utf8') as fh:
        json.dump(report, fh, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
