"""Football Fairy Tales — the cuts between shots (owner, 11.11.2026: "no camera shake; mix in some VOX and HyperFrames
transitions so it is more interesting").

Each transition takes the outgoing frame `a`, the incoming frame `b` and the progress `p` (0..1) and returns one frame.
The page turn stays the series' signature, at the chapter breaks; between them the board borrows from VOX (a paper card
that slides onto the table and is pushed into, a torn sheet) and from the HyperFrames catalogue (iris, zoom-through, a
warm light-leak dissolve). Nothing here moves by chance: every curve is eased and the same on every render.
"""
from __future__ import annotations

import math

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from studio.fairytales import papertheatre as pt

W, H = pt.W, pt.H

# how long each cut takes (s), and the sound under it (public/life/sfx or the media-use kit), at what level
DURATION = {'page': 0.6, 'slide': 0.95, 'iris': 0.8, 'zoom': 0.7, 'torn': 0.85, 'dissolve': 0.9, 'fade': 0.9}


def _out_back(x: float, s: float = 1.2) -> float:
    x = min(max(x, 0.0), 1.0) - 1
    return 1 + (s + 1) * x ** 3 + s * x ** 2


def _ease_io(x: float) -> float:
    x = min(max(x, 0.0), 1.0)
    return 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2


def _scaled(img: Image.Image, s: float) -> Image.Image:
    """`img` scaled about its centre and cropped back to W×H."""
    if abs(s - 1) < 1e-4:
        return img
    cw, ch = W / s, H / s
    x0, y0 = (W - cw) / 2, (H - ch) / 2
    return img.transform((W, H), Image.EXTENT, (x0, y0, x0 + cw, y0 + ch), Image.BICUBIC)


def fade(a: Image.Image | None, b: Image.Image, p: float) -> Image.Image:
    k = _ease_io(p)
    return Image.fromarray((np.asarray(b, dtype=np.float32) * k).astype(np.uint8))


def page(a: Image.Image, b: Image.Image, p: float) -> Image.Image:
    return pt.page_turn(a, b, p)


def dissolve(a: Image.Image, b: Image.Image, p: float) -> Image.Image:
    """A soft cross-dissolve with a warm light leak swelling through the middle (HyperFrames' light-leak cut)."""
    k = _ease_io(p)
    mix = Image.blend(a, b, k)
    glow = math.sin(math.pi * p) ** 2
    if glow < 0.02:
        return mix
    yy, xx = np.mgrid[0:H:4, 0:W:4].astype(np.float32)
    cx = W * (0.15 + 0.7 * p)
    leak = np.exp(-(((xx - cx) / (W * .38)) ** 2 + ((yy - H * .3) / (H * .7)) ** 2))
    leak = Image.fromarray((leak * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR)
    warm = np.array([255, 196, 140], dtype=np.float32)
    arr = np.asarray(mix, dtype=np.float32)
    add = np.asarray(leak, dtype=np.float32)[..., None] / 255 * glow * 0.55
    return Image.fromarray(np.clip(arr + (warm - arr) * add, 0, 255).astype(np.uint8))


def zoom(a: Image.Image, b: Image.Image, p: float) -> Image.Image:
    """Zoom-through: the old picture rushes past the lens while the new one settles from a little way back."""
    k = _ease_io(p)
    out = _scaled(a, 1 + 0.45 * k)
    if k > 0.05:
        out = out.filter(ImageFilter.GaussianBlur(6 * k))
    inn = _scaled(b, 1.18 - 0.18 * _out_back(p, 0.6))
    return Image.blend(out, inn, min(1.0, max(0.0, (p - 0.2) / 0.55)))


_IRIS_RIM = (246, 236, 214)


def iris(a: Image.Image, b: Image.Image, p: float, centre=(.5, .48)) -> Image.Image:
    """A storybook iris: a circle of the next page opens from the middle, rimmed in cream card."""
    k = _ease_io(p)
    r_max = math.hypot(W, H) * 0.6
    r = r_max * k
    if r < 2:
        return a
    cx, cy = W * centre[0], H * centre[1]
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
    out = a.copy()
    if r > 12:
        rim = Image.new('L', (W, H), 0)
        rr = r + 14
        ImageDraw.Draw(rim).ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=255)
        sh = rim.filter(ImageFilter.GaussianBlur(14)).point(lambda v: v * 0.45)
        out.paste((20, 12, 6), (0, 0), sh)
        out.paste(_IRIS_RIM, (0, 0), rim)
    out.paste(_scaled(b, 1.08 - 0.08 * k), (0, 0), m.filter(ImageFilter.GaussianBlur(1.2)))
    return out


def slide(a: Image.Image, b: Image.Image, p: float) -> Image.Image:
    """VOX: the next picture arrives as a paper card sliding onto the table, lands with a little overshoot, and the
    camera pushes into it until the card's edge leaves the frame."""
    land = 0.58
    base = Image.blend(a, Image.new('RGB', (W, H), (24, 16, 10)), 0.25 * min(1.0, p / land))
    if p < land:
        q = _out_back(p / land, 0.9)
        s, rot = 0.8, 4.5 * (1 - q)
        x = W * 0.5 + (1 - q) * W * 1.05
    else:
        q = _ease_io((p - land) / (1 - land))
        s, rot, x = 0.8 + 0.2 * q, 0.0, W * 0.5
    bw = 22
    cw, ch = int(W * s), int(H * s)
    card = Image.new('RGBA', (cw + 2 * bw, ch + 2 * bw), _IRIS_RIM + (255,))
    card.paste(b.resize((cw, ch), Image.BICUBIC), (bw, bw))
    if rot:
        card = card.rotate(rot, resample=Image.BICUBIC, expand=True)
    px, py = int(x - card.width / 2), int(H * .5 - card.height / 2)
    sh = card.split()[3].filter(ImageFilter.GaussianBlur(18)).point(lambda v: v * 0.55)
    base.paste((18, 10, 4), (px + 14, py + 20), sh)
    base.paste(card, (px, py), card)
    return base


def _rag(n: int, seed: int, depth: float) -> np.ndarray:
    rng = np.random.default_rng(seed)
    x = np.cumsum(rng.normal(0, 1, n)).astype(np.float32)
    x = np.convolve(x, np.ones(9) / 9, 'same')
    x = (x - x.min()) / max(1e-3, x.max() - x.min())
    return x * depth + rng.random(n) * 4


_TEAR = _rag(H // 4 + 2, 17, 46)


def torn(a: Image.Image, b: Image.Image, p: float) -> Image.Image:
    """VOX's torn sheet: the old page is torn away to the left along a ragged line with a white paper edge."""
    k = _ease_io(p)
    edge = W * 1.08 - k * W * 1.2
    ys = np.arange(0, H + 4, 4)
    xs = edge + _TEAR[:len(ys)] + 40 * (ys / H - .5) * (1 - k)
    poly_keep = [(0, 0)] + [(float(x), float(y)) for x, y in zip(xs, ys)] + [(0, H)]
    keep = Image.new('L', (W, H), 0)
    ImageDraw.Draw(keep).polygon(poly_keep, fill=255)
    rim_poly = [(0, 0)] + [(float(x) + 20 + 7 * math.sin(y / 23), float(y)) for x, y in zip(xs, ys)] + [(0, H)]
    rim = Image.new('L', (W, H), 0)
    ImageDraw.Draw(rim).polygon(rim_poly, fill=255)
    out = b.copy()
    sh = rim.filter(ImageFilter.GaussianBlur(16)).point(lambda v: v * 0.5)
    out.paste((18, 10, 4), (10, 6), sh)
    out.paste((250, 244, 230), (0, 0), rim)
    out.paste(a, (0, 0), keep)
    return out


CUTS = {'page': page, 'slide': slide, 'iris': iris, 'zoom': zoom, 'torn': torn, 'dissolve': dissolve, 'fade': fade}
