"""LEGENDS MANAGER logo (Maor's artwork, 13.10.2026) → transparent sizes for the site (rule 122).

The artwork arrives on a cream paper ground. The ground is removed by a flood from the border: a pixel joins the
background when it is paper-coloured (close to the sampled cream, low saturation) and touches the outside. Cream INSIDE
the badge (the ribbons, the lettering) is never reached, because the badge's gold/navy outline walls it in.
The edge is soft (alpha from the colour distance over a 2px band) and de-fringed: an edge pixel keeps the colour of
its opaque neighbours, so the badge never wears a pale outline on a dark page.

Outputs (public/legends/brand/):
- logo-<n>.webp      full colour (hub pages, ALL FOOTBALL, Legends front door, the reveal)
- logo-mono-<n>.webp greyscale for club pages, where the badge's red/green/navy/gold may be a rival's colour (rule 95)
- og.png             1200×630 share card on the Legends night
Usage: python3 scripts/brand/legends-logo.py brand/source/legends-manager-logo-original.png
"""
import sys, os
import numpy as np
from PIL import Image, ImageOps, ImageFilter
from scipy import ndimage

OUT = 'public/legends/brand'
os.makedirs(OUT, exist_ok=True)
rgb = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(np.float32)
H, W, _ = rgb.shape
# the paper: a median of the outer frame
frame = np.concatenate([rgb[:12].reshape(-1, 3), rgb[-12:].reshape(-1, 3), rgb[:, :12].reshape(-1, 3), rgb[:, -12:].reshape(-1, 3)])
paper = np.median(frame, axis=0)
dist = np.sqrt(((rgb - paper) ** 2).sum(-1))
mx, mn = rgb.max(-1), rgb.min(-1)
sat = (mx - mn) / np.maximum(mx, 1)
light = rgb.mean(-1)
paperlike = (dist < 34) & (sat < 0.16) & (light > 190)
# flood from the border through paper-like pixels only
lab, _ = ndimage.label(paperlike)
edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
bg = np.isin(lab, edge[edge > 0])
# close tiny holes in the background (paper grain), never into the badge
bg = ndimage.binary_opening(bg, iterations=1)
fg = ~bg
fg = ndimage.binary_fill_holes(fg)  # anything walled in belongs to the badge
# soft edge: inside a 2px band around the cut, alpha follows how far the pixel is from paper
d_in = ndimage.distance_transform_edt(fg)
band = (d_in > 0) & (d_in <= 2.5)
alpha = np.where(fg, 255.0, 0.0)
soft = np.clip((dist - 10) / 40, 0, 1) * 255
alpha[band] = np.minimum(alpha[band], np.maximum(soft[band], (d_in[band] / 2.5) * 255))
alpha = ndimage.gaussian_filter(alpha, 0.6)
alpha[~fg & (ndimage.distance_transform_edt(~fg) > 2)] = 0
# de-fringe: semi-transparent pixels take the colour of the nearest solid pixel
solid = alpha > 245
idx = ndimage.distance_transform_edt(~solid, return_distances=False, return_indices=True)
fixed = rgb[idx[0], idx[1]]
out = np.where((alpha < 245)[..., None], fixed, rgb)
img = Image.fromarray(np.dstack([out, alpha]).clip(0, 255).astype(np.uint8), 'RGBA')
img = img.crop(img.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())
# square canvas so every size keeps the proportions
S = max(img.size); sq = Image.new('RGBA', (S, S), (0, 0, 0, 0)); sq.alpha_composite(img, ((S - img.width) // 2, (S - img.height) // 2))
for n in (1024, 512, 256, 128):
    sq.resize((n, n), Image.LANCZOS).save(f'{OUT}/logo-{n}.webp', quality=92, method=6)
g = ImageOps.autocontrast(sq.convert('L'), cutoff=1)
mono = Image.merge('LA', (g, sq.getchannel('A'))).convert('RGBA')
for n in (512, 256):
    mono.resize((n, n), Image.LANCZOS).save(f'{OUT}/logo-mono-{n}.webp', quality=90, method=6)
og = Image.new('RGBA', (1200, 630), (16, 26, 58, 255))
og.alpha_composite(sq.resize((560, 560), Image.LANCZOS), (320, 35))
og.convert('RGB').save(f'{OUT}/og.png', optimize=True)
print('ok', sq.size, 'paper', paper.round(), 'bg share', round(float(bg.mean()), 3))
