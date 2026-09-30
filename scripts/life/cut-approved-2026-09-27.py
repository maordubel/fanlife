"""
Three pieces from the approved folder ("גרפיקה מאושרת", 27.9.2026), each placed where Maor said:

    python3 scripts/life/cut-approved-2026-09-27.py "<folder>"

· kobi90-chair       — kobi-chair.png: Kobi in the nineties tracksuit, in his armchair, reading
                       הפועל. Keyed off the green, de-spilled, graded into the room. "להשתמש
                       בשתיהם בחוכמה. שיהיה לו כמה לוקים." — the denim `kobi-chair` stays for
                       the eighties; this is one of the nineties looks.
· plate-2002-nicosia — "גרפיקה למגרש למשחק חוץ באירופה": the card for E04 (Nicosia, 2002).
· docPosterCup       — "פוסטר לתלייה בחדר של פוגי בשנות 80 90": the second poster on his wall.

Every file goes through the same rule-8 pass (paint band wider than the scanner's, rule 44)
and is saved as WebP chosen by counting yellow on the DECODE (rule 61).
"""
import io
import json
import os
import sys

import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ART = os.path.join(ROOT, 'public/life/art')
SRC = sys.argv[1] if len(sys.argv) > 1 else '/mnt/user-data/uploads/גרפיקה מאושרת'


def hsv(rgb):
    mx = rgb.max(2); mn = rgb.min(2); d = mx - mn
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.zeros_like(mx); m = d > 0; dd = np.where(d > 0, d, 1)
    i = m & (mx == r); h[i] = (60 * (((g - b) / dd) % 6))[i]
    i = m & (mx == g) & ~(mx == r); h[i] = (60 * ((b - r) / dd + 2))[i]
    i = m & (mx == b) & ~(mx == r) & ~(mx == g); h[i] = (60 * ((r - g) / dd + 4))[i]
    return h, s, mx


def hsv2rgb(h, s, v):
    h = (h / 60) % 6; c = v * s; x = c * (1 - np.abs(h % 2 - 1)); z = np.zeros_like(h)
    k = np.floor(h).astype(int)
    rr = np.choose(k, [c, x, z, z, x, c]); gg = np.choose(k, [x, c, c, x, z, z]); bb = np.choose(k, [z, z, x, c, c, x])
    return np.stack([rr + v - c, gg + v - c, bb + v - c], -1)


def deyellow(rgba):
    """rule 44: true yellow (38–70, S≥.55) rotates to 26°; the rest of the band is desaturated"""
    a = rgba.astype(float)
    rgb = a[..., :3] / 255
    h, s, v = hsv(rgb)
    band = (h >= 30) & (h <= 80) & (s >= 0.18)
    true = band & (h >= 36) & (h <= 72) & (s >= 0.5)
    # the rest of the band keeps its value but leaves the hue range too: chroma subsampling
    # lifts a desaturated olive back over S .35 at decode (measured on the poster)
    H = np.where(true, 24.0, np.where(band & (h >= 34) & (h <= 74), 28.0, h))
    S = np.where(true, np.minimum(s, 0.62), np.where(band, np.minimum(s, 0.26), s))
    V = np.where(true, v * 0.8, v)
    new = hsv2rgb(H, S, V)
    rgb[band] = new[band]
    a[..., :3] = rgb * 255
    return a.round().clip(0, 255).astype(np.uint8)


def yellow(arr):
    f = arr[..., :3].astype(float) / 255
    alpha = arr[..., 3] if arr.shape[2] == 4 else np.full(arr.shape[:2], 255)
    h, s, v = hsv(f)
    return int(((s >= 0.35) & (v >= 0.35) & (h >= 38) & (h <= 70) & (alpha > 0)).sum())


def wide(arr):
    """the re-treat band (cut-cards.py WIDE_HUE): hue 29–84 at S≥.12 leaves to 26°, same S and V,
    so what the encoder rings around it lands outside 38–70"""
    a = arr.astype(float); rgb = a[..., :3] / 255
    h, s, v = hsv(rgb)
    band = (h >= 29) & (h <= 76) & (s >= 0.12) & (v >= 0.16)
    rgb[band] = hsv2rgb(np.full_like(h, 26.0), np.minimum(s, 0.5), v)[band]
    a[..., :3] = rgb * 255
    return a.round().clip(0, 255).astype(np.uint8)


def save(arr, key):
    out = os.path.join(ART, f'{key}.webp')
    arr = wide(arr)
    # rule 61: where the encoder puts yellow back, clean that neighbourhood in the source and
    # encode again — lossless only when no lossy pass reaches zero
    for _ in range(6):
        buf = io.BytesIO(); Image.fromarray(arr).save(buf, 'WEBP', quality=88, method=6)
        dec = np.array(Image.open(io.BytesIO(buf.getvalue())).convert('RGBA'))
        if yellow(dec) == 0:
            break
        f = dec[..., :3].astype(float) / 255
        h, s, v = hsv(f)
        hit = (s >= 0.3) & (v >= 0.3) & (h >= 34) & (h <= 74)
        hit = cv2.dilate(hit.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
        a = arr.astype(float); rgb = a[..., :3] / 255
        H0, S0, V0 = hsv(rgb)
        rgb[hit] = hsv2rgb(np.where(hit, np.where((H0 > 20) & (H0 < 90), 24.0, H0), H0), np.minimum(S0, 0.3), V0)[hit]
        a[..., :3] = rgb * 255
        arr = a.round().clip(0, 255).astype(np.uint8)
    for q in (92, 88, 84):
        buf = io.BytesIO(); Image.fromarray(arr).save(buf, 'WEBP', quality=q, method=6)
        dec = np.array(Image.open(io.BytesIO(buf.getvalue())).convert('RGBA'))
        if yellow(dec) == 0:
            open(out, 'wb').write(buf.getvalue())
            print(f'{key}: q{q} {len(buf.getvalue())} bytes, yellow on decode 0')
            return len(buf.getvalue()), arr.shape[1], arr.shape[0]
    buf = io.BytesIO(); Image.fromarray(arr).save(buf, 'WEBP', lossless=True)
    dec = np.array(Image.open(io.BytesIO(buf.getvalue())).convert('RGBA'))
    left = yellow(dec)
    if left:
        raise SystemExit(f'{key}: {left} yellow px survive lossless')
    open(out, 'wb').write(buf.getvalue())
    print(f'{key}: lossless {len(buf.getvalue())} bytes, yellow on decode 0')
    return len(buf.getvalue()), arr.shape[1], arr.shape[0]


def clean_until_zero(arr):
    for _ in range(4):
        if yellow(arr) == 0:
            return arr
        arr = deyellow(arr)
    return arr


def kobi_chair():
    im = np.array(Image.open(os.path.join(SRC, 'kobi-chair.png')).convert('RGB')).astype(float)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    greenness = g - np.maximum(r, b)
    alpha = np.clip((70 - greenness) / 40.0, 0, 1)  # soft shoulder, not a threshold
    fg = (alpha > 0.5).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(fg)
    k = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])
    keep = cv2.dilate((lab == k).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    alpha = alpha * keep
    # de-spill: green may not exceed the larger of red and blue
    lim = np.maximum(r, b)
    g2 = np.where(g > lim, lim, g)
    im = np.dstack([r, g2, b])
    # grade into the room: ~6% exposure down, 10% of saturation toward luminance
    lum = (im * [0.299, 0.587, 0.114]).sum(2, keepdims=True)
    im = (im * 0.9 + lum * 0.1) * 0.94
    out = np.dstack([im, alpha * 255]).round().clip(0, 255).astype(np.uint8)
    out[out[..., 3] < 10] = 0
    pil = Image.fromarray(out)
    pil = pil.crop(pil.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())
    H = 640; W = round(pil.width * H / pil.height)
    pil = pil.resize((W, H), Image.LANCZOS)
    arr = clean_until_zero(np.array(pil))
    return save(arr, 'kobi90-chair')


def plate_nicosia():
    im = Image.open(os.path.join(SRC, 'גרפיקה למגרש למשחק חוץ באירופה.png')).convert('RGB')
    w, h = im.size
    cw = round(h * 16 / 9)
    im = im.crop(((w - cw) // 2, 0, (w - cw) // 2 + cw, h)).resize((1280, 720), Image.LANCZOS)
    # a plate is a memory: a little desaturation and a vignette, like make-plates.py
    im = ImageEnhance.Color(im).enhance(0.82)
    vig = Image.new('L', im.size, 0)
    yy, xx = np.mgrid[0:720, 0:1280]
    d = np.sqrt(((xx - 640) / 640) ** 2 + ((yy - 360) / 360) ** 2)
    vig = Image.fromarray((np.clip(1 - (d - 0.55) * 0.55, 0.6, 1) * 255).astype(np.uint8))
    arr = np.array(im).astype(float) * (np.array(vig)[..., None] / 255)
    arr = np.dstack([arr, np.full((720, 1280), 255)]).round().clip(0, 255).astype(np.uint8)
    arr = clean_until_zero(arr)
    return save(arr, 'plate-2002-nicosia')


def poster():
    im = Image.open(os.path.join(SRC, 'סופרגול כללי', 'פוסטר לתלייה בחדר של פוגי בשנות 80 90.jpg')).convert('RGB')
    im.thumbnail((1000, 1000), Image.LANCZOS)
    arr = np.dstack([np.array(im), np.full(im.size[::-1], 255)]).astype(np.uint8)
    before = yellow(arr)
    arr = clean_until_zero(arr)
    print(f'docPosterCup: yellow {before} -> {yellow(arr)} px')
    # a photographed poster is noise on every scale: 4:2:0 at ANY quality averages an
    # orange pixel with a green one into yellow. So it is a palette, losslessly (rule 27) —
    # a finite colour table with no yellow entry is a proof, not a sample.
    pal = Image.fromarray(wide(arr)[..., :3]).quantize(224, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG).convert('RGB')
    arr = np.dstack([np.array(pal), np.full(pal.size[::-1], 255)]).astype(np.uint8)
    assert yellow(arr) == 0
    out = os.path.join(ART, 'docPosterCup.webp')
    buf = io.BytesIO(); Image.fromarray(arr[..., :3]).save(buf, 'WEBP', lossless=True, method=6)
    assert yellow(np.array(Image.open(io.BytesIO(buf.getvalue())).convert('RGBA'))) == 0
    open(out, 'wb').write(buf.getvalue())
    print(f'docPosterCup: palette lossless {len(buf.getvalue())} bytes, yellow on decode 0')
    return len(buf.getvalue()), arr.shape[1], arr.shape[0]


if __name__ == '__main__':
    man_path = os.path.join(ART, 'manifest.json')
    man = json.load(open(man_path))
    src = 'maor-approved-2026-09-27'
    b, w, h = kobi_chair()
    man['figures']['kobi90-chair'] = {'w': w, 'h': h, 'bytes': b, 'yellowLeft': 0, 'source': src, 'whatHe': 'קובי בכורסה, טרנינג שנות ה-90, קורא הפועל'}
    b, w, h = plate_nicosia()
    man['plates']['plate-2002-nicosia'] = {'w': w, 'h': h, 'bytes': b, 'yellowLeft': 0, 'source': src, 'whatHe': 'אצטדיון חוץ באירופה — כרטיס ניקוסיה 2002'}
    b, w, h = poster()
    man['docs']['docPosterCup'] = {'w': w, 'h': h, 'bytes': b, 'yellowLeft': 0, 'source': src, 'whatHe': 'פוסטר הקבוצה מחזיקת הגביע, לקיר בחדר של פוגי'}
    json.dump(man, open(man_path, 'w'), ensure_ascii=False, indent=1)
    open(man_path, 'a').write('\n')
