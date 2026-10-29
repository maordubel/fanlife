"""Sticker fills (art round 2, 29.10.2026): each sticker is black ink with a transparent inside. The kit prints a
sticker on a coloured burst, so it needs its own silhouette: everything the outside flood (from the border, through
transparent pixels) cannot reach. Writes assets/sticker-<name>-fill.png (grey+alpha). Run: python3 scripts/marketing/sticker-fills.py"""
import glob, os
from PIL import Image, ImageFilter, ImageChops
HERE = os.path.join(os.path.dirname(__file__), 'kit', 'assets')
for f in sorted(glob.glob(os.path.join(HERE, 'sticker-*.png'))):
    if f.endswith('-fill.png'): continue
    a = Image.open(f).convert('LA').getchannel('A')
    # close the outline's hairline gaps so the flood cannot leak inside
    wall = a.point(lambda v: 255 if v > 40 else 0).filter(ImageFilter.MaxFilter(7))
    w, h = wall.size
    flood = Image.new('L', (w + 2, h + 2), 0)
    flood.paste(wall, (1, 1))
    from PIL import ImageDraw
    ImageDraw.floodfill(flood, (0, 0), 128)
    outside = flood.crop((1, 1, w + 1, h + 1)).point(lambda v: 255 if v == 128 else 0)
    inside = ImageChops.invert(outside).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1))
    out = Image.merge('LA', (Image.new('L', (w, h), 128), inside))
    out.save(f[:-4] + '-fill.png', optimize=True)
    print(os.path.basename(f), round(sum(inside.getdata()) / 255 / (w * h), 2))
