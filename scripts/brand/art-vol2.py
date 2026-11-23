"""The magazine's pictures and cut-outs (owner packs vol. 02 and vol. 03, 23.11.2026).
Source: brand/source/graphics-vol-02-2026-11-23/*.webp (scenes, 3:2; keeper is a cut-out) and
        brand/source/png-elements-vol-03-2026-11-23/*.webp (cut-outs with a clear background).
Out:    public/brand/fanlife/art/<name>-<width>.webp   scenes, nothing recoloured or cropped
        public/brand/fanlife/bits/<name>-<width>.webp  cut-outs, trimmed to their ink, alpha kept
Run: python3 scripts/brand/art-vol2.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SCENES = ROOT / 'brand' / 'source' / 'graphics-vol-02-2026-11-23'
BITS = ROOT / 'brand' / 'source' / 'png-elements-vol-03-2026-11-23'
ART = ROOT / 'public' / 'brand' / 'fanlife' / 'art'
CUT = ROOT / 'public' / 'brand' / 'fanlife' / 'bits'

def trimmed(im: Image.Image) -> Image.Image:
    im = im.convert('RGBA')
    box = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    return im.crop(box) if box else im

def main() -> None:
    ART.mkdir(parents=True, exist_ok=True); CUT.mkdir(parents=True, exist_ok=True)
    for src in sorted(SCENES.glob('*.webp')):
        im = Image.open(src)
        if im.mode == 'RGBA':
            cut = trimmed(im)
            for w in (240, 480):
                r = cut.resize((w, round(cut.height * w / cut.width)), Image.LANCZOS)
                r.save(CUT / f'{src.stem}-{w}.webp', 'WEBP', quality=82, method=6)
            continue
        im = im.convert('RGB')
        # matchday is the welcome's picture: 640 for a phone, 1280 (lighter) for a desktop
        for w in (480, 960) + ((640, 1280, 1536) if src.stem == 'matchday' else ()):
            im.resize((w, round(im.height * w / im.width)), Image.LANCZOS).save(ART / f'{src.stem}-{w}.webp', 'WEBP', quality=(78 if w <= 480 else 62 if w == 1280 else 70), method=6)
    for src in sorted(BITS.glob('*.webp')):
        cut = trimmed(Image.open(src))
        for w in (160, 320):
            r = cut.resize((w, round(cut.height * w / cut.width)), Image.LANCZOS)
            r.save(CUT / f'{src.stem}-{w}.webp', 'WEBP', quality=82, method=6)
    print('art:', len(list(ART.glob('*.webp'))), 'bits:', len(list(CUT.glob('*.webp'))))

if __name__ == '__main__':
    main()
