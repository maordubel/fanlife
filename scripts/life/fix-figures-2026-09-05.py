#!/usr/bin/env python3
"""
שתי טעויות שנראות כמו טעות אחת: הגודל, ושלוש אמהות.

    python3 scripts/life/fix-figures-2026-09-05.py

**The size.** Every figure this game has ever drawn fills its own PNG — `pogi` is 153×430
of boy, `kobi` is 117×523 of father — because the engine scales a figure by the height of
its FILE. The Production Clean pack ships on a fixed 512×1024 canvas with the person
inside it, filling between 49% and 61% of the height, so Rachel, Barry, Efi and Michel
were rendering at roughly half the height they were placed at, beside people drawn to the
old rule. That is the "characters out of proportion with each other" Maor photographed.
Trimming each of them to its own alpha box puts them back on the same rule as everybody
else, and takes the padding out of the download while it is there.

**Three mothers.** `rachel-tray` and `rachel-smoke` are one woman, `rachel90-*` are a
second, and the approved pack's Rachel is a third — so the player met a different mother
in almost every scene. The pack is the authority ("no two visual languages for the same
character"), so every legacy Rachel filename is overwritten by the nearest approved pose,
under its own name, per the standing rule that an approved file replaces the key it
replaces rather than sitting beside it.
"""
import json
import os

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ART = os.path.join(ROOT, 'public/life/art')

PACK_PREFIXES = ('rachel-', 'rachel.', 'barry96', 'efi96', 'michel96')

# every Rachel the game still names → the approved pose that is now that file
RACHEL = {
    'rachel-tray': 'rachel',
    'rachel-smoke': 'rachel-side',
    'rachel90': 'rachel',
    'rachel90-3q': 'rachel-3q',
    'rachel90-side': 'rachel-side',
    'rachel90-back': 'rachel-back',
    'rachel90-arms': 'rachel-concern',
    'rachel90-apron': 'rachel',
    'rachel90-door': 'rachel-speak',
    'rachel90-hug': 'rachel-laugh',
    'rachel90-call': 'rachel-concern',
    'rachel90-note': 'rachel-listen',
    'rachel90-point': 'rachel-speak',
    'rachel90-hips': 'rachel-concern',
}


def trim(path):
    im = Image.open(path).convert('RGBA')
    box = im.getbbox()
    if not box:
        return None
    if box == (0, 0, *im.size):
        return im.size
    im.crop(box).save(path, optimize=True)
    return Image.open(path).size


def main():
    manifest_path = os.path.join(ART, 'manifest.json')
    manifest = json.load(open(manifest_path, encoding='utf8'))
    figures = manifest.setdefault('figures', {})

    trimmed = 0
    for name in sorted(os.listdir(ART)):
        if not name.endswith('.png'):
            continue
        key = name[:-4]
        if not key.startswith(PACK_PREFIXES) and key != 'rachel':
            continue
        size = trim(os.path.join(ART, name))
        if not size:
            continue
        row = figures.get(key)
        if row:
            row['w'], row['h'] = size
            row['bytes'] = os.path.getsize(os.path.join(ART, name))
        trimmed += 1
    print(f'{trimmed} approved figures trimmed to their own edges')

    for legacy, approved in RACHEL.items():
        src = os.path.join(ART, f'{approved}.png')
        dst = os.path.join(ART, f'{legacy}.png')
        if not os.path.exists(src) or not os.path.exists(dst):
            print('  skip', legacy)
            continue
        Image.open(src).convert('RGBA').save(dst, optimize=True)
        size = Image.open(dst).size
        row = figures.setdefault(legacy, {})
        row.update({'w': size[0], 'h': size[1], 'bytes': os.path.getsize(dst),
                    'yellowLeft': 0, 'source': 'production-clean-2026-09-05'})
        print(f'  {legacy:16s} ← {approved}')
    json.dump(manifest, open(manifest_path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
