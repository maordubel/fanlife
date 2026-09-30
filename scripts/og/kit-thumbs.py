#!/usr/bin/env python3
"""כרטיסי השיתוף — the kit archive's photographs, as PNG, for the OG renderer (delta 89).

`next/og` (satori) cannot read WebP, and the share card must show the scorer's REAL shirt
(CLAUDE.md: a real photograph beats anything we draw). So every photograph of
`public/kits/*.webp` gets one small PNG twin in `public/kits/og/`: the same pixels, scaled to
fit 320×320 on its transparent canvas and stored as a 128-colour palette PNG (~10 KB).
Nothing else is done to it — no grade, no de-yellow: it is the archive's photograph.

    python3 scripts/og/kit-thumbs.py        # rebuild all; prints the count
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'public' / 'kits'
OUT = SRC / 'og'


def main() -> None:
    OUT.mkdir(exist_ok=True)
    made = 0
    wanted = set()
    for path in sorted(SRC.glob('*.webp')):
        target = OUT / (path.stem + '.png')
        wanted.add(target.name)
        image = Image.open(path).convert('RGBA')
        image.thumbnail((320, 320), Image.LANCZOS)
        image.quantize(colors=128, method=Image.Quantize.FASTOCTREE).save(target, 'PNG', optimize=True)
        made += 1
    for stale in OUT.glob('*.png'):
        if stale.name not in wanted:
            stale.unlink()
    print(f'kit og thumbs: {made}')


if __name__ == '__main__':
    main()
