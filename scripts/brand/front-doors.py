"""The front page's door pictures (owner pack, 22.11.2026).
Source: brand/source/front-doors-2026-11-22/*.webp (the owner's WebP masters; the 3 MB PNGs stay in his pack, not in git).
Out: public/brand/fanlife/doors/<key>-<width>.webp — two widths each, 3:2, nothing recoloured or cropped.
Run: python3 scripts/brand/front-doors.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'brand' / 'source' / 'front-doors-2026-11-22'
OUT = ROOT / 'public' / 'brand' / 'fanlife' / 'doors'
KEYS = ['cover', 'solo', 'friends', 'archive', 'kits', 'album', 'manager']
WIDTHS = [480, 960]

def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for key in KEYS:
        im = Image.open(SRC / f'{key}.webp').convert('RGB')
        for w in WIDTHS + ([1536] if key == 'cover' else []):
            h = round(im.height * w / im.width)
            im.resize((w, h), Image.LANCZOS).save(OUT / f'{key}-{w}.webp', 'WEBP', quality=80, method=6)
    print('doors:', sorted(p.name for p in OUT.glob('*.webp')))

if __name__ == '__main__':
    main()
