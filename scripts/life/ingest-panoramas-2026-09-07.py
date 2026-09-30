"""
הפנורמות של הטיילת ואלנבי — four wide backdrops Maor sent on 7.9.2026.

  python3 scripts/life/ingest-panoramas-2026-09-07.py

They arrive at 2033×773 (2.63:1), which is a wide BACKDROP rather than a 360° panorama:
too wide for a room, exactly right for a street you walk along. So each one is centre-cut
to the project's backdrop shape (16:9, 1600×900) and written under its own key, and the
uncut original is kept beside it at `-wide` for the promenade journey, where the extra
width is the whole point.

חוק הצהוב applies as it does to every other painting, and it turned out to cost nothing:
the sunset measures 0.71% inside the band (its orange is below hue 38 and is left alone),
Allenby 1.62%. The treatment is the same rotation `cut-cards.py` uses.
"""
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from importlib.machinery import SourceFileLoader  # noqa: E402

cards = SourceFileLoader('cards', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cut-cards.py')).load_module()

HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(HERE, '..', '..', 'public', 'life', 'art')
SRC = os.environ.get('PANO_SRC', '/tmp/pano')

# file → (key, what it is, where the 16:9 window sits horizontally 0..1)
JOBS = [
    ('promenade-day.png', 'promenade', 'הטיילת, אחר הצהריים', 0.5),
    ('promenade-sunset.png', 'promenadeDusk', 'הטיילת, שקיעה', 0.5),
    ('allenby-day.png', 'allenbyShops', 'אלנבי, חנות התקליטים', 0.5),
    ('allenby-late.png', 'allenbyShopsLate', 'אלנבי, אחרי הצהריים', 0.5),
]

W, H = 1600, 900


def quantise(im: Image.Image) -> Image.Image:
    """Match the rest of the archive: every backdrop in `public/life/art` is a 256-colour
    palette PNG at a few hundred kilobytes. A photographic 24-bit page would be four times
    the weight of every room around it, for a picture the camera shows at a third of its
    resolution. The palette is built from the TREATED image, so quantisation cannot invent
    a hue the yellow rule has already removed."""
    return im.convert('P', palette=Image.ADAPTIVE, colors=256, dither=Image.FLOYDSTEINBERG)


def treat(im: Image.Image) -> tuple[Image.Image, float, float]:
    a = np.asarray(im.convert('RGB'))
    before = cards.fraction_yellow(a)
    clean = cards.deyellow(a)
    out = Image.fromarray(clean)
    return out, before, cards.fraction_yellow(np.asarray(out))


def main() -> None:
    manifest_path = os.path.join(ART, 'manifest.json')
    manifest = json.load(open(manifest_path, encoding='utf-8'))
    manifest.setdefault('backdrops', {})
    for filename, key, what, centre in JOBS:
        path = os.path.join(SRC, filename)
        if not os.path.exists(path):
            print(f'{key}: source missing ({path})')
            continue
        im = Image.open(path).convert('RGB')
        # Treat AFTER every resample, never before: LANCZOS invents in-between colours, and
        # a pixel interpolated between a treated brown and its neighbour can land back
        # inside the band. Measured on the bytes that ship, which is the only measurement
        # that means anything (the same lesson as `cut-cards.py`).
        wide, before, _ = treat(im)
        wide_path = os.path.join(ART, f'{key}-wide.png')
        quantise(wide).save(wide_path, 'PNG', optimize=True)
        need = int(wide.size[1] * W / H)
        left = max(0, min(wide.size[0] - need, int(wide.size[0] * centre - need / 2)))
        cut = wide.crop((left, 0, left + need, wide.size[1])).resize((W, H), Image.LANCZOS)
        cut, _, _ = treat(cut)
        cut_path = os.path.join(ART, f'{key}.png')
        quantise(cut).save(cut_path, 'PNG', optimize=True)
        again = cards.fraction_yellow(np.asarray(Image.open(cut_path).convert('RGB')))
        manifest['backdrops'][key] = {
            'w': W, 'h': H, 'bytes': os.path.getsize(cut_path),
            'yellowLeft': round(again, 6), 'source': 'maor-2026-09-07-panoramas',
            'whatHe': what, 'wide': f'{key}-wide.png',
        }
        print(f'{key}: {what} — yellow {before * 100:.2f}% → {again * 100:.2f}% '
              f'({os.path.getsize(cut_path) // 1024} KB + wide {os.path.getsize(wide_path) // 1024} KB)')
        if again > 0:
            raise SystemExit(f'STILL YELLOW: {key}')
    json.dump(manifest, open(manifest_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('manifest updated')


if __name__ == '__main__':
    main()
