#!/usr/bin/env python3
"""
פלייטים שנחתכו על התפר, והחור שהסתיר אותם.

`faceTeacher` is 172×260 and holds TWO half-teachers, cut across the gutter of an
expression sheet. It is wired: `chapter1991.ts`, `chapter1998laces.ts` and
`characters.ts` all pointed `'המורה'` at it, so every line the teacher has ever spoken
drew two half-faces in the box. Ten more plates in the same two families are the same.

**Why nothing caught it.** Sixty-five face plates are on disk and NONE of them is in
`manifest.json` — they were ingested and never registered. The yellow proof counts the
registry; the art audit walks the registry; both reported clean while these sat outside
it. A file nothing knows about is a file nothing can check.

This script does the two things that are safe, and refuses the one that is not:

  · **De-yellows and registers** every face plate, and proves it on the DECODED bytes
    (rule 61). This is not housekeeping: the unregistered set was never cleaned, and
    `faceSinai-point` alone was shipping **2,531 pixels inside the band** — rule 8, in
    production, on a portrait, for as long as those files have been on disk.
  · **Reports** every plate that draws more than one person at the face line.
  · **Does NOT re-cut them.** A first draft tried; it "recovered" a 33-pixel sliver of an
    ear from between two overlapping heads and called it a portrait, and the three it
    liked best were single faces all along that it merely trimmed. The source sheets are
    not in this repository, so a half-face cannot be made whole here, and the Freddy
    lesson from earlier today applies exactly: a right face that looks broken is a bug
    report, not a fix. The list goes to `docs/life/CLOSE-UP-BRIEF.md`.

  python3 scripts/life/face-plates-2026-09-16.py            # report
  python3 scripts/life/face-plates-2026-09-16.py --register # …and write the manifest
"""
from __future__ import annotations

import glob
import importlib.util
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location('build_art', os.path.join(HERE, 'build-art.py'))
build_art = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(build_art)


def figures(im: Image.Image, frac: float = 0.42) -> int:
    """
    How many separate people cross a horizontal line at the face height.

    **Background is decided by ALPHA where there is one**, and only by colour where there
    is not. A first draft sampled pixel (1,1) as "the background colour" for every plate,
    which is right for the cream ones and wrong for the keyed ones: Keren's plate has a
    transparent corner that reads as black, her dark hair then reads as background, and
    one woman was reported as two. Three of the ten families were over-reported that way,
    and this list is a list somebody re-cuts art from — a false name on it costs an
    afternoon of drawing that did not need doing.
    """
    rgba = im.convert('RGBA')
    width, height = rgba.size
    px = rgba.load()
    keyed = any(px[x, y][3] < 8 for x, y in ((0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)))
    bg = px[1, 1][:3]
    y = int(height * frac)
    spans, start = [], None
    for x in range(width):
        r, g, b, a = px[x, y]
        on = a >= 8 if keyed else not (abs(r - bg[0]) < 16 and abs(g - bg[1]) < 16 and abs(b - bg[2]) < 16)
        if on and start is None:
            start = x
        elif not on and start is not None:
            spans.append(x - start)
            start = None
    if start is not None:
        spans.append(width - start)
    return len([s for s in spans if s > width * 0.06])


def sweep(im: Image.Image) -> Image.Image:
    """
    המטאטא — whatever `deyellow` left behind.

    `build-art.deyellow` works on a band and a saturation floor tuned for a painting; a
    handful of pixels on these plates sit just inside the CANONICAL band and just outside
    its own, so one pass leaves single digits and `faceElimelech-look` leaves 284. Rather
    than widen the shared definition of yellow — which every other asset in the game is
    already clean against — this walks the survivors and rotates each one off the band at
    its own saturation and value. Same treatment, applied pixel by pixel, to the remainder.
    """
    import colorsys

    rgba = im.convert('RGBA')
    px = rgba.load()
    width, height = rgba.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if 38 <= h * 360 <= 70 and s >= 0.35 and v >= 0.25:
                nr, ng, nb = colorsys.hsv_to_rgb(26 / 360, min(0.86, s * 0.9), v)
                px[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)
    return rgba


def yellow(path: str) -> int:
    """
    The canonical band from `lib/isYellow.ts`, counted on what a decoder hands back — and
    **with the alpha channel respected**.

    Counting `convert('RGB')` costs an hour every time somebody forgets: a fully
    transparent pixel still carries RGB, that RGB is whatever the keying left behind, and
    a lot of it is in the band. This script chased nine phantom pixels on
    `faceElimelech-calm` that no player could ever see, in a session that had already made
    the same mistake once. `build-art.count_yellow` has always done it correctly (`a < 8`),
    so this defers to it rather than keeping a second opinion about what yellow is.
    """
    return build_art.count_yellow(Image.open(path))


def main() -> None:
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    art = os.path.join(root, 'public/life/art')
    path = os.path.join(art, 'manifest.json')
    manifest = json.load(open(path, encoding='utf-8'))
    portraits = manifest.setdefault('portraits', {})

    added, broken, dirty = [], [], []
    for file in sorted(glob.glob(os.path.join(art, 'face*.webp'))):
        key = os.path.basename(file)[:-5]
        im = Image.open(file)
        if figures(im) > 1:
            broken.append((key, im.size))
        if key in portraits:
            continue
        left = yellow(file)
        if left:
            dirty.append((key, left))
            if '--register' in sys.argv:
                cleaned, _ = build_art.deyellow(im.convert('RGBA'))
                cleaned = sweep(cleaned)
                cleaned.save(file, 'WEBP', lossless=True, method=6)
                left = yellow(file)
                if left:
                    raise SystemExit(f'{key} still reports {left} yellow pixels after cleaning')
        added.append(key)
        if '--register' in sys.argv:
            im = Image.open(file)
            portraits[key] = {
                'w': im.size[0],
                'h': im.size[1],
                'bytes': os.path.getsize(file),
                'source': 'ingested before the registry covered face plates',
                'yellowLeft': left,
            }

    print(f'--- face plates missing from the manifest ({len(added)}) ---')
    print('   ' + ' '.join(added))
    print(f'\n--- more than one person on the plate ({len(broken)}) ---')
    for key, size in broken:
        print(f'   {key:<26} {size[0]}x{size[1]}')
    print(f'\n--- yellow found while registering ({len(dirty)}) ---')
    for key, left in dirty:
        print(f'   {key:<26} {left} px')
    if '--register' in sys.argv:
        json.dump(manifest, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('\nmanifest updated')


if __name__ == '__main__':
    main()
