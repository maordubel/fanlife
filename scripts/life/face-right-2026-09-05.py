#!/usr/bin/env python3
"""
כיוון אחד לכולם — the fifteen files that faced the wrong way, mirrored on disk.

    python3 scripts/life/face-right-2026-09-05.py [--check]

Every profile in `public/life/art` faces RIGHT and the runtime mirrors with
`setFlipX(facing < 0)` (`WorldScene.ART_FACES = 1`). Sixty of them did. Fifteen did not,
and nobody had opened them side by side: `pogi-side` faces right and `teen-side` faces
left, so the same person walked forwards at eight and backwards at fifteen. That is the
second half of what Maor saw, and the constant alone would not have fixed it.

They are overwritten in place, under the same name — his rule — so no build can pick the
old orientation up from a file left beside it. `kid-walk1…8` face left too and are NOT
mirrored: nothing references them (the illustrated child was replaced by the photographic
one in September) and mirroring dead art only makes the next audit longer.
"""
import os
import sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ART = os.path.join(ROOT, 'public/life/art')

# Measured on 5.9.2026 (skin centroid against head-silhouette centroid, top 14% of the
# figure) and then looked at, one by one, at 260 pixels a head.
WRONG = [
    # the player himself, at fifteen and in uniform — the worst of them, because these are
    # the poses the chapter after Beit She'an walks on
    'teen-side', 'teen-walk',
    'soldier-side', 'soldier-march',
    # the cast
    'barry96-side',
    'keren-side', 'keren90-side',
    'kobi90-side',
    'ofir90-side',
    'sinai-side',
    'tikva-side', 'tikva-away-side',
    'teacher-side',
    # close-ups: they never walk, but two profiles of two men should agree
    'faceElimelech-side', 'faceKeren90-side',
]


def main():
    check = '--check' in sys.argv
    for name in WRONG:
        path = os.path.join(ART, f'{name}.png')
        if not os.path.exists(path):
            print('  missing', name)
            continue
        if check:
            print('  would mirror', name)
            continue
        Image.open(path).transpose(Image.FLIP_LEFT_RIGHT).save(path, optimize=True)
        print(f'  {name:20s} mirrored  {os.path.getsize(path) / 1024:5.0f}KB')
    print(f'{len(WRONG)} files now face right, like the other sixty')


if __name__ == '__main__':
    main()
