"""Football Fairy Tales — the Paper Theatre compositor (universal kit v1, 11.11.2026).

Every episode is a handmade mechanical pop-up book photographed on a desk. The pictures come from Flow (Nano Banana),
the motion is made here so that one kit serves every club:

* stop-motion   — key poses of one photograph (Flow edits of the same frame) held on threes, a slow camera push and the
                  small frame-to-frame 'boil' of a real stop-motion set;
* page turn     — the next plate is revealed under a turning page (the only transition the series uses);
* medallion     — the club crest printed onto the blank card disc of a plate, which flips like a coin to its truth;
* confetti      — cut paper in the club's two colours, animated on twos;
* wordmark      — FOOTBALL FAIRY TALES, cut from card letter by letter, with a brass split pin for the dot.

Everything is a function of time, so a film is a list of shots; nothing here knows a club except through its pack.
"""
from __future__ import annotations

import math
import random
import subprocess
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS = 1920, 1080, 24
KRAFT, CREAM, INK, BRASS = (200, 167, 116), (241, 230, 207), (42, 30, 20), (196, 158, 74)


def fit(img: Image.Image, w: int = W, h: int = H) -> Image.Image:
    """Cover-fit to w×h (crop the overflow, never letterbox)."""
    s = max(w / img.width, h / img.height)
    im = img.resize((math.ceil(img.width * s), math.ceil(img.height * s)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


def camera(img: Image.Image, zoom: float, cx: float = .5, cy: float = .5, dx: float = 0, dy: float = 0) -> Image.Image:
    """A push-in on (cx, cy) of a W×H plate: zoom ≥ 1, dx/dy in output pixels."""
    cw, ch = W / zoom, H / zoom
    x0 = min(max(cx * W - cw / 2 + dx / zoom, 0), W - cw)
    y0 = min(max(cy * H - ch / 2 + dy / zoom, 0), H - ch)
    return img.transform((W, H), Image.EXTENT, (x0, y0, x0 + cw, y0 + ch), Image.BICUBIC)


def ease(p: float) -> float:
    p = min(max(p, 0.0), 1.0)
    return p * p * (3 - 2 * p)


def stepped(t: float, fps: int = 12) -> float:
    """Time quantised to a stop-motion rate (on twos at 24 fps)."""
    return math.floor(t * fps) / fps


@dataclass
class StopMotion:
    poses: list[Image.Image]          # W×H plates, the same photograph in different poses
    order: list[int]                  # the cycle, e.g. [0, 1, 2, 1]
    hold: int = 3                     # frames per pose (on threes)
    zoom: tuple[float, float] = (1.0, 1.1)
    centre: tuple[float, float] = (.6, .45)
    seed: int = 7

    def frame(self, i: int, n: int) -> Image.Image:
        k = (i // self.hold)
        pose = self.poses[self.order[k % len(self.order)]]
        rng = random.Random(self.seed * 1000 + k)
        boil = (rng.uniform(-1.2, 1.2), rng.uniform(-1.0, 1.0))  # a stop-motion set never sits perfectly still
        p = i / max(n - 1, 1)
        z = self.zoom[0] + (self.zoom[1] - self.zoom[0]) * ease(p)
        return camera(pose, z, *self.centre, dx=boil[0] + 6 * math.sin(i / 19), dy=boil[1])


def page_turn(a: Image.Image, b: Image.Image, p: float) -> Image.Image:
    """The page lifts from the right edge and sweeps left, revealing `b` beneath it."""
    p = ease(p)
    edge = int(W * (1 - p))
    out = b.copy()
    if edge <= 0:
        return out
    # the part of the old page not yet turned stays flat
    out.paste(a.crop((0, 0, edge, H)), (0, 0))
    # the turning leaf: the page's reverse (plain cream paper), curled — a cylinder lit from the window
    leaf_w = int(90 + 300 * math.sin(math.pi * p))
    leaf_w = max(0, min(leaf_w, W - edge))
    if leaf_w > 4:
        u = np.linspace(0, 1, leaf_w)
        shade = (0.62 + 0.42 * np.sin(np.pi * (0.15 + 0.8 * u)))[None, :, None]
        fibre = np.random.default_rng(5).normal(0, 3.5, (H, leaf_w, 1))
        paper = (np.array(CREAM, dtype=np.float32)[None, None, :] * shade + fibre).clip(0, 255).astype(np.uint8)
        out.paste(Image.fromarray(paper), (edge, 0))
        crease = Image.fromarray(np.tile(np.linspace(150, 0, 24).astype(np.uint8)[::-1], (H, 1)))
        out.paste((30, 20, 12), (max(edge - 24, 0), 0), crease)            # the fold where the page bends
        cast = Image.fromarray(np.tile(np.linspace(120, 0, 90).astype(np.uint8), (H, 1)))
        x = min(edge + leaf_w, W - 90)
        out.paste((20, 12, 6), (x, 0), cast)                               # the leaf's shadow on the page beneath
    return out


def printed(card: Image.Image, art: Image.Image, box: tuple[int, int, int, int], scale_x: float = 1.0) -> Image.Image:
    """Print `art` (RGBA) onto the paper of `card` inside box: multiplied, so the paper fibres show through the ink."""
    x0, y0, x1, y1 = box
    bw, bh = x1 - x0, y1 - y0
    s = min(bw / art.width, bh / art.height)
    aw, ah = max(2, int(art.width * s * max(scale_x, 0.02))), int(art.height * s)
    a = art.resize((aw, ah), Image.LANCZOS)
    px, py = x0 + (bw - aw) // 2, y0 + (bh - ah) // 2
    base = np.asarray(card, dtype=np.float32) / 255
    layer = np.ones_like(base)
    rgba = np.asarray(a, dtype=np.float32) / 255
    alpha = rgba[..., 3:4] * 0.94
    region = layer[py:py + ah, px:px + aw]
    region[:] = region * (1 - alpha) + rgba[..., :3] * alpha
    paper = base.mean(axis=2, keepdims=True)
    lift = np.clip(paper / max(float(paper[py:py + ah, px:px + aw].mean()), 1e-3), 0.85, 1.12)
    out = base * layer
    out[py:py + ah, px:px + aw] *= lift[py:py + ah, px:px + aw] ** 0.6
    return Image.fromarray((out.clip(0, 1) * 255).astype(np.uint8))


def brass_mask(img: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    """The brass parts (a magnifying glass, a pin) inside box, so a print can go *under* them."""
    hsv = np.asarray(img.convert('HSV'), dtype=np.float32)
    h, s, v = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255, hsv[..., 2] / 255
    m = ((h > 28) & (h < 62) & (s > 0.38) & (v > 0.32)).astype(np.uint8) * 255
    out = np.zeros_like(m)
    x0, y0, x1, y1 = box
    out[y0:y1, x0:x1] = m[y0:y1, x0:x1]
    return Image.fromarray(out).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.2))


class Confetti:
    """Cut paper bits thrown from a point; positions advance on twos so they move like a stop-motion set."""

    def __init__(self, origin: tuple[float, float], colours, n: int = 90, seed: int = 3):
        rng = random.Random(seed)
        self.bits = [dict(x=origin[0], y=origin[1], vx=rng.uniform(-620, 620), vy=rng.uniform(-980, -320),
                          w=rng.uniform(10, 26), h=rng.uniform(6, 14), rot=rng.uniform(0, 360), vr=rng.uniform(-540, 540),
                          spin=rng.uniform(4, 9), c=rng.choice(colours)) for _ in range(n)]

    def draw(self, img: Image.Image, t: float) -> Image.Image:
        if t <= 0:
            return img
        t = stepped(t)
        layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for b in self.bits:
            drag = 1 - math.exp(-1.6 * t)
            x = b['x'] + b['vx'] * drag / 1.6
            y = b['y'] + b['vy'] * drag / 1.6 + 260 * t * t
            flip = abs(math.cos(b['spin'] * t))
            w, h = b['w'], max(1.5, b['h'] * flip)
            a = math.radians(b['rot'] + b['vr'] * t)
            pts = [(x + dx * math.cos(a) - dy * math.sin(a), y + dx * math.sin(a) + dy * math.cos(a))
                   for dx, dy in ((-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2))]
            shade = 0.82 + 0.18 * flip
            d.polygon(pts, fill=tuple(int(c * shade) for c in b['c']) + (255,))
        shadow = layer.split()[3].filter(ImageFilter.GaussianBlur(3)).point(lambda v: v * 0.35)
        out = img.copy()
        out.paste((20, 12, 6), (4, 6), shadow)
        out.paste(layer, (0, 0), layer)
        return out


def wordmark(img: Image.Image, t: float, font_big: Path, font_small: Path, tag: str = '', accent=(176, 45, 16)) -> Image.Image:
    """FOOTBALL / Fairy Tales — card letters dropped in one by one on twos, a kraft ribbon behind, a brass pin."""
    if t <= 0:
        return img
    t = stepped(t)
    out = img.convert('RGBA')
    ribbon_p = ease(t / 0.25)
    # torn kraft ribbon
    rb = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(rb)
    rw = int(1180 * ribbon_p)
    if rw > 10:
        cx, cy = W // 2, 905
        rng = random.Random(11)
        top = [(cx - rw // 2 + i, cy - 118 + rng.randint(-5, 5)) for i in range(0, rw, 18)]
        bot = [(cx - rw // 2 + i, cy + 112 + rng.randint(-5, 5)) for i in range(rw, -1, -18)]
        d.polygon(top + bot, fill=KRAFT + (255,))
        sh = rb.split()[3].filter(ImageFilter.GaussianBlur(10)).point(lambda v: v * 0.5)
        out.paste((25, 15, 8, 255), (6, 10), sh)
        out = Image.alpha_composite(out, rb)
    big = ImageFont.truetype(str(font_big), 150)
    small = ImageFont.truetype(str(font_small), 46)
    d = ImageDraw.Draw(out)
    # FOOTBALL, tracked, ink on kraft
    if t > 0.18:
        word = 'F O O T B A L L'
        bw = d.textlength(word, font=small)
        d.text(((W - bw) / 2, 812), word, font=small, fill=INK + (255,))
    # Fairy Tales — each letter a separate card, dropped in on twos
    text = 'Fairy Tales'
    widths = [d.textlength(ch, font=big) for ch in text]
    total = sum(widths)
    x = (W - total) / 2
    for k, ch in enumerate(text):
        start = 0.22 + 0.045 * k
        lp = (t - start) / 0.16
        if lp <= 0 or ch == ' ':
            x += widths[k]
            continue
        lp = min(lp, 1.0)
        drop = (1 - ease(lp)) * -90
        rot = (random.Random(k).uniform(-6, 6)) * (1 - 0.6 * ease(lp))
        card = Image.new('RGBA', (int(widths[k]) + 40, 210), (0, 0, 0, 0))
        cd = ImageDraw.Draw(card)
        cd.text((20, 10), ch, font=big, fill=CREAM + (255,), stroke_width=7, stroke_fill=INK + (255,))
        card = card.rotate(rot, resample=Image.BICUBIC, expand=False)
        shadow = card.split()[3].filter(ImageFilter.GaussianBlur(5)).point(lambda v: v * 0.55)
        px, py = int(x - 20), int(842 + drop)
        out.paste((20, 12, 6, 255), (px + 6, py + 9), shadow)
        out.paste(card, (px, py), card)
        x += widths[k]
    # the brass split pin: the series' signature dot, after the last letter
    if t > 0.22 + 0.045 * len(text) + 0.1:
        px, py = int((W + total) / 2 + 22), 1005
        d.ellipse((px - 14, py - 14, px + 14, py + 14), fill=BRASS + (255,), outline=(120, 90, 30, 255), width=3)
        d.line((px - 7, py - 2, px + 7, py - 2), fill=(250, 226, 150, 255), width=3)
    if tag and t > 0.75:
        tw = d.textlength(tag, font=small)
        d.text(((W - tw) / 2, 52), tag, font=small, fill=CREAM + (255,), stroke_width=4, stroke_fill=INK + (255,))
    return out.convert('RGB')


def grain(img: Image.Image, i: int, amount: float = 5.0) -> Image.Image:
    rng = np.random.default_rng(i)
    a = np.asarray(img, dtype=np.int16)
    n = rng.normal(0, amount, a.shape[:2])[..., None]
    return Image.fromarray(np.clip(a + n, 0, 255).astype(np.uint8))


def encode(frames, out: Path, audio: Path | None = None) -> None:
    cmd = ['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-']
    if audio:
        cmd += ['-i', str(audio), '-c:a', 'aac', '-b:a', '192k', '-shortest']
    cmd += ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(out)]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for f in frames:
        p.stdin.write(f.convert('RGB').tobytes())
    p.stdin.close()
    if p.wait():
        raise RuntimeError('ffmpeg failed')
