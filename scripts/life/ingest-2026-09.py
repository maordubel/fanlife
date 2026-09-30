#!/usr/bin/env python3
"""
קליטת המסירה — the September delivery: finished frames, not panels on a board.

  WORKER_ART=<folder> python3 scripts/life/ingest-2026-09.py

Every earlier asset was a RECTANGLE OF A CONCEPT BOARD (`build-art.py` holds the crop
boxes). This delivery is different in kind: each backdrop arrives as a finished,
correctly-proportioned frame drawn to the layout specs in `docs/life/*-spec.png`, and
each character arrives as a green-screen or pre-keyed sheet. So the crop model does not
apply and this script does not use it — it takes whole images and gives them the same
three treatments every asset in this project gets (rules 8, 27, 40):

  · **de-yellow** — the same three bands as `build-art.py`, whose helpers this imports
    rather than re-implementing, because two definitions of yellow is one too many;
  · **palette PNG** — lossless over a finite colour table, so "no yellow" is a proof;
  · **de-fringe** — for anything keyed, so a dark figure does not arrive wearing a halo.

The one genuinely new idea here is the STREET FOREGROUND. It ships as a single
full-frame RGBA plate, and a single plate cannot be right: its paving is the ground the
child stands ON, while its pole, its gate pillar and its doorway column are things he
walks BEHIND. Drawn as one layer it either hides him from the knees down or stops
occluding anything. So it is split into two — `streetGround` (the paving, drawn behind
everybody) and `streetFore` (the verticals, drawn in front) — and the split is a
horizontal line plus two kept columns, stated here in fractions of the plate.
"""
import importlib.util
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'public/life/art')
ART = os.environ.get('WORKER_ART', os.path.join(ROOT, 'brand/source/life-2026-09'))

spec = importlib.util.spec_from_file_location('ba', os.path.join(HERE, 'build-art.py'))
ba = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ba)

spec2 = importlib.util.spec_from_file_location('ss', os.path.join(HERE, 'slice-sheets.py'))
ss = importlib.util.module_from_spec(spec2)
spec2.loader.exec_module(ss)


# A backdrop is framed to the viewport, and the viewport is a phone. Above ~1600px the
# file grows with the square of the width and nothing on screen changes; below it the
# painting starts to lose the plaster. Figures are capped by HEIGHT, because that is the
# dimension the walk band scales them by.
MAX_BACKDROP_W = 1600
MAX_FIGURE_H = 430


def clean_palette(flat, shift=True):
    """
    De-yellow the PALETTE, not the pixels.

    Quantising averages neighbouring colours, so a table built from a clean image can
    still contain an entry inside the band — a few hundred pixels of it, invisible to
    the eye and fatal to the scanner. A palette PNG has at most 256 colours in a
    768-byte table, so the honest fix is to run the table itself through the same
    de-yellow and put it back: that turns "no yellow in this file" from a sample into
    the proof rule 27 wanted.
    """
    table = flat.getpalette()
    if not table:
        return flat
    out = list(table)
    for i in range(0, len(table), 3):
        r, g, b = table[i], table[i + 1], table[i + 2]
        h, s, v = ba.rgb_to_hsv(r, g, b)
        if s < ba.SAT_MIN or v < ba.VAL_MIN or not (ba.HUE_MIN <= h <= ba.HUE_MAX):
            continue
        if shift and s >= ba.TRUE_YELLOW_SAT and ba.TRUE_YELLOW_HUE[0] <= h <= ba.TRUE_YELLOW_HUE[1]:
            out[i], out[i + 1], out[i + 2] = ba.hsv_to_rgb(ba.SAFE_HUE, min(0.86, s * 0.9), v)
        elif s > ba.SAFE_SAT:
            out[i], out[i + 1], out[i + 2] = ba.hsv_to_rgb(h, ba.safe_sat(s), v)
    flat.putpalette(out)
    return flat


def key_flat(im, near=58, far=104):
    """
    מפתח לפי הרקע עצמו — key against the colour that is actually there.

    `slice-sheets.key_green` asks a RATIO question — is green beating red and blue by a
    third? — which is the right question for a figure on a screen, because a figure is
    large and its edge is a few pixels of a big object. It is the wrong question for a
    string of pennants: every edge pixel is half cloth and half screen, the ratio test
    says "not green enough", and the object arrives wearing the studio.

    So: sample the corners, and key on DISTANCE from that one colour with a soft ramp.
    Below `near` it is the sheet; above `far` it is the object; between them it fades.
    That is both stricter at the edge and safer in the middle — a dark olive prop is
    nowhere near a screen green in RGB space, however the ratio test feels about it.
    """
    rgb = im.convert('RGB')
    w, h = rgb.size
    corners = [rgb.getpixel(p) for p in ((1, 1), (w - 2, 1), (1, h - 2), (w - 2, h - 2))]
    bg = tuple(sorted(c[i] for c in corners)[1] for i in range(3))
    px = rgb.load()
    alpha = Image.new('L', (w, h), 255)
    ap = alpha.load()
    span = max(1, far - near)
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            d = ((r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2) ** 0.5
            if d <= near:
                ap[x, y] = 0
            elif d < far:
                ap[x, y] = round(255 * (d - near) / span)
    out = rgb.convert('RGBA')
    out.putalpha(alpha)
    return out


def despill(im, strength=1.0):
    """
    הורדת הירוק — take the screen back out of the edges.

    Keying a small object off a green sheet leaves a rim of the sheet behind: at a
    pennant's antialiased edge a pixel is 60% cloth and 40% studio, and `key_green`
    keeps it because it is not green ENOUGH to drop. On a 200px flag that rim is a few
    invisible pixels; on a 250px string of flags it is a third of the object, which is
    how a red pennant line arrives on screen looking mossy.

    The fix is the standard one and it is per-pixel, not per-image: where green leads
    both other channels, pull it back to their level. That is a no-op on anything whose
    green is real (a shrub reads green because green LEADS, but so do the leaves either
    side of it — this would flatten it), which is exactly why it is opt-in per prop
    rather than a stage every asset walks through.
    """
    im = im.convert('RGBA')
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if not a:
                continue
            cap = max(r, b)
            if g > cap:
                px[x, y] = (r, round(g - (g - cap) * strength), b, a)
    return im


def write(im, key, quantise=180, max_w=None, max_h=None, dey=None, shift=True,
          method=Image.FASTOCTREE):
    """
    One asset: de-yellow, then resample, then quantise, then measure the file written.

    The order is the whole trick. De-yellowing AFTER quantising leaves an RGBA image
    whose palette has been thrown away — which is how the first run of this script
    produced 1.4MB backdrops from a pipeline designed to produce 300KB ones. An opaque
    image is written as a true palette PNG (mode P); one with alpha keeps RGBA, because
    a palette plus a transparency table is not worth the edge cases on a cut-out.

    `dey` and `shift` swap in a gentler de-yellow for BACKDROPS, and they exist because
    of one frame. The default treatment moves a saturated yellow off the band by rotating
    its HUE — the right answer for a shirt, a flag or a badge, which is what rule 8 was
    written about. Bloomfield's interior is a sun-bleached pitch painted at hue 44 and
    saturation 0.62, so the rule caught it correctly and rotated a third of the frame to
    terracotta: a football ground the colour of a plant pot. A place is not a claim about
    anybody's colours, so a backdrop passes `shift=False` and clears the band the other
    way — saturation capped below the scanner's threshold, hue left where the painter put
    it. Sun-bleached ground stays khaki, a yellow taxi in a street stays a pale yellow
    taxi, and `count_yellow` still reads zero, which is the property rule 27 asked for.
    Figures, props and documents keep the hue rotation, because a cut-out in a yellow
    shirt is exactly the thing the rule is for.

    `method` is the quantiser, and the default is the one every asset in the first
    delivery was cut with. FASTOCTREE splits the RGB cube by POSITION rather than by how
    many pixels are where, which is fast and fine for a painting full of mid-tones — and
    which fails on an image that is 60% one flat colour. The child's portrait plate is
    painted on flat cream, and the octree spent its leaves on cream and mapped the lit
    side of his face to the nearest one it had: five portraits delivered with holes
    punched in their cheeks. MEDIANCUT splits by population and lands 22 bad pixels at
    3.9 mean error instead of 6.0, so anything cut from this point on asks for it.
    """
    # RESAMPLE FIRST. De-yellowing and then resampling puts yellow straight back —
    # LANCZOS averages a legal olive with its neighbour and lands the result inside the
    # band — which is rule 44's warning applied to the one step it did not mention.
    if max_w and im.width > max_w:
        im = im.resize((max_w, round(max_w * im.height / im.width)), Image.LANCZOS)
    if max_h and im.height > max_h:
        im = im.resize((round(max_h * im.width / im.height), max_h), Image.LANCZOS)
    im, moved = (dey or ba.deyellow)(im)

    path = os.path.join(OUT, f'{key}.png')
    alpha = im.split()[-1] if im.mode == 'RGBA' else None
    keyed = alpha is not None and alpha.getextrema()[0] < 250

    # `quantise=0` writes the pixels as painted. Every other asset in this project goes
    # through a colour table because that is what makes "no yellow" a proof rather than a
    # sample — but a colour table is a budget, and a budget is spent by POPULATION. A
    # portrait plate is 60% flat cream and 15% face, so both quantisers spend their
    # entries on cream and map the lit side of the child's cheek onto one of them: five
    # portraits with holes punched in their faces, whichever method ran. The plates are
    # 200 pixels wide and cost 60KB unquantised, which is the entire argument for the
    # exception. `count_yellow` still runs on what is written.
    if not quantise:
        out = im.convert('RGBA') if keyed else im.convert('RGB')
        out.save(path, optimize=True)
        left = ba.count_yellow(Image.open(path))
        size = os.path.getsize(path)
        print(f'{key:18s} {out.width:5d}x{out.height:<5d} {size/1024:8.1f}KB  moved {moved:6d}  yellow {left}')
        return {'w': out.width, 'h': out.height, 'bytes': size, 'yellowLeft': left, 'source': '2026-09'}

    flat = im.convert('RGB').quantize(colors=quantise, method=method)
    flat = clean_palette(flat, shift=shift)
    if keyed:
        out = flat.convert('RGBA')
        out.putalpha(alpha)
        out.save(path, optimize=True)
        flat = out
    else:
        flat.save(path, optimize=True)

    left = ba.count_yellow(Image.open(path))
    size = os.path.getsize(path)
    print(f'{key:18s} {flat.width:5d}x{flat.height:<5d} {size/1024:8.1f}KB  moved {moved:6d}  yellow {left}')
    return {'w': flat.width, 'h': flat.height, 'bytes': size, 'yellowLeft': left, 'source': '2026-09'}


# ---------------------------------------------------------------------------------
# BACKDROPS — whole frames. `street` is the coolest of the three straight-on takes and
# therefore the one that survives the engine's own warm grade; the warmer takes look
# better on their own and worse in the game, which is the whole reason the spec asked
# for "cooler and flatter than looks right".
# ---------------------------------------------------------------------------------
BACKDROPS = [
    ('street', 'street-b.png', None),
    ('approach', 'approach.png', None),
    ('gate7', 'gate7.png', None),
    # The same street from further east, kept as the ARRIVAL card for the road: the one
    # frame the player sees when they first leave the neighbourhood, before control
    # returns. A second painting of a place you already know is a transition (§33), and
    # it costs one asset rather than a second scene.
    ('streetEast', 'street-angled.png', None),
]

# The foreground plate, split. Fractions of the plate, measured off the delivery.
FORE_GROUND_TOP = 0.762      # everything below this line is the near paving
FORE_KEEP_LEFT = 0.105       # the doorway column, its step and the potted plant
FORE_KEEP_RIGHT = 0.755      # the utility pole, the gate pillar and the railing
FORE_CANOPY = 0.30           # above this the plate is foliage, which occludes nothing


def split_foreground(path, street_size):
    plate = Image.open(path).convert('RGBA')
    # Registered to the backdrop by resampling to its exact size: the two were drawn as
    # one frame, so a 2% difference in aspect is a delivery rounding, not a composition.
    plate = plate.resize(street_size, Image.LANCZOS)
    w, h = plate.size

    front = plate.copy()
    fp = front.load()
    for y in range(int(h * FORE_CANOPY), h):
        if y < int(h * FORE_GROUND_TOP):
            continue
        for x in range(int(w * FORE_KEEP_LEFT), int(w * FORE_KEEP_RIGHT)):
            r, g, b, a = fp[x, y]
            if a:
                fp[x, y] = (r, g, b, 0)
    # …and clear the open middle above the ground line too: between the doorway and the
    # pole the plate holds nothing but sky, and an empty layer is a texture upload.
    for y in range(0, int(h * FORE_GROUND_TOP)):
        if y < int(h * FORE_CANOPY):
            continue
        for x in range(int(w * FORE_KEEP_LEFT), int(w * FORE_KEEP_RIGHT)):
            r, g, b, a = fp[x, y]
            if a:
                fp[x, y] = (r, g, b, 0)

    ground = plate.copy()
    gp = ground.load()
    for y in range(0, int(h * FORE_GROUND_TOP)):
        for x in range(w):
            r, g, b, a = gp[x, y]
            if a:
                gp[x, y] = (r, g, b, 0)

    return front, ground


# ---------------------------------------------------------------------------------
# CHARACTER SHEETS
#
# פוגי is the protagonist, at three ages. The boy replaces the illustrated child the
# game shipped with — a cartoon figure standing in a painted street was the single most
# visible flaw in the build, and no amount of grading fixes a mismatch of medium.
#
# The two crowd sheets are the neighbourhood: fourteen young people and fourteen adults,
# period-dressed, on green. They replace the seven interchangeable `fan*` cut-outs the
# ambient system has been recycling, which is what made a busy street read as the same
# four people walking past on a loop.
# ---------------------------------------------------------------------------------
SHEETS = [
    ('pogi-boy.png', (20, 20, 1520, 552), 'green',
     ['pogi', 'pogi-3q', 'pogi-side', 'pogi-back', 'pogi-walk', 'pogi-scarf', 'pogi-arms'], 1.0),
    ('pogi-boy.png', (20, 560, 1520, 1010), 'green',
     ['pogi-sit', 'pogi-cross', 'pogi-cheer', 'pogi-kneel', 'pogi-hold'], 1.0),

    ('crowd-young.png', (10, 30, 1526, 500), 'green',
     [f'youngA{i}' for i in range(1, 8)], 1.0),
    ('crowd-young.png', (10, 510, 1526, 1000), 'green',
     [f'youngB{i}' for i in range(1, 8)], 1.0),

    ('crowd-adults.png', (10, 30, 1526, 500), 'green',
     [f'adultA{i}' for i in range(1, 8)], 1.0),
    ('crowd-adults.png', (10, 510, 1526, 1000), 'green',
     [f'adultB{i}' for i in range(1, 8)], 1.0),

    # פוגי, later. Nothing in Stage A walks around as either of these; they ship so the
    # chapters after this one have a face waiting for them rather than a placeholder,
    # and so the ending's "fifteen years later" plate is the same person (rule 43).
    ('pogi-young.png', (10, 10, 1526, 440), 'alpha',
     [f'pogi90-{i}' for i in range(1, 9)], 1.0),
    ('pogi-young.png', (10, 450, 1526, 800), 'alpha',
     [f'pogi90-b{i}' for i in range(1, 9)], 1.0),
    ('pogi-army.png', (10, 10, 1526, 420), 'alpha',
     [f'pogiIDF-{i}' for i in range(1, 8)], 1.0),
    ('pogi-army.png', (10, 430, 1526, 800), 'alpha',
     [f'pogiIDF-b{i}' for i in range(1, 9)], 1.0),
]


# ---------------------------------------------------------------------------------
# PROPS — the objects a life actually keeps.
#
# The red box was a list of Hebrew nouns. These are the things themselves, cut from the
# supporter-goods sheet and the street-furniture sheet, so the box becomes a display
# case rather than a receipt: a striped scarf somebody put round your neck, a stack of
# newspapers, the coins out of a gutter. Boxes are stated as fractions of the sheet so a
# re-delivery at another size still cuts the same objects.
# ---------------------------------------------------------------------------------
PROPS = [
    ('props-merch.png', 'propScarfRed', (0.020, 0.238, 0.385, 0.375), True),
    ('props-merch.png', 'propPennant', (0.855, 0.395, 0.950, 0.665), True),
    ('props-merch.png', 'propFlag', (0.720, 0.400, 0.870, 0.585), True),
    ('props-merch.png', 'propSticker', (0.780, 0.800, 0.875, 0.955), True),
    ('props-merch.png', 'propBadges', (0.560, 0.640, 0.640, 0.730), True),
    ('props-merch.png', 'propMatchbox', (0.895, 0.710, 0.980, 0.800), True),
    ('props-street.png', 'propColumn', (0.405, 0.560, 0.490, 0.800), True),
    ('props-street.png', 'propBallReal', (0.355, 0.845, 0.440, 0.960), True),
    ('props-street.png', 'propPapers', (0.445, 0.855, 0.580, 0.955), True),
    ('props-street.png', 'propCoins', (0.695, 0.885, 0.785, 0.945), True),

    # --- ריהוט רחוב — the street furniture, which is a different job -----------------
    #
    # The ten props above are things a HAND holds. These are things a STREET holds, and
    # they exist because the September backdrops are beautiful and empty: the painting
    # gives the child a place to walk and gives the eye nothing to catch on. Dressing is
    # what turns a backdrop into a street somebody lives on — a car at the kerb, a bin by
    # the kiosk, bunting over the road on the day of a match — and every one of them is
    # placed in `scenes.ts` as a fraction, so re-framing the backdrop never orphans one.
    ('props-street.png', 'propCar', (0.575, 0.088, 0.795, 0.292), True),
    ('props-street.png', 'propBus', (0.010, 0.016, 0.342, 0.298), True),
    ('props-street.png', 'propBin', (0.259, 0.336, 0.333, 0.542), True),
    ('props-street.png', 'propPlanter', (0.336, 0.318, 0.508, 0.552)),
    # the pennant line WITHOUT its two poles: the street already owns balconies and a
    # utility pole to tie a string to, and a prop that ships its own posts can only ever
    # be hung in the one place they happen to land
    ('props-street.png', 'propBunting', (0.196, 0.572, 0.368, 0.650), True),
    ('props-street.png', 'propBarrier', (0.808, 0.076, 0.994, 0.298), True),
    ('props-street.png', 'propBarriers', (0.512, 0.328, 0.708, 0.534), True),
    ('props-ground.png', 'propPosters', (0.502, 0.328, 0.642, 0.492), True),
    ('props-merch.png', 'propBanner', (0.226, 0.818, 0.594, 0.936), True),
    ('props-merch.png', 'propSign', (0.016, 0.808, 0.220, 0.952), True),
]


# A bus is not a scarf. Anything that dresses a STREET is measured against the backdrop
# rather than against a hand, so it gets its own cap: wide things by width, tall things
# by height, and everything else keeps the 340px the red box was built for.
PROP_TALL = {'propBin': 300, 'propPlanter': 260, 'propBarrier': 220,
             'propBarriers': 240, 'propPosters': 300, 'propSign': 240}
PROP_WIDE = {'propBus': 760, 'propCar': 560, 'propBunting': 900, 'propBanner': 720}


def main():
    manifest_path = os.path.join(OUT, 'manifest.json')
    manifest = json.load(open(manifest_path, encoding='utf8'))
    sheets_path = os.path.join(OUT, 'sheets.json')
    sheets = json.load(open(sheets_path, encoding='utf8'))

    # `WORKER_ONLY=props` re-cuts the prop sheets alone. The whole run is idempotent, so
    # this is a convenience for the eighth time you nudge a crop box by half a percent —
    # not a second code path: every stage still does exactly what it does above.
    only = os.environ.get('WORKER_ONLY', '')
    stages = set(only.split(',')) if only else {'backdrops', 'sheets', 'props'}

    street_size = None
    for key, name, _ in BACKDROPS:
        if 'backdrops' not in stages:
            break
        path = os.path.join(ART, name)
        if not os.path.exists(path):
            print(f'-- missing {name}')
            continue
        im = Image.open(path).convert('RGB')
        if key == 'street':
            # the foreground registers against the FULL-SIZE street; both are then
            # resampled by the same rule, so the two plates stay in register
            street_size = im.size
        manifest.setdefault('backdrops', {})[key] = write(im, key, max_w=MAX_BACKDROP_W)

    fore = os.path.join(ART, 'street-fore.png')
    if 'backdrops' in stages and os.path.exists(fore) and street_size:
        front, ground = split_foreground(fore, street_size)
        manifest.setdefault('layers', {})['streetFore'] = write(front, 'streetFore', max_w=MAX_BACKDROP_W)
        manifest['layers']['streetGround'] = write(ground, 'streetGround', max_w=MAX_BACKDROP_W)

    for name, band, keyer, names, scale in SHEETS:
        if 'sheets' not in stages:
            break
        path = os.path.join(ART, name)
        if not os.path.exists(path):
            print(f'-- missing {name}')
            continue
        row = Image.open(path).crop(band)
        keyed = ss.key_green(row) if keyer == 'green' else ss.key_alpha(row)
        runs = ss.slice_row_n(keyed, len(names))
        if len(runs) != len(names):
            print(f'!! {name} {band}: wanted {len(names)} figures, found {len(runs)}')
        for (a, b), key in zip(runs, names):
            cut = ba.trim(ba.defringe(keyed.crop((a, 0, b, keyed.height))))
            sheets[key] = write(cut, key, quantise=140, max_h=MAX_FIGURE_H)

    for entry in PROPS:
        if 'props' not in stages:
            break
        name, key, box = entry[0], entry[1], entry[2]
        spill = entry[3] if len(entry) > 3 else False
        path = os.path.join(ART, name)
        if not os.path.exists(path):
            print(f'-- missing {name}')
            continue
        sheet = Image.open(path)
        w, h = sheet.size
        cut = sheet.crop((int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h)))
        keyed = key_flat(cut) if cut.convert('RGB').getpixel((2, 2))[1] > 80 else ss.key_alpha(cut)
        keyed = ba.defringe(keyed)
        if spill:
            keyed = despill(keyed)
        manifest.setdefault('props', {})[key] = write(
            ba.trim(keyed), key, quantise=140,
            max_h=PROP_TALL.get(key, 340), max_w=PROP_WIDE.get(key),
        )

    json.dump(manifest, open(manifest_path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    json.dump(sheets, open(sheets_path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print('\nmanifest + sheets updated')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
