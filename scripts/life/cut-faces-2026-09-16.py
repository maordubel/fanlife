#!/usr/bin/env python3
"""
פנים שהיו של מישהו אחר — four plates cut from a generic extra while the person's own
figure sat on disk.

Maor's note on 16.9.2026 was two photographs of Michel Bar-Khalifa and one sentence:
use the right characters. `faceMichel.webp` was `cut from adultA6` — a thin man in a
plaid shirt — while `michel99.webp`, the man himself in the red Diadora tracksuit with
the gold ה and the whistle, had been on disk since the green-screen shoot eight days
earlier. So the man who ran the supporters' coaches spoke in five chapters with a
stranger's face.

The audit that followed found three more of exactly the same shape:

    faceBarry     ← adultA7   · an old man in a flat cap, in profile
    faceFreddy    ← adultA2   · a man in sunglasses and a patterned shirt
    faceMelamed   ← adultB4   · a man in a teal polo

and in each case the real figure — `barry96`, `freddy`, `melamed` — was already there.
`faceAsaf`, `faceShachor` and `faceSoko` were cut from their own figures and are left
alone; so is every plate that comes off `stageA2`, which IS the approved cast board.

Two things this script does NOT do, both on purpose. It does not paint: the crop is the
delivered artwork at the size it was delivered, upscaled between 1.6× and 2.3×, which is
soft and correct rather than sharp and wrong. And it does not re-argue rule 8: the source
figures have already been through de-yellow (Michel's gold chain is exactly the pixel
that rule exists for), so cutting from the processed file inherits the proof — and the
count below is taken on the DECODED bytes anyway, because a manifest records what a build
claimed (rule 61).

  python3 scripts/life/cut-faces-2026-09-16.py
"""
import importlib.util
import json
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
ART = os.path.join(ROOT, 'public/life/art')

SIZE = 320
CREAM = (237, 230, 216)

# plate ← figure, and how far down the figure the plate reaches, as a fraction of its
# height. A portrait is head and shoulders; Michel's reaches the pendant, because the ה
# on the chain is as much his face as his face is.
CUTS = {
    'faceMichel': ('michel99', 0.31),
    'faceBarry': ('barry96', 0.42),
}

# ------------------------------------------------------------------ and the two that were
# TRIED AND REVERTED, which is the more useful half of this file.
#
#   faceFreddy   ← freddy    (199×331, head ≈ 145px)
#   faceMelamed  ← melamed   (230×331, head ≈ 139px)
#
# Both are the right man and both came out unusable, and looking at the result is the only
# reason we know. Michel and Barry are photographic cut-outs at 548 and 934 pixels tall, so
# a plate is a 1.8× crop of a real face. Freddy and Melamed are painted at a third of that:
# the 2.2× upscale posterises them, and then de-yellow — which has to run AFTER the resize,
# see below — pulls the warm skin the painter used straight out of the band and leaves both
# of them grey-green. Next to `faceKobi` they read as a rendering fault, not as a person.
#
# So they keep their generic plates for now and the gap is stated instead of papered over:
# **Freddy and Melamed need a portrait cut from a larger delivery, or a plate of their
# own.** A wrong face that looks like a person is a casting error somebody will notice and
# fix; a right face that looks broken is a bug report about the engine.
SKIPPED = {
    'faceFreddy': 'freddy is painted at 331px — a 2.2× plate posterises and de-yellows grey',
    'faceMelamed': 'melamed is painted at 331px — same',
}


def head_centre(im: Image.Image, depth: float) -> tuple[int, int, int, int]:
    """A square around the head, centred on the widest part of the figure's top band."""
    width, height = im.size
    alpha = im.split()[3].load()
    bottom = max(8, int(height * depth))
    left, right = width, 0
    for y in range(0, bottom, 2):
        row = [x for x in range(width) if alpha[x, y] > 128]
        if not row:
            continue
        left = min(left, row[0])
        right = max(right, row[-1])
    if right <= left:
        left, right = 0, width
    centre = (left + right) // 2
    half = bottom // 2
    return (centre - half, 0, centre + half, bottom)


def build_art():
    """the one definition of de-yellow in this project, imported rather than re-typed"""
    spec = importlib.util.spec_from_file_location('build_art', os.path.join(HERE, 'build-art.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def yellow_count(path: str) -> int:
    """the canonical band from lib/isYellow.ts, counted on what a decoder hands back"""
    im = Image.open(path).convert('RGB').convert('HSV')
    return sum(
        1
        for h, s, v in im.get_flattened_data()
        if 38 <= h * 360 / 255 <= 70 and s / 255 >= 0.35 and v / 255 >= 0.25
    )


def main() -> None:
    deyellow = build_art().deyellow
    path = os.path.join(ART, 'manifest.json')
    manifest = json.load(open(path, encoding='utf-8'))
    for plate, (figure, depth) in CUTS.items():
        source = Image.open(os.path.join(ART, f'{figure}.webp')).convert('RGBA')
        box = head_centre(source, depth)
        head = source.crop(box)
        canvas = Image.new('RGBA', head.size, (*CREAM, 255))
        canvas.alpha_composite(head)
        out = os.path.join(ART, f'{plate}.webp')
        # RESIZE FIRST, then de-yellow — rule 44's order, and the reason it exists.
        # LANCZOS averages a legal olive with its neighbour and lands the result inside
        # the band: cutting Freddy's head clean and then scaling it invented 303 yellow
        # pixels that were in neither the figure nor the crop.
        image = canvas.convert('RGB').resize((SIZE, SIZE), Image.LANCZOS)
        image, moved = deyellow(image)
        image = image.convert("RGB")
        image.save(out, 'WEBP', quality=92, method=6)
        left = yellow_count(out)
        if left:
            image.save(out, 'WEBP', lossless=True, method=6)
            left = yellow_count(out)
        if left:
            raise SystemExit(f'{plate} still reports {left} yellow pixels — do not ship it')
        manifest['portraits'][plate] = {
            'w': SIZE,
            'h': SIZE,
            'bytes': os.path.getsize(out),
            'source': f'cut from {figure}',
            'box': list(box),
            'yellowLeft': 0,
        }
        print(f'{plate:<14} ← {figure:<10} box={box}  {os.path.getsize(out):>6} bytes  yellowLeft=0')
    json.dump(manifest, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)  # the manifest's own indent — indent=2 reformats all 8,768 lines
    print('manifest updated')


if __name__ == '__main__':
    main()
