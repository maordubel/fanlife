"""Cut the owner's upgraded press-photo graphics (7.10.2026, "גרפיקות משופרות ומושדרגות") into
stickers for the magazine: the figure and its cream sticker outline, background gone.

The artwork is Maor's own (the same series as the shirt-swap poster). It keeps its sepia print, but
the warm cast is capped so no decoded pixel lands in the yellow band (lib/isYellow.ts: hue 38–70,
S ≥ 0.35) — a Hapoel page forbids yellow, and the same file serves every club.

Mask: rembg (isnet-general-use) gives the silhouette; light stripes on scarves and shirts come back
as holes, so the mask is closed and its holes filled (the sticker outline encloses the figure).
Usage: python3 scripts/brand/magazine-photos.py <uploads-dir>
"""
import io, sys, colorsys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
from rembg import remove, new_session

OUT = 'public/brand/magazine/photos'
JOBS = {  # name: upload file (chat upload ids)
    'shirt-swap': 'dd680f49-image.png', 'fan-fist': '12e76313-image.png', 'fans-group': 'd6b18815-image.png',
    'dribbler': 'fe9a8246-image.png', 'father-son': '454791fe-image.png', 'memorabilia': '5946821c-image.png',
    'friends-walk': 'b2e43360-image.png', 'striped-shirt': 'd5bfb419-image.png',
}
WIDTH = 1000

def yellow_count(rgba):
    a = np.asarray(rgba).astype(np.float32) / 255
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    d = mx - mn; s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    h = np.where(d == 0, 0, np.where(mx == r, (60 * ((g - b) / np.maximum(d, 1e-6))) % 360, np.where(mx == g, 60 * ((b - r) / np.maximum(d, 1e-6)) + 120, 60 * ((r - g) / np.maximum(d, 1e-6)) + 240)))
    return int(((h >= 38) & (h <= 70) & (s >= 0.35) & (mx >= 0.35) & (al > 0.03)).sum())

def cap_saturation(img, cap=0.16):
    arr = np.asarray(img).astype(np.float32) / 255
    rgb = arr[..., :3]; grey = rgb.mean(axis=2, keepdims=True)
    mx = rgb.max(axis=2, keepdims=True); mn = rgb.min(axis=2, keepdims=True)
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    k = np.where(s > cap, cap / np.maximum(s, 1e-6), 1.0)
    arr[..., :3] = grey + (rgb - grey) * k
    return Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8), 'RGBA')

session = new_session('isnet-general-use')
for name, file in JOBS.items():
    src = Image.open(f'{sys.argv[1]}/{file}').convert('RGBA')
    if src.getchannel('A').getextrema()[0] < 250:      # already cut (the shirt)
        mask = np.asarray(src.getchannel('A')) > 40
    else:
        mask = np.asarray(remove(src.convert('RGB'), session=session).getchannel('A')) > 60
        mask = ndimage.binary_fill_holes(ndimage.binary_closing(mask, iterations=6))
    lab, n = ndimage.label(mask)
    if n > 1:
        sizes = ndimage.sum(mask, lab, range(1, n + 1))
        mask = np.isin(lab, [i + 1 for i, v in enumerate(sizes) if v > 0.03 * sizes.max()])
    alpha = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    img = src.copy(); img.putalpha(alpha)
    img = img.crop(alpha.point(lambda v: 255 if v > 12 else 0).getbbox())
    if img.width > WIDTH: img = img.resize((WIDTH, round(img.height * WIDTH / img.width)), Image.LANCZOS)
    base = img
    for cap in (0.16, 0.12, 0.09):  # the lightest cap whose DECODED bytes are free of yellow
        img = cap_saturation(base, cap)
        buf = io.BytesIO(); img.save(buf, 'WEBP', quality=84, method=6); data = buf.getvalue()
        left = yellow_count(Image.open(io.BytesIO(data)).convert('RGBA'))
        if not left: break
    if left:  # still over: ship lossless, where decode is exact (rule 61)
        buf = io.BytesIO(); img.save(buf, 'WEBP', lossless=True, quality=100, method=6); data = buf.getvalue()
        left = yellow_count(Image.open(io.BytesIO(data)).convert('RGBA'))
    assert left == 0, f'{name}: {left} yellow pixels after decode'
    open(f'{OUT}/{name}.webp', 'wb').write(data)
    print(name, img.size, len(data), 'bytes, yellow 0')
