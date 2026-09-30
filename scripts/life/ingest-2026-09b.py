#!/usr/bin/env python3
"""
המסירה השנייה — the art that answers the prompt pack, ingested.

  WORKER_ART=<folder> python3 scripts/life/ingest-2026-09b.py [--only backdrops,sheets]

`docs/life/ART-PROMPTS.md` was written on 3.9.2026 because the graphics in this build
were the weakest thing in it: every backdrop was a RECTANGLE OF A CONCEPT BOARD, some of
them upscaled more than four times, and the protagonist was an illustrated child standing
in a painted photograph. The pack asked for twenty-two specific frames at specific sizes.
Twenty-two frames came back. This script is the other half of that exchange.

**What is different from `ingest-2026-09.py`, and why this is a second file.**

The first delivery introduced whole-frame backdrops and green-screen sheets, and that
script is the record of how they were cut — crop boxes, split lines and all, tuned by
hand over several passes. Re-opening it to bolt a second delivery onto its constant
tables would put two deliveries' worth of hand-tuned numbers in one namespace, and the
first set would stop being re-runnable on its own. So the pipeline is IMPORTED and the
data is separate: `write()`, `key_flat()`, `despill()` and the de-yellow all come from
there and from `build-art.py`, and nothing in this file redefines a treatment.

**The one genuinely new idea: rows and figures are FOUND, not typed in.**

The first script carries pixel boxes for every row of every sheet, which is a fine way to
cut a sheet you have in front of you and a bad way to cut the next one — a delivery that
comes back 40px taller silently slices a head off. These sheets are keyed first and then
measured: `row_bands()` projects the alpha onto the vertical axis and returns the runs of
rows that actually contain a figure, so a two-row sheet reports two bands wherever they
happen to sit. The only thing stated by hand is HOW MANY figures each row holds, which is
a fact about the drawing rather than about the file, and `slice_row_n` already takes it.

**Two names in the code do not exist in the art, on purpose.**

`PLANNED_FIGURE` listed `soldier-rifle` and `soldier-aim`. The prompt pack asked for the
soldier sheet with `IMPORTANT: no weapons in any frame`, and the sheet that came back has
none. Those two names are therefore not "still waiting" — they are retired, here and in
`art.ts`, because the protagonist of this game is a child growing up and the brief is
explicit that nothing dangerous is ever offered to him as an option. A name left in the
list is a scene somebody writes later.
"""
import argparse
import importlib.util
import json
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'public/life/art')
ART = os.environ.get('WORKER_ART', os.path.join(ROOT, 'brand/source/life-2026-09b'))


def _load(name, filename):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, filename))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


ba = _load('ba', 'build-art.py')
ss = _load('ss', 'slice-sheets.py')
ig = _load('ig', 'ingest-2026-09.py')

MAX_BACKDROP_W = ig.MAX_BACKDROP_W
MAX_FIGURE_H = ig.MAX_FIGURE_H
# A portrait plate is read at the size of a dialogue box, not at the size of a person.
MAX_FACE_H = 260


def deyellow_place(im):
    """
    צהוב במקום, לא על חולצה — clear the yellow band without repainting the ground.

    `build-art.deyellow` moves a SATURATED yellow off the band by rotating its hue to 26°.
    That is the correct treatment for the thing rule 8 was written about: a shirt, a flag,
    a badge, a printed page — an object whose colour is a claim about somebody.

    It is the wrong treatment for a place. Bloomfield's interior came back painted at hue
    44, saturation 0.62 across the whole pitch — a dry, sun-bleached, late-May playing
    surface, which is what that pitch looked like — and the rule caught it correctly and
    rotated a third of the frame to terracotta. A football ground the colour of a plant
    pot passes the scanner and fails the eye.

    So a backdrop leaves the band the OTHER way: hue stays where the painter put it, and
    saturation is capped under the scanner's threshold. `count_yellow` reads zero either
    way — that is the whole property, and it is a property of saturation as much as of
    hue — while the pitch stays a pale khaki-green and a yellow awning stays an awning.
    Every figure, prop and document in this project still goes through the rotation.
    """
    rgb = im.convert('RGB')
    px = rgb.load()
    w, h = rgb.size
    moved = 0
    for y in range(h):
        for x in range(w):
            p = px[x, y]
            hh, s, v = ba.rgb_to_hsv(*p)
            if s <= ba.SAFE_SAT or v < ba.VAL_MIN or not (ba.HUE_MIN <= hh <= ba.HUE_MAX):
                continue
            q = ba.hsv_to_rgb(hh, ba.safe_sat(s), v)
            if q != p:
                px[x, y] = q
                moved += 1
    if im.mode == 'RGBA':
        rgb = rgb.convert('RGBA')
        rgb.putalpha(im.split()[-1])
    return rgb, moved


# =================================================================================
# BACKDROPS
#
# Fifteen frames, and every one of them REPLACES a file that is already in the build
# under the same key. That is the point rather than a risk to be managed: `bedroom` and
# `kitchen` were 4× upscales of a panel, `stand` was a crop, and the walk band of each
# scene is a pair of fractions that has to be re-measured against whatever painting sits
# under it. The scene file is where that recalibration lives; this script's only job is
# to put an honest, correctly-sized painting under it.
#
# `keep` is a crop applied BEFORE anything else, as fractions of the delivered frame.
# It exists for exactly one reason: a 16:9 room drawn with a metre of ceiling above the
# door wastes a third of the texture on plaster nobody looks at, and the walk band gets
# squeezed into the bottom quarter of the screen as a result. Cropping the ceiling is not
# a correction of the painting — it is the framing decision the game needs and the
# painting cannot know about.
# =================================================================================
BACKDROPS = [
    # --- the rooms ----------------------------------------------------------------
    #
    # The kitchen REPLACES a heavily upscaled crop of a concept panel — the 4.3× the
    # prompt pack opened with — and is drawn straight-on with a wide empty floor, which is
    # the one thing a walk band actually needs. Two takes of it came back, a cooler and a
    # warmer; the cooler ships and the warmer stays in the source folder against the day a
    # scene wants an afternoon.
    #
    # `living.png` is in that folder and is NOT ingested, and the reason is worth writing
    # down because it is not about the painting. The flat's living room has three ways out
    # of it — the street, the kitchen, the child's bedroom — and the new painting has two
    # doors. Worse, `home` carries a `livingTable` LAYER: the old room's coffee table, cut
    # out so the child can walk behind it, which is the one thing that makes that room a
    # place rather than a photograph. The new room has no coffee table, so the layer would
    # float over bare terrazzo. Two doors and a ghost table is not an upgrade. It is the
    # right painting for a different flat, and the 1990s chapter needs one.
    ('kitchen', 'kitchen.png', None),
    # The old `kiosk` was a shopfront seen from the street. The scene has always been an
    # INTERIOR the child walks into, so the backdrop and the scene disagreed about where
    # the player was standing. This is the inside: counter, shelves, the ice-cream chest,
    # and the doorway back out to the street on the left where the exit already is.
    ('kiosk', 'kiosk.png', None, True),

    # --- the outdoors -------------------------------------------------------------
    # The old pitch had ten painted boys frozen on it forever, which is the exact flaw
    # the street was repainted to fix in September: a place with people painted into it
    # cannot have people in it. This one is empty, and the game's own children play on it.
    ('pitch', 'pitch.png', None),

    # --- Bloomfield ----------------------------------------------------------------
    #
    # `stand` is the single most important backdrop in this game and it was the worst: an
    # ILLUSTRATED AERIAL of the whole bowl, which is a map rather than a place — the child
    # stood at 86 minutes on a drawing that had no ground in it and no rail to hold. This
    # one is the terrace at a child's eye level: concrete underfoot, a crash barrier, and
    # somebody's red-and-white scarf tied to it. `bloomfield-inside` already carries a
    # `rail` hotspot labelled המעקה; the art has now caught up with the scene.
    ('stand', 'stand.png', None),
    # `corridor` was a placeholder from the day the tunnel scene was written — a dim
    # interior that stood in for a tunnel because there was no tunnel. This is the tunnel:
    # the mouth of it, the light at the end of it, and a full stand beyond.
    ('corridor', 'tunnel.png', None),
    # New key, no scene yet. The concourse under the stand — raking columns, turnstiles, a
    # cart selling something — which is the beat between the gate and the terrace that the
    # chapter currently skips. It ships now so the 1983–2000 plan can call for it by name
    # rather than describe it (rule 43).
    ('undercroft', 'ground.png', None),

    # --- Ussishkin, for the basketball chapter --------------------------------------
    ('ussExt', 'ussExt.png', None),
    ('ussHall', 'ussHall.png', None),
    # New key. The same hall an hour earlier: half-full, players warming up, a man
    # carrying a crate of bottles across the floor. A place is two paintings — before and
    # during — far more cheaply than it is two scenes.
    ('ussHallPre', 'ussHallPre.png', None),
]

# --- מה שלא נכנס, ולמה --------------------------------------------------------------
#
# Three frames of this delivery are staged in `brand/source/life-2026-09b` and are NOT
# ingested, and saying so here is cheaper than rediscovering it in a month:
#
#   street.png   — the same street, same camera, same kerb line as the one shipping,
#                  with the kiosk shutter DOWN, cars at the kerb and the graffiti faded.
#                  It is an afternoon, not a replacement. Taking it would orphan
#                  `streetFore`/`streetGround`, which are registered to the shipping
#                  plate, and throw away a walk band and eleven dressing fractions that
#                  were measured against it. It is the right art for "the street at four
#                  o'clock" the moment a scene can hold two paintings.
#   gate7.png    — the queue at the orange door, from inside the concourse. Beautiful,
#                  and it has a dozen people painted into it and a walk band that recedes
#                  diagonally. The shipping gate7 is straight-on and has the number 7 on
#                  it, which is the whole point of that gate.
#   reveal.png   — the bowl in daylight from the corner. The shipping `reveal` is the
#                  terrace at night, packed, under flares, with a scarf held up. That one
#                  is the reveal.


# =================================================================================
# CHARACTER SHEETS
#
# `(file, keyer, rows)` where each row is `(count, [names])`. Rows are FOUND by
# `row_bands()`; only the count and the names are stated, because those are facts about
# what was drawn rather than about where it landed in the file.
# =================================================================================
SHEETS = [
    # ---- פוגי, גיל שמונה: הליכה אמיתית ------------------------------------------
    #
    # Eight frames, and the reason this matters more than it sounds: the game has been
    # walking the protagonist on TWO frames since the September pass, because two was
    # what the sheet held. Two side-on strides read as walking and were honest about the
    # drawing; eight is a walk. `KID_WALK` in `art.ts` grows to match and nothing else
    # in the runtime changes — which is what that comment promised would happen.
    ('pogi-walk8.png', 'green', [
        (8, [f'pogi-w{i}' for i in range(1, 9)]),
    ]),

    # ---- פוגי, גיל שלוש-עשרה ------------------------------------------------------
    ('pogi-teen.png', 'green', [
        (7, ['teen', 'teen-3q', 'teen-side', 'teen-back', 'teen-walk', 'teen-pockets', 'teen-cross']),
        (7, ['teen-sit', 'teen-lean', 'teen-crouch', 'teen-cheer', 'teen-scarf', 'teen-look', 'teen-away']),
    ]),

    # ---- משה סיני ------------------------------------------------------------------
    #
    # The footballer on the bedroom wall, and — because this is a life simulation and not
    # a football game — a man in a shirt and slacks in the second row. Both rows are the
    # same person, which is the entire argument for drawing a player twice.
    ('sinai.png', 'green', [
        (7, ['sinai', 'sinai-3q', 'sinai-side', 'sinai-back', 'sinai-ball', 'sinai-kick', 'sinai-cheer']),
        (7, ['sinai-civA', 'sinai-civB', 'sinai-civC', 'sinai-civD', 'sinai-point', 'sinai-civE', 'sinai-civF']),
    ]),

    # ---- שלום תקוה ------------------------------------------------------------------
    # Home red on the top row, away white on the bottom, and the last away frame wears
    # the captain's armband — which is the one detail that makes a second kit worth
    # drawing rather than a recolour.
    ('tikva.png', 'green', [
        (7, ['tikva', 'tikva-3q', 'tikva-side', 'tikva-back', 'tikva-ball', 'tikva-kick', 'tikva-cheer']),
        (7, ['tikva-away', 'tikva-away-smile', 'tikva-away-side', 'tikva-away-back',
             'tikva-away-ball', 'tikva-point', 'tikva-captain']),
    ]),

    # ---- פוגי חייל, 1996 ------------------------------------------------------------
    #
    # Fourteen poses and not one weapon, which was stated in the prompt and honoured in
    # the delivery. `soldier-rifle` and `soldier-aim` are gone from `art.ts` in the same
    # commit; the names that survive all describe something the sheet actually contains.
    ('soldier.png', 'green', [
        (7, ['soldier', 'soldier-stand', 'soldier-side', 'soldier-back',
             'soldier-march', 'soldier-pack', 'soldier-crate']),
        (7, ['soldier-tired', 'soldier-shout', 'soldier-tie', 'soldier-away',
             'soldier-lean', 'soldier-look', 'soldier-beret']),
    ]),

    # ---- אופיר, גיל עשרים ------------------------------------------------------------
    # Seven poses of the same twenty-year-old, replacing six plates that were cut from an
    # older board. Mixing the two would put two different faces under one name, which is
    # the exact failure the Pogi rewrite was for.
    ('ofir90.png', 'green', [
        (7, ['ofir90', 'ofir90-3q', 'ofir90-side', 'ofir90-back',
             'ofir90-sitA', 'ofir90-arms', 'ofir90-walk']),
    ]),
]

# ---- לוח הפנים -------------------------------------------------------------------
#
# The two portrait stages are the only things in this project written WITHOUT a colour
# table, and the reason is measurable rather than aesthetic. A plate is 60% flat cream and
# 15% face; both quantisers allocate by where the pixels are — the octree by position in
# the RGB cube, median cut by population — and on this histogram both spend their budget
# on cream and map the lit side of the child's cheek to the nearest entry they kept. Five
# portraits arrived with holes punched in their faces, twice, by two different methods.
# The plates are 210 pixels wide and cost 60KB as painted, so the exception is cheap and
# the rule is unharmed: `count_yellow` still runs on the file that is written, and it
# still reads zero. Everything else in this delivery keeps the table.
#
# Not a green screen: a warm cream ground, which `key_flat` handles without knowing the
# difference because it samples the corner rather than assuming a hue. Six heads were
# asked for and the sixth ran off the right edge of the delivered frame, so five ship and
# the sixth is not faked from a crop of another one — a half-portrait stretched to width
# is exactly the sort of thing this project does not do.
FACE_SHEET = ('pogi-face.png', 6, ['facePogi', 'facePogi-smile', 'facePogi-wide',
                                  'facePogi-shout', 'facePogi-down', None])

# ---- הפנים של השחקנים -------------------------------------------------------------
#
# ---- מה שלא נחתך כאן ---------------------------------------------------------------
#
# Empty, and deliberately. The first version of this stage cut head-and-shoulders busts
# out of the Sinai sheet, and they were a mistake twice over: `public/life/art` already
# holds seven `faceSinai*` plates cut from an older board, and the figure in the sheet is
# 407 pixels tall, so a bust of him is a 121-pixel thumbnail — smaller and softer than the
# plates it would have replaced.
#
# The real problem it exposed is not a cropping problem: those seven plates are a
# DIFFERENT man's face from the one now walking around as `sinai`, and the same is true of
# the nine `faceSoldier*` plates. Fixing that properly means a portrait sheet for each of
# them, the way the child got one — five plates painted as portraits beat any number of
# crops — and that is a line in the prompt pack, not a slice box here.
BUSTS = []


def row_bands(keyed, min_run=24, floor=8):
    """
    איפה השורות — find the rows of a sheet by looking at it.

    Projects alpha onto the vertical axis and returns `(top, bottom)` for every run of
    rows that holds more than `floor` opaque pixels. A sheet drawn as two rows of seven
    reports two bands; the same sheet delivered 40px taller reports the same two bands in
    their new places, which is the whole reason this is measured rather than typed.

    `min_run` throws away a stray line of antialiasing between rows without throwing away
    a row: no figure in this project is 24 pixels tall.
    """
    alpha = keyed.split()[-1]
    w, h = alpha.size
    px = alpha.load()
    rows = []
    for y in range(h):
        n = 0
        for x in range(0, w, 3):          # every third column: this is a presence test
            if px[x, y] > 24:
                n += 1
                if n > floor:
                    break
        rows.append(n > floor)

    bands, start = [], None
    for y, filled in enumerate(rows):
        if filled and start is None:
            start = y
        elif not filled and start is not None:
            if y - start >= min_run:
                bands.append((start, y))
            start = None
    if start is not None and h - start >= min_run:
        bands.append((start, h))
    return bands


def slice_by_gaps(strip, n, min_gap=16):
    """
    חיתוך על הרווחים — cut where the sheet is genuinely empty, and nowhere else.

    `slice_sheets.slice_row_n` cuts a row into N by taking the N-1 emptiest columns,
    refusing any cut within 55% of the average spacing of one already made. That rule
    exists because the CONCEPT BOARDS it was written for have figures that touch: on a
    board with no gap to find, cutting through the thinnest place is the only thing left.

    These sheets are not boards. `docs/life/ART-PROMPTS.md` asked for a clean 40-pixel
    green gap between every figure and got one — and on unevenly spaced rows the 55% rule
    then works against itself: two real gaps 131 pixels apart, on a row whose average
    spacing is 256, and the second one is refused for being too close to the first. Six
    figures out of seven, silently, with the seventh welded to its neighbour.

    So when the gaps are there, use them: every run of empty columns strictly inside the
    row is a candidate, the N-1 widest are the cuts, and each cut lands in the middle of
    its gap. Returns None when the row does not have enough gaps to be sure, and the
    caller falls back to the density method — which is the right answer for a sheet whose
    figures really do touch.
    """
    ink = ss.ink_profile(strip)
    width = len(ink)
    first = next((x for x, v in enumerate(ink) if v), None)
    last = next((x for x in range(width - 1, -1, -1) if ink[x]), None)
    if first is None or last is None:
        return None
    if n == 1:
        return [(first, last + 1)]

    gaps, start = [], None
    for x in range(first, last + 1):
        if not ink[x] and start is None:
            start = x
        elif ink[x] and start is not None:
            if x - start >= min_gap:
                gaps.append((start, x))
            start = None
    if len(gaps) < n - 1:
        return None

    # The widest N-1 are the ones between figures; anything narrower is a gap INSIDE a
    # figure — between an arm and a torso, or under a raised knee — and must not be cut.
    chosen = sorted(sorted(gaps, key=lambda g: g[1] - g[0], reverse=True)[: n - 1])
    edges = [first, *[(a + b) // 2 for a, b in chosen], last + 1]
    runs = []
    for i in range(len(edges) - 1):
        a, b = edges[i], edges[i + 1]
        while a < b and not ink[a]:
            a += 1
        while b > a and not ink[b - 1]:
            b -= 1
        if b - a < 18:
            return None
        runs.append((a, b))
    return runs


def cut_sheet(path, keyer, rows, manifest_sheets, max_h=MAX_FIGURE_H, quantise=140):
    """One sheet: key it whole, find its rows, slice each row into its stated count."""
    sheet = Image.open(path)
    keyed = ig.key_flat(sheet) if keyer == 'green' else ss.key_alpha(sheet)
    if keyer == 'green':
        keyed = ig.despill(keyed)
    keyed = ba.defringe(keyed)

    bands = row_bands(keyed)
    if len(bands) != len(rows):
        print(f'!! {os.path.basename(path)}: found {len(bands)} rows, expected {len(rows)} — {bands}')
        return
    for (top, bottom), (count, names) in zip(bands, rows):
        assert count == len(names), f'{names}: count {count} != {len(names)} names'
        strip = keyed.crop((0, top, keyed.width, bottom))
        runs = slice_by_gaps(strip, count) or ss.slice_row_n(strip, count)
        if len(runs) != count:
            print(f'!! {os.path.basename(path)} row {top}-{bottom}: wanted {count}, found {len(runs)}')
            continue
        for (a, b), key in zip(runs, names):
            cut = ba.trim(strip.crop((a, 0, b, strip.height)))
            manifest_sheets[key] = ig.write(cut, key, quantise=quantise, max_h=max_h)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', default='')
    args = ap.parse_args()
    stages = set(args.only.split(',')) if args.only else {'backdrops', 'sheets', 'faces', 'busts'}

    manifest_path = os.path.join(OUT, 'manifest.json')
    manifest = json.load(open(manifest_path, encoding='utf8'))
    sheets_path = os.path.join(OUT, 'sheets.json')
    sheets = json.load(open(sheets_path, encoding='utf8'))

    if 'backdrops' in stages:
        print('--- backdrops ---')
        for entry in BACKDROPS:
            key, name, keep = entry[0], entry[1], entry[2]
            flip = entry[3] if len(entry) > 3 else False
            path = os.path.join(ART, name)
            if not os.path.exists(path):
                print(f'-- missing {name}')
                continue
            im = Image.open(path).convert('RGB')
            if keep:
                w, h = im.size
                im = im.crop((int(keep[0] * w), int(keep[1] * h), int(keep[2] * w), int(keep[3] * h)))
            # A mirrored painting is not a compromise, it is a framing decision made at the
            # last possible moment. The kiosk was drawn with its street doorway on the
            # left; `kiosk` has had its exit on the right since the scene was written, and
            # every actor, the counter hotspot and the spawn are placed around that. One
            # flag here costs nothing and keeps six tuned fractions true — moving the exit
            # instead would have moved all of them.
            if flip:
                im = im.transpose(Image.FLIP_LEFT_RIGHT)
            manifest.setdefault('backdrops', {})[key] = ig.write(
                im, key, max_w=MAX_BACKDROP_W, dey=deyellow_place, shift=False
            )

    if 'sheets' in stages:
        print('--- sheets ---')
        for name, keyer, rows in SHEETS:
            path = os.path.join(ART, name)
            if not os.path.exists(path):
                print(f'-- missing {name}')
                continue
            cut_sheet(path, keyer, rows, sheets)

    if 'faces' in stages:
        print('--- faces ---')
        name, count, names = FACE_SHEET
        path = os.path.join(ART, name)
        if os.path.exists(path):
            src = Image.open(path).convert('RGB')
            # Keyed ONLY to find the cuts, never to write. A cream ground is a few units
            # from a lit cheek in RGB, so any key tight enough to keep the whole face
            # punches holes in it — the first run of this stage produced five portraits
            # with the light side of the chin missing. The plate was PAINTED on cream, on
            # purpose, and a dialogue portrait is a card rather than a cut-out: so the
            # measurement is keyed and the pixels that ship are the painting.
            keyed = ig.key_flat(src, near=26, far=52)
            bands = row_bands(keyed)
            if len(bands) != 1:
                print(f'!! {name}: found {len(bands)} rows, expected 1')
            else:
                top, bottom = bands[0]
                strip = keyed.crop((0, top, keyed.width, bottom))
                runs = slice_by_gaps(strip, count) or ss.slice_row_n(strip, count)
                pad = round(0.06 * (bottom - top))
                for (a, b), key in zip(runs, names):
                    # `None` is the sixth portrait, which ran off the right edge of the
                    # delivered frame. It is still CUT — the slicer needs all six to find
                    # the five gaps between them — and then dropped, because half a face
                    # widened to fill a plate is worse than five plates.
                    if key is None:
                        continue
                    box = (max(0, a - pad), max(0, top - pad),
                           min(src.width, b + pad), min(src.height, bottom + pad))
                    sheets[key] = ig.write(src.crop(box), key, quantise=0, max_h=MAX_FACE_H)
        else:
            print(f'-- missing {name}')

    if 'busts' in stages:
        print('--- busts ---')
        for name, row_i, fig_i, key, keep in BUSTS:
            path = os.path.join(ART, name)
            if not os.path.exists(path):
                print(f'-- missing {name}')
                continue
            keyed = ba.defringe(ig.despill(ig.key_flat(Image.open(path))))
            bands = row_bands(keyed)
            if row_i >= len(bands):
                print(f'!! {name}: row {row_i} not found')
                continue
            top, bottom = bands[row_i]
            strip = keyed.crop((0, top, keyed.width, bottom))
            runs = slice_by_gaps(strip, 7) or ss.slice_row_n(strip, 7)
            if fig_i >= len(runs):
                print(f'!! {name}: figure {fig_i} not found')
                continue
            a, b = runs[fig_i]
            fig = ba.trim(strip.crop((a, 0, b, strip.height)))
            cut = ba.trim(fig.crop((0, 0, fig.width, int(keep * fig.height))))
            sheets[key] = ig.write(cut, key, quantise=0, max_h=MAX_FACE_H)

    json.dump(manifest, open(manifest_path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    json.dump(sheets, open(sheets_path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print('\nmanifest + sheets updated')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
