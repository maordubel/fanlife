#!/usr/bin/env python3
"""
החולצות על הקיר — trimmed to themselves, and lit like the room they hang in.

    python3 scripts/life/fit-shirts-2026-09-06.py

Maor, 6.9.2026: "לא יכול להיות שהגרפיקה של החולצה נראית נורא ואיום."

Two separate faults, and both are mine:

1. **Padding.** Every shirt is a 1024×1024 canvas with the garment inside it, filling
   78%–94% of the height. The engine sizes a thing by the HEIGHT OF ITS FILE, so a shirt
   asked for at 0.227 of the frame — 72 centimetres against the kiosk's metre — was drawn
   at 0.19, which is sixty. This is the same bug that made half the cast half-size in
   September, and the shirts were never swept.

2. **A studio photograph in a painted room.** The cut-outs are lit flat and bright, on
   white, at full saturation: the wall behind them is a September painting graded cool and
   contrast-eased, and a garment photographed for a catalogue does not belong on it. They
   are pulled to the room — saturation down a touch, a cool cast, the highlights taken off
   the pure white — and given a soft drop shadow so the shirt hangs against the wall
   instead of floating in front of it.

Nothing is repainted and no colour is invented: this is exposure, and it is the same
treatment every backdrop in the project already gets.
"""
import json
import os

import importlib.util

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ART = os.path.join(ROOT, 'public/life/art')

_spec = importlib.util.spec_from_file_location('ig', os.path.join(ROOT, 'scripts/life/ingest-2026-09.py'))
ig = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ig)

SHIRTS = [
    'shirtVisa86', 'shirtVisa85', 'shirtDiadoraRed', 'shirtDiadoraWhite',
    'shirtBasket90', 'shirtShikun', 'shirtKing', 'shirtCrt', 'shirtRedDevil',
]


def trim(im):
    """The proportion rule: a thing is as tall as its file, so the file ends at the thing."""
    box = im.getbbox()
    return im.crop(box) if box else im


def wear_in(im):
    """
    Take a catalogue photograph and put it in a 1985 kiosk.

    Saturation off six per cent, a cool cast of two, and the top end pulled down so a
    studio highlight stops reading as a light source in a room lit by one fluorescent tube.
    """
    a = np.asarray(im.convert('RGBA')).astype(np.float32)
    rgb, alpha = a[..., :3], a[..., 3:]
    lum = rgb @ np.array([0.30, 0.59, 0.11], dtype=np.float32)
    rgb = lum[..., None] * 0.06 + rgb * 0.94                      # saturation, a touch
    rgb *= np.array([0.985, 0.995, 1.012], dtype=np.float32)      # cool, barely
    rgb = np.clip(rgb, 0, 246)                                    # no pure white in this room
    rgb = np.clip((rgb - 128) * 1.03 + 126, 0, 255)               # contrast, a hair
    return Image.fromarray(np.concatenate([rgb, alpha], axis=2).astype(np.uint8))


def hang(im, blur=10, strength=0.40):
    """
    A shadow on the wall behind it — inside the garment's own bounds.

    A cut-out with no shadow floats, and the engine's ellipse is a shadow on the FLOOR: a
    shirt on a wall does not stand on the floor. So the shadow is baked from the garment's
    own silhouette, blurred and offset down-left — and then the result is cropped back to
    the GARMENT's box, not the shadow's. That matters more than the shadow does: the engine
    sizes by file height, so a shadow allowed to grow the canvas would put the padding
    straight back and shrink every shirt again. The shadow that falls outside is clipped,
    which is what a shadow against a wall does anyway.
    """
    w, h = im.size
    pad = int(max(w, h) * 0.08)
    canvas = Image.new('RGBA', (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    mask = im.split()[-1].point(lambda v: int(v * strength))
    shade = Image.new('RGBA', im.size, (26, 22, 20, 255))
    shade.putalpha(mask)
    shade = shade.filter(ImageFilter.GaussianBlur(blur))
    canvas.alpha_composite(shade, (pad - int(w * 0.014), pad + int(h * 0.020)))
    canvas.alpha_composite(im, (pad, pad))
    return canvas.crop((pad, pad, pad + w, pad + h))


def main():
    manifest_path = os.path.join(ART, 'manifest.json')
    manifest = json.load(open(manifest_path, encoding='utf8'))
    for key in SHIRTS:
        path = os.path.join(ART, f'{key}.png')
        if not os.path.exists(path):
            print('  missing', key)
            continue
        before = Image.open(path).convert('RGBA')
        fill_before = (before.getbbox()[3] - before.getbbox()[1]) / before.height
        out = hang(wear_in(trim(before)))
        # …and out through the project's own writer, so it is quantised like everything
        # else and `count_yellow` still reads zero on it.
        row = ig.write(out, key, max_h=900, method=Image.MEDIANCUT)
        row['source'] = manifest.get('shirts', {}).get(key, {}).get('source', 'maor-shirts')
        manifest.setdefault('shirts', {})[key] = row
        out = Image.open(path)
        print(f'  {key:20s} {before.width}x{before.height} ({fill_before * 100:.0f}% full) → {out.width}x{out.height}  {os.path.getsize(path) / 1024:5.0f}KB')
    json.dump(manifest, open(manifest_path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print('\nהחולצות תלויות עכשיו על הקיר, לא צפות מולו')


if __name__ == '__main__':
    main()
