"""LIFE wordmark: cut the white page away from the source, keep the letters' own white fill.
   python3 scripts/brand/cut-life-logo.py   (source: brand/source/life/life-logo-source.png)
Writes public/brand/life/: life-logo (ink outline, white fill), life-logo-light (cream outline, clear fill, for dark
screens), life-logo-solid (cream silhouette) as webp at 1200/600/300 wide, plus one PNG of each at 1200."""
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import numpy as np
SRC, OUT = 'brand/source/life/life-logo-source.png', 'public/brand/life/'
CREAM = (255, 244, 226)
src = Image.open(SRC).convert('RGBA'); im = Image.new('RGB', src.size, (255, 255, 255)); im.paste(src, mask=src.split()[3]); w, h = im.size
g = np.asarray(im.convert('L')).astype(np.float32)
# outside = white page reachable from the border (flood on a thresholded copy)
bw = Image.fromarray(((g > 200) * 255).astype(np.uint8)); pad = Image.new('L', (w + 2, h + 2), 255); pad.paste(bw, (1, 1))
ImageDraw.floodfill(pad, (0, 0), 128, thresh=0)
outside = np.asarray(pad.crop((1, 1, w + 1, h + 1))) == 128
ink = np.clip((255 - g) / 255, 0, 1)                      # anti-aliased ink coverage
inside = ~outside
# alpha: everything inside the outer outline is opaque; the outer edge keeps the ink's own soft edge
edge = np.asarray(Image.fromarray((inside * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 0
alpha = np.where(inside, 1.0, np.where(edge, ink, 0.0))
def save(name, rgb, a):
    rgba = np.dstack([rgb, (np.clip(a, 0, 1) * 255)]).astype(np.uint8); out = Image.fromarray(rgba, 'RGBA')
    box = out.getbbox(); out = out.crop(box)
    for width in (1200, 600, 300):
        r = out.resize((width, round(out.height * width / out.width)), Image.LANCZOS); r.save(f'{OUT}{name}-{width}.webp', quality=92, method=6)
        if width == 1200: r.save(f'{OUT}{name}.png', optimize=True)
ones = np.ones((h, w, 3), np.float32)
ink3 = ink[..., None]
save('life-logo', (1 - ink3) * 255 * ones + ink3 * np.array([10, 10, 10]), alpha)            # ink outline, white fill
save('life-logo-light', ones * np.array(CREAM), np.where(inside | edge, ink, 0.0))            # cream outline only
save('life-logo-solid', ones * np.array(CREAM), alpha)                                        # cream silhouette
print('ok', w, h)
