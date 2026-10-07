"""Cut the owner's magazine element sheet (7.10.2026) into single press-photo elements.

Every element ships as GREYSCALE WebP with alpha: the page dyes it in the club's own colour
(CSS mask + multiply, `.mag-dye` in app/magazine.css), so one photograph serves every club and no
file can carry yellow (rule 8 — a grey pixel has no hue; checked on the decoded bytes below).
Sources: the two uploads Maor sent in chat; boxes are pixel boxes on the 1536×1024 sheet.
Usage: python3 scripts/brand/magazine-elements.py <sheet.png> <kicker.png>
"""
import sys, io
import numpy as np
from PIL import Image, ImageOps, ImageFilter

OUT = 'public/brand/magazine/elements'
BOXES = {  # name: (x0, y0, x1, y1) on the sheet
    'shirts': (500, 60, 1028, 486),
    'terrace-scarf': (1020, 138, 1532, 521),
    'boot-ball-ticket': (22, 560, 530, 992),
    'face': (566, 520, 1030, 1012),
    'net-keeper': (1020, 521, 1532, 1012),
}

def grey(rgba, gamma=1.0, lift=0):
    a = rgba.getchannel('A')
    g = ImageOps.autocontrast(rgba.convert('L'), cutoff=1)
    if gamma != 1.0 or lift:
        arr = np.asarray(g, dtype=np.float32) / 255
        arr = np.clip(lift + (1 - lift) * arr ** gamma, 0, 1)
        g = Image.fromarray((arr * 255).astype(np.uint8))
    out = Image.merge('LA', (g, a)).convert('RGBA')
    return out

def trim_edges(img, px=4):
    # the sheet's panels end in hard straight edges; their outermost columns carry a stray alpha line
    a = np.asarray(img.getchannel('A')).copy(); a[:, :px] = 0; a[:, -px:] = 0; a[:px, :] = 0; a[-px:, :] = 0
    img.putalpha(Image.fromarray(a)); return img.crop(img.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox())

def save(img, name, width):
    img = trim_edges(img)
    if img.width > width:
        img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    buf = io.BytesIO(); img.save(buf, 'WEBP', quality=86, method=6); data = buf.getvalue()
    back = np.asarray(Image.open(io.BytesIO(data)).convert('RGBA')).astype(int)
    r, g, b, a = back[..., 0], back[..., 1], back[..., 2], back[..., 3]
    chroma = (np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b))[a > 8]
    assert chroma.max() <= 6, f'{name}: decoded pixel carries colour ({chroma.max()})'
    open(f'{OUT}/{name}.webp', 'wb').write(data)
    print(name, img.size, len(data), 'bytes, max chroma', int(chroma.max()))

sheet = Image.open(sys.argv[1]).convert('RGBA')
for name, box in BOXES.items():
    crop = sheet.crop(box)
    bbox = crop.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox()
    crop = crop.crop(bbox)
    if name == 'shirts':
        # one shirt, the right (red) one: dyed per club, it hangs alone or twice (home + away)
        w = crop.width; crop = crop.crop((w // 2 + 4, 0, w, crop.height)); crop = crop.crop(crop.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox())
        # a light shirt so the dye shows: lift the body, keep folds and collar
        save(grey(crop, gamma=0.75, lift=0.08), 'shirt', 520)
    else:
        save(grey(crop), name, 900)
kicker = Image.open(sys.argv[2]).convert('RGBA')
kicker = kicker.crop(kicker.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox())
save(grey(kicker), 'kicker', 1000)

# 7.10.2026 — the shirt swap: two figures from Maor's own poster artwork ("זה פוסטר אישי שלי … גרפיקה
# שאני הכנתי. אלו לא שחקנים אמיתיים"). Cut with rembg (isnet) on the 1080×1920 poster, crop
# (40, 900, 1080, 1920); saved as pair.png and passed as argv[3]. Coloured paper the matting kept
# (the red block under the right figure) is dropped by saturation before going grey.
if len(sys.argv) > 3:
    pair = Image.open(sys.argv[3]).convert('RGBA')
    arr = np.asarray(pair).astype(np.float32)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    painted = ((r - np.maximum(g, b)) > 55) | ((g - np.maximum(r, b)) > 40) | ((b - r) > 40)  # the poster's colour blocks, not ink
    alpha = arr[..., 3].copy(); alpha[painted] = 0
    alpha[alpha < 40] = 0
    from scipy import ndimage
    lab, n = ndimage.label(alpha > 0)
    if n > 1:  # keep the figures; drop specks (dashed pitch lines the matting kept)
        sizes = ndimage.sum(np.ones_like(alpha), lab, range(1, n + 1))
        keep = np.isin(lab, [i + 1 for i, v in enumerate(sizes) if v > 0.02 * sizes.max()])
        alpha[~keep] = 0
    pair.putalpha(Image.fromarray(alpha.astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3)))
    pair = pair.crop(pair.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox())
    pair = pair.crop((0, 0, pair.width, round(pair.height * 0.9)))  # the matting's smear under the right figure
    a2 = np.asarray(pair.getchannel('A')).copy(); a2[a2 < 160] = 0; pair.putalpha(Image.fromarray(a2))
    save(grey(pair), 'shirt-swap', 900)
