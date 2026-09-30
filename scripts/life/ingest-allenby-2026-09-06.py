#!/usr/bin/env python3
"""
אלנבי — the corner, painted, in three decades. And the crate, and the rail.

    python3 scripts/life/ingest-allenby-2026-09-06.py

Maor sent these on 6.9.2026, an hour after opening the junction in the map: the corner of
Allenby with the record shop, the green door at number 96, the archway through the block
and the café under the red awning — the same corner in the eighties, the nineties and the
two-thousands, told by what is in the shop window. Vinyl and wooden chairs; then CDs,
cassettes and red plastic chairs; then a phone shop. Nobody has to read a caption.

Also here: `propCrate`, which has been on the art-required list since delta 27, delivered
as six passes of the same frame — checkerboard, green screen and a matte. The colour is
taken from a checkerboard pass and the ALPHA from the matte, which is the only way to get
the holes right: this crate is mostly holes, and a keyer working off green or off a
checkerboard will always fill the eighteen bottle wells with something.

And `shopHanger`: the rail on the concrete wall that `components/life/ShopCard.tsx` hangs
the collection from.

Everything is written under the name the game already asks for, so nothing in the code
moves when a better version of any of them arrives.
"""
import os
import subprocess
import sys

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ART = os.path.join(ROOT, 'public/life/art')
DROP = os.environ.get('WORKER_DROP', '/root/.claude/uploads/1031bb6e-b609-5caf-8b3a-4b2f7101c0c4')

# the corner, by what is in the window
BACKDROPS = {
    '05b8c6f5': 'allenby',      # תקליטים, vinyl, wooden chairs — the eighties
    '74320cb8': 'allenby90',    # תקליטורים חדשים, קסטות, red plastic chairs — the nineties
    '6ae531f0': 'allenby2000',  # סלולר, כרטיסי חיוג — the two-thousands
}
CRATE_COLOUR = '9e27d794'       # the crate on a checkerboard
CRATE_MATTE = '7811b4bc'        # the same frame as a matte: white is the crate
HANGER = '3264b1dc'             # the rail and the empty hangers


def drop(name: str) -> str:
    path = os.path.join(DROP, f'{name}-image.png')
    if not os.path.exists(path):
        raise SystemExit(f'missing: {path}')
    return path


def backdrops() -> list[str]:
    keys = []
    for src, key in BACKDROPS.items():
        im = Image.open(drop(src)).convert('RGB')
        # 16:9 already; `finish-backdrops.py` brings it to 1600 wide, quantises, de-yellows
        # and writes the two portrait strips. Nothing is cropped here — the pavement at the
        # bottom of this frame is the walk band and the sky at the top is the sky.
        im.save(os.path.join(ART, f'{key}.png'))
        print(f'{key}: {im.size} from {src}')
        keys.append(key)
    return keys


def crate() -> None:
    colour = np.asarray(Image.open(drop(CRATE_COLOUR)).convert('RGB'), dtype=np.uint8)
    matte = np.asarray(Image.open(drop(CRATE_MATTE)).convert('L'), dtype=np.float64)
    if colour.shape[:2] != matte.shape[:2]:
        raise SystemExit(f'crate passes disagree: {colour.shape[:2]} vs {matte.shape[:2]}')
    # the matte is white-on-black; anything above the midpoint is crate. A soft shoulder
    # rather than a threshold, so the moulded edges do not come out as a stencil.
    alpha = np.clip((matte - 96) / 64.0, 0, 1) * 255
    rgba = np.dstack([colour, alpha.astype(np.uint8)])
    im = Image.fromarray(rgba, 'RGBA')
    box = Image.fromarray((alpha > 8).astype(np.uint8) * 255).getbbox()
    im = im.crop(box)
    # into the game's light: a shade down, a shade less saturated, like every other prop
    a = np.asarray(im, dtype=np.float64)
    rgb = a[..., :3] / 255.0
    lum = rgb @ np.array([0.2126, 0.7152, 0.0722])
    rgb = rgb * 0.93 + 0.015
    rgb = rgb * 0.9 + lum[..., None] * 0.1
    im = Image.fromarray(np.dstack([np.clip(rgb * 255, 0, 255).astype(np.uint8), a[..., 3].astype(np.uint8)]), 'RGBA')
    im.thumbnail((560, 560), Image.LANCZOS)
    im.save(os.path.join(ART, 'propCrate.png'))
    print(f'propCrate: {im.size}, {int((np.asarray(im)[..., 3] < 8).mean() * 100)}% open')


def hanger() -> None:
    im = Image.open(drop(HANGER)).convert('RGB')
    # the shop card draws this as the wall behind the rail; it is a background, not a prop
    im.thumbnail((1600, 1600), Image.LANCZOS)
    im.save(os.path.join(ART, 'shopHanger.png'))
    print(f'shopHanger: {im.size}')


def main() -> None:
    keys = backdrops()
    crate()
    hanger()
    subprocess.run(['python3', os.path.join(ROOT, 'scripts/life/finish-backdrops.py'), *keys], check=True, cwd=ROOT)
    subprocess.run(['python3', os.path.join(ROOT, 'scripts/life/build-art.py'), '--only', 'propCrate,shopHanger'],
                   cwd=ROOT, check=False)


if __name__ == '__main__':
    sys.exit(main())
