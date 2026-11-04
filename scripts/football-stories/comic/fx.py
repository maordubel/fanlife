"""Comic life and effects, all drawn in code: line boil, halftone shimmer, paper grain, the tone grade, and the
overlays (smoke, glass shards and glints, droplets, rain, floodlight flares and god rays, embers, speed lines,
impact stars, flash). Nothing here is a real person; nothing here is blood.

Everything is deterministic: a frame depends only on (beat, frame index, seed).
"""
from __future__ import annotations

import math
from functools import lru_cache

import cv2
import numpy as np

from comic.camera import apply

INK = np.array([21, 19, 15], np.float32)
PAPER = np.array([255, 251, 242], np.float32)


# ---------------------------------------------------------------- helpers
def blit(frame: np.ndarray, sprite: np.ndarray, M: np.ndarray, opacity: float = 1.0, mode: str = 'normal') -> None:
    """Composite an RGBA uint8 sprite onto an RGB uint8 frame through a 2x3 affine (sprite→frame), in place,
    touching only the sprite's bounding box."""
    if opacity <= 0.003:
        return
    H, W = frame.shape[:2]
    h, w = sprite.shape[:2]
    corners = np.array([[0, 0, 1], [w, 0, 1], [0, h, 1], [w, h, 1]], np.float32) @ M.T
    x0, y0 = np.floor(corners.min(0)).astype(int) - 2
    x1, y1 = np.ceil(corners.max(0)).astype(int) + 2
    x0, y0, x1, y1 = max(0, x0), max(0, y0), min(W, x1), min(H, y1)
    if x1 <= x0 or y1 <= y0:
        return
    M2 = M.copy()
    M2[0, 2] -= x0
    M2[1, 2] -= y0
    roi = cv2.warpAffine(sprite, M2, (x1 - x0, y1 - y0), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    a = roi[..., 3:4].astype(np.float32) / 255 * opacity
    dst = frame[y0:y1, x0:x1].astype(np.float32)
    src = roi[..., :3].astype(np.float32)
    if mode == 'multiply':
        src = dst * src / 255
    frame[y0:y1, x0:x1] = (dst * (1 - a) + src * a).astype(np.uint8)


def sprite_matrix(sprite_wh, cx, cy, scale=1.0, rot=0.0) -> np.ndarray:
    """Centre a sprite at (cx, cy) with scale and rotation (degrees)."""
    w, h = sprite_wh
    th = math.radians(rot)
    c, s = math.cos(th) * scale, math.sin(th) * scale
    return np.array([[c, -s, cx - c * w / 2 + s * h / 2], [s, c, cy - s * w / 2 - c * h / 2]], np.float32)


def overlay(frame, color, alpha) -> None:
    """frame = frame·(1−α) + colour·α, α an HxW float map, in place."""
    a = alpha[..., None].astype(np.float32)
    frame[:] = (frame.astype(np.float32) * (1 - a) + np.asarray(color, np.float32) * a).astype(np.uint8)


def add_light(frame, light) -> None:
    """Additive light (HxWx3 float, 0..255), screen-blended so it never clips to a flat white."""
    f = frame.astype(np.float32) / 255
    l = np.clip(light / 255, 0, 1)
    frame[:] = ((1 - (1 - f) * (1 - l)) * 255).astype(np.uint8)


@lru_cache(maxsize=16)
def periodic_noise(w: int, h: int, beta: float, seed: int) -> np.ndarray:
    """Tileable 1/f^beta noise in 0..1 (FFT-filtered white noise is periodic by construction)."""
    r = np.random.default_rng(seed)
    wn = r.standard_normal((h, w))
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    f = np.sqrt(fx * fx + fy * fy)
    f[0, 0] = 1
    n = np.real(np.fft.ifft2(np.fft.fft2(wn) / f ** beta))
    n = (n - n.min()) / (n.max() - n.min())
    return n.astype(np.float32)


def _scroll(tex: np.ndarray, dx: float, dy: float, out_wh) -> np.ndarray:
    h, w = tex.shape
    W, H = out_wh
    sx, sy = w / W, h / H
    mx = (np.arange(W, dtype=np.float32) * sx + dx) % w
    my = (np.arange(H, dtype=np.float32) * sy + dy) % h
    mapx = np.broadcast_to(mx[None, :], (H, W)).astype(np.float32)
    mapy = np.broadcast_to(my[:, None], (H, W)).astype(np.float32)
    return cv2.remap(tex, mapx, mapy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)


def anchor(ctx, at) -> tuple[float, float]:
    """A panel-normalised point → output pixels through the current background transform."""
    if at is None:
        return ctx['W'] / 2, ctx['H'] / 2
    if at == 'subject':
        at = ctx.get('subject', (.5, .5))
    Wp, Hp = ctx['panel_wh']
    return apply(ctx['M_bg'], at[0] * Wp, at[1] * Hp)


# ---------------------------------------------------------------- the look (applied to every frame)
def ink_weight(rgb: np.ndarray) -> np.ndarray:
    """Where the ink lines are: dark AND edged, widened a pixel or two and softened. 0..1."""
    g = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255
    e = np.hypot(cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3))
    dark = np.clip((0.55 - g) * 3.0, 0, 1)
    w = np.clip(e * 2.2, 0, 1) * (0.35 + 0.65 * dark)
    w = cv2.dilate(w, np.ones((3, 3), np.uint8))
    return cv2.GaussianBlur(w, (0, 0), 1.2)


def boil_maps(wh, n: int = 3, amp: float = 1.4, seed: int = 0) -> list[tuple[np.ndarray, np.ndarray]]:
    """n low-frequency displacement fields (one per drawing). amp in pixels."""
    W, H = wh
    out = []
    xs, ys = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))
    for i in range(n):
        r = np.random.default_rng(seed * 31 + i)
        gx = cv2.resize(r.standard_normal((max(2, H // 40), max(2, W // 40))).astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC)
        gy = cv2.resize(r.standard_normal((max(2, H // 40), max(2, W // 40))).astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC)
        out.append((xs + gx * amp, ys + gy * amp))
    return out


def boiled(img: np.ndarray, weight: np.ndarray, maps) -> list[np.ndarray]:
    """Variants of img where only the ink lines are displaced (the rest of the picture stays still)."""
    res = []
    w = weight[..., None] if img.ndim == 3 else weight
    for mx, my in maps:
        d = cv2.remap(img, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        res.append((img.astype(np.float32) * (1 - w) + d.astype(np.float32) * w).astype(img.dtype))
    return res


@lru_cache(maxsize=4)
def halftone_screens(W: int, H: int, n: int = 3, cell: float = 7.0) -> tuple:
    """Dot screens at 45° (0..1, 1 = dot centre), each nudged half a pixel: the shimmer of a press."""
    xs, ys = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))
    c, s = math.cos(math.pi / 4), math.sin(math.pi / 4)
    out = []
    for i in range(n):
        ox, oy = .45 * i, .3 * i
        u = ((xs + ox) * c + (ys + oy) * s) * 2 * math.pi / cell
        v = (-(xs + ox) * s + (ys + oy) * c) * 2 * math.pi / cell
        out.append(((np.cos(u) * np.cos(v) + 1) / 2).astype(np.float32))
    return tuple(out)


@lru_cache(maxsize=4)
def grains(W: int, H: int, n: int = 4) -> tuple:
    out = []
    for i in range(n):
        r = np.random.default_rng(100 + i)
        g = r.standard_normal((H, W)).astype(np.float32)
        g = cv2.GaussianBlur(g, (0, 0), .7)
        out.append(g)
    return tuple(out)


@lru_cache(maxsize=4)
def vignette(W: int, H: int, strength: float = .38) -> np.ndarray:
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt(((xs / W - .5) / .62) ** 2 + ((ys / H - .5) / .62) ** 2)
    return np.clip(1 - strength * np.clip(d - .35, 0, 1) ** 1.6, 0, 1).astype(np.float32)


@lru_cache(maxsize=8)
def _tone_luts(tone_rgb: tuple, grade: float, shimmer: float):
    """Per-luma tables: the grade is x·(1−g(l)) + c(l); the shimmer weight is m(l)."""
    l = np.arange(256, dtype=np.float32) / 255
    tone = np.asarray(tone_rgb, np.float32)
    navy = np.array([35, 60, 143], np.float32)
    sh = (1 - l) ** 2 * .10 * grade
    mid = (4 * l * (1 - l)) * .06 * grade
    g = (sh + mid).astype(np.float32)
    c = (sh[:, None] * navy[None] + mid[:, None] * tone[None]).astype(np.float32)
    m = (np.clip((.62 - l) * 1.8, 0, 1) * np.clip(l * 4, 0, 1) * shimmer).astype(np.float32)
    return g, c, m


def look(frame: np.ndarray, f: int, tone_rgb, drawn: bool, grade: float = .5, shimmer: float = .055) -> np.ndarray:
    """Grade + halftone shimmer + grain + vignette. `grade` 0 leaves the art's colour exactly as supplied."""
    H, W = frame.shape[:2]
    g, c, m = _tone_luts(tuple(int(v) for v in tone_rgb), float(grade), float(shimmer if drawn else 0.0))
    lum = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY)
    x = frame.astype(np.float32)
    if grade > 0:
        x *= (1 - g[lum])[..., None]
        x += c[lum]
    k = vignette(W, H).copy()
    if drawn and shimmer > 0:
        k *= 1 - m[lum] * halftone_screens(W, H)[(f // 2) % 3]
    x *= k[..., None]
    x += (grains(W, H)[f % 4] * (5.6 if drawn else 4.1))[..., None]
    np.clip(x, 0, 255, out=x)
    return x.astype(np.uint8)


# ---------------------------------------------------------------- overlays
def smoke(frame, ctx, density=.5, color=(222, 222, 228), shade=(120, 122, 134), glow=None, speed=1.0, **_):
    """Rolling smoke: two banks of large soft billows drifting across and up at different speeds (near bank faster),
    heavier at the bottom of the frame, shaded so it has volume; an optional fire glow from below."""
    W, H, t = ctx['W'], ctx['H'], ctx['t'] * ctx['speed'] * speed
    far = _scroll(periodic_noise(256, 144, 2.0, 1), t * 6, -t * 2.5, (W, H))
    near = _scroll(periodic_noise(192, 108, 2.2, 2), -t * 11, -t * 5, (W, H))
    body = _scroll(periodic_noise(256, 144, 1.4, 3), t * 4, -t * 3, (W, H))
    ys = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    weight = .35 + .65 * ys ** 1.3
    def bank(n, lo, hi):
        k = np.clip((n - lo) / (hi - lo), 0, 1)
        return k * k * (3 - 2 * k)
    a_far = bank(far, .42, .78) * weight * density * .8
    a_near = bank(near, .5, .85) * weight * density
    sh = bank(body, .3, .8)[..., None]
    col = np.asarray(shade, np.float32) * (1 - sh) + np.asarray(color, np.float32) * sh
    for a in (a_far, a_near):
        x = frame.astype(np.float32)
        a3 = a[..., None]
        frame[:] = (x * (1 - a3) + col * a3).astype(np.uint8)
    if glow is not None:
        g = np.asarray(glow, np.float32)
        light = (np.clip(ys - .35, 0, 1) * 1.5 * (a_far + a_near))[..., None] * g[None, None, :]
        add_light(frame, light)


def _rng(ctx, salt):
    return np.random.default_rng(ctx['seed'] * 7919 + salt)


def shards(frame, ctx, at=(.5, .55), t0=0.0, n=70, power=1.0, **_):
    tau = (ctx['t'] - t0) * ctx['speed']
    if tau < 0:
        return
    W, H = ctx['W'], ctx['H']
    cx, cy = anchor(ctx, at)
    r = _rng(ctx, 11)
    s = H / 1080
    ang = r.uniform(-math.pi, 0.15, n) if True else None
    spd = r.uniform(300, 1500, n) * power * s
    size = r.uniform(7, 34, n) * s
    spin = r.uniform(-9, 9, n)
    sides = r.integers(3, 5, n)
    g = 1600 * s
    tmp = frame.copy()
    for i in range(n):
        px = cx + math.cos(ang[i]) * spd[i] * tau
        py = cy + math.sin(ang[i]) * spd[i] * tau + .5 * g * tau * tau
        if not (-60 < px < W + 60 and -60 < py < H + 60):
            continue
        rot = spin[i] * tau + i
        pts = []
        rr = np.random.default_rng(i)
        for k in range(int(sides[i])):
            a = rot + k / sides[i] * 2 * math.pi + rr.uniform(-.4, .4)
            rad = size[i] * rr.uniform(.45, 1.0)
            pts.append((px + math.cos(a) * rad, py + math.sin(a) * rad * .7))
        p = np.array(pts, np.int32)
        cv2.fillPoly(tmp, [p], (205, 238, 248), cv2.LINE_AA)
        cv2.polylines(tmp, [p], True, (21, 19, 15), max(1, int(2 * s)), cv2.LINE_AA)
        if (ctx['f'] + i) % 3 == 0:   # glints catch the light on twos
            cv2.line(tmp, tuple(p[0]), tuple(p[1]), (255, 255, 255), max(1, int(3 * s)), cv2.LINE_AA)
    fade = max(0.0, 1 - tau / 2.2)
    cv2.addWeighted(tmp, .92 * fade, frame, 1 - .92 * fade, 0, frame)


def droplets(frame, ctx, at=(.5, .5), n=26, spread=.28, t0=0.0, **_):
    tau = max(0.0, ctx['t'] - t0) * ctx['speed']
    W, H = ctx['W'], ctx['H']
    cx, cy = anchor(ctx, at)
    r = _rng(ctx, 23)
    s = H / 1080
    tmp = frame.copy()
    for i in range(n):
        ox, oy = r.normal(0, spread * W * .5), r.normal(0, spread * H * .5)
        vx, vy = r.normal(0, 18), r.uniform(20, 70)
        rad = r.uniform(4, 13) * s
        px, py = cx + ox + vx * tau, cy + oy + vy * tau
        el = (int(px), int(py))
        axes = (max(1, int(rad * .78)), max(1, int(rad)))
        cv2.ellipse(tmp, el, axes, 0, 0, 360, (190, 225, 240), -1, cv2.LINE_AA)
        cv2.ellipse(tmp, el, axes, 0, 0, 360, (21, 19, 15), max(1, int(1.6 * s)), cv2.LINE_AA)
        cv2.circle(tmp, (int(px - rad * .3), int(py - rad * .35)), max(1, int(rad * .28)), (255, 255, 255), -1, cv2.LINE_AA)
    cv2.addWeighted(tmp, .85, frame, .15, 0, frame)


def glint(frame, ctx, at=(.5, .5), t0=0.0, size=70, period=1.4, **_):
    tau = ctx['t'] - t0
    if tau < 0:
        return
    k = (tau % period) / period
    amp = math.sin(min(1, k * 2.2) * math.pi) ** 2
    if amp < .02:
        return
    W, H = ctx['W'], ctx['H']
    cx, cy = anchor(ctx, at)
    s = size * H / 1080 * (.6 + .6 * amp)
    R = int(s * 1.6) + 4
    x0, y0 = int(cx) - R, int(cy) - R
    if x0 + 2 * R < 0 or y0 + 2 * R < 0 or x0 >= W or y0 >= H:
        return
    light = np.zeros((2 * R, 2 * R, 3), np.float32)
    lx, ly = cx - x0, cy - y0
    rot = tau * .8
    for j in range(4):
        a = rot + j * math.pi / 2
        for w_, c in ((s * .16, 140), (s * .06, 255)):
            pts = np.array([(lx, ly), (lx + math.cos(a) * s, ly + math.sin(a) * s), (lx + math.cos(a + .08) * w_, ly + math.sin(a + .08) * w_)], np.int32)
            cv2.fillPoly(light, [pts], (c, c, c), cv2.LINE_AA)
    cv2.circle(light, (int(lx), int(ly)), max(1, int(s * .12)), (255, 255, 255), -1, cv2.LINE_AA)
    glow = cv2.GaussianBlur(light, (0, 0), s * .12 + 1)
    xa, ya, xb, yb = max(0, x0), max(0, y0), min(W, x0 + 2 * R), min(H, y0 + 2 * R)
    roi = frame[ya:yb, xa:xb]
    add_light(roi, ((light * .9 + glow * 1.4) * amp)[ya - y0:yb - y0, xa - x0:xb - x0])


def rain(frame, ctx, n=420, angle=12, alpha=.32, **_):
    W, H, t = ctx['W'], ctx['H'], ctx['t'] * ctx['speed']
    r = _rng(ctx, 31)
    tmp = frame.copy()
    a = math.radians(90 + angle)
    for i in range(n):
        x0, y0 = r.uniform(-200, W), r.uniform(0, H)
        L, v = r.uniform(30, 80), r.uniform(1400, 2200)
        y = (y0 + v * t) % (H + 100) - 50
        x = x0 + (y - y0) * math.tan(math.radians(angle))
        cv2.line(tmp, (int(x), int(y)), (int(x + math.cos(a) * -L), int(y - math.sin(a) * L)), (220, 228, 235), 2, cv2.LINE_AA)
    cv2.addWeighted(tmp, alpha, frame, 1 - alpha, 0, frame)


def flare(frame, ctx, at=(.5, .15), n=14, strength=.8, color=(255, 246, 228), **_):
    """A floodlight: soft bloom, god rays turning slowly, an anamorphic streak (drawn at quarter size: it is light)."""
    W, H, t = ctx['W'], ctx['H'], ctx['t'] * ctx['speed']
    q = 4
    w, h = W // q, H // q
    cx, cy = anchor(ctx, at)
    cx, cy = cx / q, cy / q
    light = np.zeros((h, w, 3), np.float32)
    L = max(w, h) * 1.3
    for i in range(n):
        a = i / n * 2 * math.pi + t * .05
        ww = .045 + .02 * math.sin(i * 1.7)
        pts = np.array([(cx, cy), (cx + math.cos(a - ww) * L, cy + math.sin(a - ww) * L), (cx + math.cos(a + ww) * L, cy + math.sin(a + ww) * L)], np.int32)
        cv2.fillPoly(light, [pts], tuple(c * .16 for c in color), cv2.LINE_AA)
    light = cv2.GaussianBlur(light, (0, 0), 6)
    ys, xs = np.ogrid[0:h, 0:w]
    bloom = np.exp(-((xs - cx) ** 2 + (ys - cy) ** 2) / (h * .13) ** 2)[..., None] * np.asarray(color, np.float32)
    streak = np.exp(-((ys - cy) / (h * .006 + .6)) ** 2 - ((xs - cx) / (w * .35)) ** 2)[..., None] * np.asarray(color, np.float32) * .7
    flick = .92 + .08 * math.sin(t * 17)
    big = cv2.resize((light + bloom * .95 + streak) * strength * flick, (W, H), interpolation=cv2.INTER_LINEAR)
    add_light(frame, big)


def embers(frame, ctx, n=90, **_):
    W, H, t = ctx['W'], ctx['H'], ctx['t'] * ctx['speed']
    r = _rng(ctx, 41)
    light = np.zeros((H, W, 3), np.float32)
    for i in range(n):
        x0, y0 = r.uniform(0, W), r.uniform(0, H)
        v, sw, ph = r.uniform(40, 140), r.uniform(10, 40), r.uniform(0, 6.28)
        y = (y0 - v * t) % (H + 40) - 20
        x = x0 + math.sin(t * 1.3 + ph) * sw
        fl = .5 + .5 * math.sin(t * 9 + ph * 3)
        rad = r.uniform(1.5, 3.8) * H / 1080
        c = (255 * fl, 120 * fl, 30 * fl)
        cv2.circle(light, (int(x), int(y)), max(1, int(rad)), c, -1, cv2.LINE_AA)
    glow = cv2.resize(cv2.GaussianBlur(cv2.resize(light, (W // 4, H // 4), interpolation=cv2.INTER_AREA), (0, 0), 1.3), (W, H))
    add_light(frame, light + glow * 2.2)


def speedlines(frame, ctx, at=None, n=64, inner=.34, alpha=.9, **_):
    W, H = ctx['W'], ctx['H']
    cx, cy = anchor(ctx, at) if at else (W / 2, H / 2)
    r = np.random.default_rng(ctx['seed'] * 13 + ctx['f'] // 2)   # redrawn on twos
    tmp = frame.copy()
    R = math.hypot(W, H)
    for i in range(n):
        a = r.uniform(0, 2 * math.pi)
        r0 = H * inner * r.uniform(.85, 1.3)
        w = r.uniform(.004, .012)
        pts = np.array([(cx + math.cos(a) * r0, cy + math.sin(a) * r0),
                        (cx + math.cos(a - w) * R, cy + math.sin(a - w) * R),
                        (cx + math.cos(a + w) * R, cy + math.sin(a + w) * R)], np.int32)
        cv2.fillPoly(tmp, [pts], (21, 19, 15), cv2.LINE_AA)
    cv2.addWeighted(tmp, alpha, frame, 1 - alpha, 0, frame)


def _star(cx, cy, R, rot, k=5):
    pts = []
    for i in range(k * 2):
        a = rot + i / (k * 2) * 2 * math.pi
        rr = R if i % 2 == 0 else R * .45
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    return np.array(pts, np.int32)


def stars(frame, ctx, at=(.5, .4), n=5, t0=0.0, radius=.16, **_):
    tau = ctx['t'] - t0
    if tau < 0:
        return
    W, H = ctx['W'], ctx['H']
    cx, cy = anchor(ctx, at)
    pop = min(1.0, tau / .18)
    for i in range(n):
        a = tau * 2.4 + i / n * 2 * math.pi
        R = H * radius * pop
        px, py = cx + math.cos(a) * R, cy + math.sin(a) * R * .45
        size = H * .028 * (1 + .25 * math.sin(tau * 6 + i))
        p = _star(px, py, size, tau * 4 + i)
        cv2.fillPoly(frame, [p + int(H * .006)], (21, 19, 15), cv2.LINE_AA)
        cv2.fillPoly(frame, [p], (255, 251, 242), cv2.LINE_AA)
        cv2.polylines(frame, [p], True, (21, 19, 15), max(2, int(H * .004)), cv2.LINE_AA)


def flash(frame, ctx, t0=0.0, dur=.16, color=(255, 251, 242), **_):
    tau = ctx['t'] - t0
    if tau < 0 or tau > dur:
        return
    a = 1 - tau / dur
    overlay(frame, color, np.full(frame.shape[:2], a ** 1.5, np.float32))


# ---------------------------------------------------------------- draft-2 camera life (owner, 4.11.2026)
def flicker(frame, ctx, t0=0.0, dur=1.1, **_):
    """A desk lamp flickering on: dark, two or three stutters of light, then steady."""
    tau = ctx['t'] - t0
    if tau >= dur:
        return
    r = _rng(ctx, 31)
    beats = sorted(r.uniform(0, dur * .8, 4))
    on = tau > beats[-1] or any(b <= tau < b + .06 for b in beats[:3])
    dark = .15 if on else .72 * (1 - max(0.0, tau / dur) ** 3)
    overlay(frame, (21, 19, 15), np.full(frame.shape[:2], dark, np.float32))


def dof(frame, ctx, t0=0.0, rise=1.6, strength=1.0, at='subject', **_):
    """Depth blur rising: everything away from the subject softens over `rise` seconds (a macro lens racking in)."""
    k = min(1.0, max(0.0, (ctx['t'] - t0) / rise)) * strength
    if k <= .02:
        return
    H, W = frame.shape[:2]
    cx, cy = anchor(ctx, at)
    yy, xx = np.ogrid[:H, :W]
    d = np.sqrt(((xx - cx) / W) ** 2 + ((yy - cy) / H) ** 2).astype(np.float32)
    m = np.clip((d - .12) / .3, 0, 1) * k
    sig = max(1.0, 9 * k * H / 1080)
    blur = cv2.GaussianBlur(frame, (0, 0), sig)
    frame[:] = (frame * (1 - m[..., None]) + blur * m[..., None]).astype(np.uint8)


def flashbulbs(frame, ctx, n=7, alpha=.55, **_):
    """Press cameras going off: short white bursts at seeded moments, each a bright star at the lens."""
    r = _rng(ctx, 47)
    H, W = frame.shape[:2]
    for i in range(n):
        at = r.uniform(.2, 6.0)
        x, y = r.uniform(.05, .95) * W, r.uniform(.1, .7) * H
        tau = ctx['t'] - at
        if 0 <= tau < .12:
            a = (1 - tau / .12) ** 1.5
            overlay(frame, (255, 251, 242), np.full(frame.shape[:2], alpha * .45 * a, np.float32))
            R = int(H * .05)
            cv2.circle(frame, (int(x), int(y)), R, (255, 251, 242), -1, cv2.LINE_AA)
            cv2.line(frame, (int(x - R * 2.4), int(y)), (int(x + R * 2.4), int(y)), (255, 251, 242), max(2, R // 6), cv2.LINE_AA)


def glow(frame, ctx, at=(.5, .45), color=(150, 190, 230), radius=.45, period=1.9, strength=.5, **_):
    """A screen's light pulsing on the room (an empty armchair before a TV)."""
    H, W = frame.shape[:2]
    cx, cy = anchor(ctx, at)
    yy, xx = np.ogrid[:H, :W]
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / (radius * W)
    pulse = .6 + .4 * math.sin(ctx['t'] * 2 * math.pi / period) + .08 * math.sin(ctx['t'] * 17)
    light = (np.clip(1 - d, 0, 1) ** 2 * strength * pulse).astype(np.float32)[..., None] * np.asarray(color, np.float32)[None, None, :]
    add_light(frame, light * .6)


def confetti(frame, ctx, n=160, t0=0.0, **_):
    """Paper confetti falling and fluttering: ink, vermilion, cyan and cream bits, never a person."""
    tau = ctx['t'] - t0
    if tau < 0:
        return
    r = _rng(ctx, 59)
    H, W = frame.shape[:2]
    cols = [(215, 25, 32), (27, 154, 214), (255, 251, 242), (21, 19, 15), (35, 60, 143)]
    for i in range(n):
        x0, y0 = r.uniform(-.05, 1.05) * W, r.uniform(-1.2, 0) * H
        vy, sway, ph = r.uniform(.12, .3) * H, r.uniform(.01, .04) * W, r.uniform(0, 6.28)
        y = y0 + vy * tau
        if not (0 <= y <= H):
            continue
        x = x0 + sway * math.sin(tau * r.uniform(2, 4) + ph)
        s = r.uniform(.006, .012) * H
        ang = tau * r.uniform(3, 8) + ph
        w = abs(math.cos(ang)) * s + 1
        box = cv2.boxPoints(((x, y), (w * 2, s), math.degrees(ang) * .3)).astype(np.int32)
        cv2.fillConvexPoly(frame, box, cols[i % len(cols)], cv2.LINE_AA)


def fade_black(frame, ctx, t0=0.0, dur=1.4, to=1.0, **_):
    """A fade to black (to=1) or a dimming of the light (to<1), from t0 over dur seconds."""
    k = min(1.0, max(0.0, (ctx['t'] - t0) / dur))
    if k > 0:
        overlay(frame, (21, 19, 15), np.full(frame.shape[:2], to * k * k * (3 - 2 * k), np.float32))


def string(frame, ctx, start=(.0, .1), at='subject', t0=0.0, dur=.9, **_):
    """The case board's red string sliding across to the thing that matters, pinned with a drawing pin."""
    tau = ctx['t'] - t0
    if tau < 0:
        return
    H, W = frame.shape[:2]
    k = min(1.0, tau / dur)
    k = 1 - (1 - k) ** 3
    x0, y0 = start[0] * W, start[1] * H
    x1, y1 = anchor(ctx, at)
    x, y = x0 + (x1 - x0) * k, y0 + (y1 - y0) * k
    sag = H * .04 * math.sin(math.pi * k)
    pts = np.array([(x0 + (x - x0) * u, y0 + (y - y0) * u + sag * math.sin(math.pi * u)) for u in np.linspace(0, 1, 24)], np.int32)
    th = max(3, H // 220)
    cv2.polylines(frame, [pts + th // 2], False, (21, 19, 15), th, cv2.LINE_AA)
    cv2.polylines(frame, [pts], False, (215, 25, 32), th, cv2.LINE_AA)
    if k >= 1:
        cv2.circle(frame, (int(x1), int(y1)), th * 3, (21, 19, 15), -1, cv2.LINE_AA)
        cv2.circle(frame, (int(x1) - 1, int(y1) - 1), th * 2, (215, 25, 32), -1, cv2.LINE_AA)


OVERLAYS = {'smoke': smoke, 'shards': shards, 'droplets': droplets, 'glint': glint, 'rain': rain, 'flare': flare,
            'godrays': flare, 'embers': embers, 'speedlines': speedlines, 'stars': stars, 'flash': flash,
            'flicker': flicker, 'dof': dof, 'flashbulbs': flashbulbs, 'glow': glow, 'confetti': confetti,
            'fade_black': fade_black, 'string': string}
