#!/usr/bin/env python3
"""
מפתח הגיליונות — rebuild `public/life/art/sheets.json` from the art that actually shipped.

`slice-sheets.py` writes this file as a side effect of CUTTING the character sheets, so
it only ever describes the boards that were sliced in that run. Three rounds of art
later, 213 figures were on disk and the index still listed seventeen — and
`tests/life.test.ts` reads the index, not the folder, so `never invents a figure the
runtime names` was failing on `kobi-chair` while `kobi-chair.png` sat right there.

This script fixes the index rather than the test. It measures what is on disk: every PNG
in the art folder that the build manifest does not already claim as a backdrop, prop,
portrait or layer is a character sheet, and its row is its real width, height, byte size
and yellow count. Nothing is inferred and nothing is copied from a previous run — if a
file is not there, it does not get a row.

`yellowLeft` uses the same hue definition as `lib/isYellow.ts` (hue 38–70, saturation
≥ 0.35, value ≥ 0.35), because rule 8 has one answer and two implementations of it drift.
Fully transparent pixels are not counted: a keyed-out corner is not a colour.

    python3 scripts/life/index-sheets.py
"""

import json
import os
import sys

try:
    from PIL import Image
except ImportError:  # pragma: no cover - the script is a developer tool
    sys.exit('Pillow is required: pip install pillow')

ART = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'life', 'art')
ART = os.path.normpath(ART)


def is_yellow(r: int, g: int, b: int) -> bool:
    """The one definition, kept in step with `lib/isYellow.ts` by hand and by test."""
    high, low = max(r, g, b), min(r, g, b)
    delta = high - low
    if delta == 0:
        return False
    if delta / high < 0.35 or high / 255 < 0.35:
        return False
    if high == r:
        hue = 60 * (((g - b) / delta + 6) % 6)
    elif high == g:
        hue = 60 * ((b - r) / delta + 2)
    else:
        hue = 60 * ((r - g) / delta + 4)
    return 38 <= hue <= 70


def main() -> int:
    manifest_path = os.path.join(ART, 'manifest.json')
    manifest = json.load(open(manifest_path, encoding='utf8'))

    claimed = set()
    for group in ('backdrops', 'props', 'portraits', 'layers'):
        claimed |= set(manifest.get(group, {}))

    sheets = {}
    dirty = []
    for name in sorted(os.listdir(ART)):
        if not name.endswith('.webp'):
            continue
        key = name[:-5]
        if key in claimed:
            continue
        path = os.path.join(ART, name)
        image = Image.open(path).convert('RGBA')
        left = sum(
            1
            for r, g, b, a in image.getdata()
            if a > 8 and is_yellow(r, g, b)
        )
        if left:
            dirty.append(f'{key}: {left}')
        sheets[key] = {
            'w': image.width,
            'h': image.height,
            'bytes': os.path.getsize(path),
            'yellowLeft': left,
        }

    with open(os.path.join(ART, 'sheets.json'), 'w', encoding='utf8') as handle:
        json.dump(sheets, handle, ensure_ascii=False, indent=1)

    print(f'indexed {len(sheets)} sheets')
    if dirty:
        print('YELLOW LEFT IN:', ', '.join(dirty))
        return 1
    print('no yellow in any shipped sheet')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
